/// VideoNFT — Loop Platform on-chain video token module.
///
/// Uses the Aptos Digital Asset (Token Objects) standard.
/// Each video is minted as a unique NFT under a shared Loop platform collection.
///
/// Workflow:
///   1. Platform deployer calls `initialize` once to create the collection.
///   2. Per-video: platform service account calls `mint_video_nft` with video metadata.
///   3. The minted token object address is stored off-chain (Video.nftTokenAddress).
///
/// Security notes:
///   - Only the collection owner (platform service account) can mint.
///   - Duplicate minting is prevented: each video_id maps to exactly one token.
///   - All string inputs are validated for length to prevent resource exhaustion.
module video_nft::video_nft {
    use std::error;
    use std::signer;
    use std::string::{Self, String};
    use std::option;
    use aptos_framework::object::{Self, Object, ConstructorRef};
    use aptos_token_objects::collection;
    use aptos_token_objects::token;

    // -----------------------------------------------------------------------
    // Error codes
    // -----------------------------------------------------------------------
    /// Caller is not the platform admin.
    const E_NOT_ADMIN: u64 = 1;
    /// Collection already initialized.
    const E_ALREADY_INITIALIZED: u64 = 2;
    /// Collection not yet initialized.
    const E_NOT_INITIALIZED: u64 = 3;
    /// A token for this video_id has already been minted.
    const E_ALREADY_MINTED: u64 = 4;
    /// String argument exceeds maximum allowed length.
    const E_STRING_TOO_LONG: u64 = 5;

    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------
    const COLLECTION_NAME: vector<u8> = b"Loop Video NFTs";
    const COLLECTION_DESCRIPTION: vector<u8> = b"On-chain video NFTs minted by the Loop platform via Shelby Protocol";
    const COLLECTION_URI: vector<u8> = b"https://loop.app";

    /// Max length for user-supplied strings (title, description, URIs).
    const MAX_STRING_LEN: u64 = 1024;

    // -----------------------------------------------------------------------
    // Resources
    // -----------------------------------------------------------------------

    /// Stored under the platform admin's account after `initialize`.
    struct CollectionConfig has key {
        /// Object address of the aptos_token_objects collection.
        collection_address: address,
    }

    /// Stored inside each minted token object.
    struct VideoNFTMetadata has key {
        /// Off-chain video ID (UUID).
        video_id: String,
        /// Shelby blob reference (account/blobName).
        shelby_blob_ref: String,
        /// HLS manifest URI stored on Shelby.
        hls_manifest_uri: String,
        /// Thumbnail URI.
        thumbnail_uri: String,
        /// Original creator wallet address.
        creator_address: address,
    }

    // -----------------------------------------------------------------------
    // Public entry functions
    // -----------------------------------------------------------------------

    /// Initialize the Loop Video NFT collection.
    /// Must be called once by the platform deployer before any minting.
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<CollectionConfig>(admin_addr), error::already_exists(E_ALREADY_INITIALIZED));

        let collection_cref = collection::create_unlimited_collection(
            admin,
            string::utf8(COLLECTION_DESCRIPTION),
            string::utf8(COLLECTION_NAME),
            option::none(),
            string::utf8(COLLECTION_URI),
        );

        let collection_addr = object::address_from_constructor_ref(&collection_cref);

        move_to(admin, CollectionConfig { collection_address: collection_addr });
    }

    /// Mint a video NFT for the given video.
    ///
    /// @param admin          Platform service account signer (must own CollectionConfig).
    /// @param video_id       Off-chain UUID of the video (used as unique token name).
    /// @param title          Video title (max 1024 chars).
    /// @param description    Video description (max 1024 chars).
    /// @param shelby_blob_ref Shelby storage reference, format "account/blobName".
    /// @param hls_manifest_uri Full URI to the HLS manifest on Shelby.
    /// @param thumbnail_uri  URI to the thumbnail image.
    /// @param creator_address Wallet address of the video uploader.
    ///
    /// Emits a token creation event; the minted token object address can be read
    /// from the transaction's `ObjectCore::CreateEvent` or queried via the SDK.
    public entry fun mint_video_nft(
        admin: &signer,
        video_id: String,
        title: String,
        description: String,
        shelby_blob_ref: String,
        hls_manifest_uri: String,
        thumbnail_uri: String,
        creator_address: address,
    ) acquires CollectionConfig {
        let admin_addr = signer::address_of(admin);

        // Permission check: only the collection owner can mint.
        assert!(exists<CollectionConfig>(admin_addr), error::permission_denied(E_NOT_INITIALIZED));

        // Validate input lengths to prevent resource exhaustion.
        assert!(string::length(&video_id)        <= MAX_STRING_LEN, error::invalid_argument(E_STRING_TOO_LONG));
        assert!(string::length(&title)           <= MAX_STRING_LEN, error::invalid_argument(E_STRING_TOO_LONG));
        assert!(string::length(&description)     <= MAX_STRING_LEN, error::invalid_argument(E_STRING_TOO_LONG));
        assert!(string::length(&shelby_blob_ref) <= MAX_STRING_LEN, error::invalid_argument(E_STRING_TOO_LONG));
        assert!(string::length(&hls_manifest_uri)<= MAX_STRING_LEN, error::invalid_argument(E_STRING_TOO_LONG));
        assert!(string::length(&thumbnail_uri)   <= MAX_STRING_LEN, error::invalid_argument(E_STRING_TOO_LONG));

        // Mint the token. The video_id serves as the unique token name within the collection.
        // aptos_token_objects enforces (collection, token_name) uniqueness — duplicate mint
        // for the same video_id will abort with EALREADY_EXISTS at the framework level.
        let token_cref: ConstructorRef = token::create_named_token(
            admin,
            string::utf8(COLLECTION_NAME),
            description,
            video_id,       // token name = video_id (globally unique within collection)
            option::none(),
            thumbnail_uri,  // token URI
        );

        // Attach custom metadata to the token object.
        let token_signer = object::generate_signer(&token_cref);
        move_to(&token_signer, VideoNFTMetadata {
            video_id,
            shelby_blob_ref,
            hls_manifest_uri,
            thumbnail_uri,
            creator_address,
        });

        // Transfer token to the creator (they become the owner).
        let token_obj = object::object_from_constructor_ref<token::Token>(&token_cref);
        object::transfer(admin, token_obj, creator_address);
    }

    // -----------------------------------------------------------------------
    // View functions
    // -----------------------------------------------------------------------

    #[view]
    /// Returns the collection object address under the given admin.
    public fun collection_address(admin: address): address acquires CollectionConfig {
        assert!(exists<CollectionConfig>(admin), error::not_found(E_NOT_INITIALIZED));
        borrow_global<CollectionConfig>(admin).collection_address
    }

    #[view]
    /// Returns the token object address for a given (admin, video_id) pair.
    public fun token_address(admin: address, video_id: String): address {
        token::create_token_address(
            &admin,
            &string::utf8(COLLECTION_NAME),
            &video_id,
        )
    }

    // -----------------------------------------------------------------------
    // Unit tests
    // -----------------------------------------------------------------------

    #[test_only]
    use aptos_framework::account;

    #[test(admin = @video_nft, creator = @0xCAFE)]
    /// Happy-path test: initialize collection then mint a video NFT.
    public entry fun test_mint_video_nft(admin: signer, creator: signer) acquires CollectionConfig {
        // Set up test accounts.
        account::create_account_for_test(signer::address_of(&admin));
        account::create_account_for_test(signer::address_of(&creator));

        // Initialize collection.
        initialize(&admin);

        let video_id       = string::utf8(b"550e8400-e29b-41d4-a716-446655440000");
        let title          = string::utf8(b"My First Video");
        let description    = string::utf8(b"A test video NFT");
        let shelby_blob    = string::utf8(b"account123/blob456");
        let hls_uri        = string::utf8(b"https://shelby.xyz/hls/manifest.m3u8");
        let thumbnail_uri  = string::utf8(b"https://shelby.xyz/thumbnails/thumb.jpg");
        let creator_addr   = signer::address_of(&creator);

        // Mint.
        mint_video_nft(
            &admin,
            video_id,
            title,
            description,
            shelby_blob,
            hls_uri,
            thumbnail_uri,
            creator_addr,
        );

        // Verify the token object exists at the expected address.
        let token_addr = token_address(
            signer::address_of(&admin),
            string::utf8(b"550e8400-e29b-41d4-a716-446655440000"),
        );
        assert!(object::is_object(token_addr), 0);
    }

    #[test(admin = @video_nft, creator = @0xCAFE)]
    #[expected_failure(abort_code = 0x80002, location = aptos_token_objects::collection)]
    /// Duplicate mint for the same video_id must abort.
    public entry fun test_duplicate_mint_rejected(admin: signer, creator: signer) acquires CollectionConfig {
        account::create_account_for_test(signer::address_of(&admin));
        account::create_account_for_test(signer::address_of(&creator));

        initialize(&admin);

        let video_id      = string::utf8(b"dup-video-id");
        let creator_addr  = signer::address_of(&creator);

        // First mint — should succeed.
        mint_video_nft(
            &admin, video_id, string::utf8(b"Title"), string::utf8(b"Desc"),
            string::utf8(b"acc/blob"), string::utf8(b"hls://uri"),
            string::utf8(b"thumb://uri"), creator_addr,
        );

        // Second mint with same video_id — must abort.
        mint_video_nft(
            &admin, video_id, string::utf8(b"Title"), string::utf8(b"Desc"),
            string::utf8(b"acc/blob"), string::utf8(b"hls://uri"),
            string::utf8(b"thumb://uri"), creator_addr,
        );
    }

    #[test(non_admin = @0xBEEF)]
    #[expected_failure(abort_code = 327683, location = Self)]
    /// Non-admin cannot mint (CollectionConfig not present).
    public entry fun test_non_admin_cannot_mint(non_admin: signer) acquires CollectionConfig {
        account::create_account_for_test(signer::address_of(&non_admin));

        mint_video_nft(
            &non_admin,
            string::utf8(b"video-id"),
            string::utf8(b"Title"),
            string::utf8(b"Desc"),
            string::utf8(b"acc/blob"),
            string::utf8(b"hls://uri"),
            string::utf8(b"thumb://uri"),
            @0xBEEF,
        );
    }
}
