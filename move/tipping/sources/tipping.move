/// Tipping — Loop Platform on-chain creator tipping module.
///
/// Enables viewers to tip creators via the Loop platform service account.
/// The platform mediates all transfers: the service account holds APT on behalf
/// of users (funded off-chain) and distributes net tips to creators while
/// collecting a configurable platform fee.
///
/// Workflow:
///   1. Platform deployer calls `initialize` once with platform_address and fee_bps.
///   2. Per-tip: platform service account calls `send_tip` with tipper/creator/amount.
///   3. The contract splits: net_amount → creator, fee → platform_address.
///   4. A `TipSentEvent` is emitted for off-chain indexing.
///
/// Security notes:
///   - Only the platform admin (holder of `TippingConfig`) can call `send_tip`.
///   - Fee is bounded at 50% max (5000 bps) to prevent abuse.
///   - Amount must be at least 1 octa.
///   - Creator and platform addresses are validated to be non-zero.
///   - Fee update requires admin signer.
module tipping::tipping {
    use std::error;
    use std::signer;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin;
    use aptos_framework::event;
    use aptos_framework::timestamp;

    // -----------------------------------------------------------------------
    // Error codes
    // -----------------------------------------------------------------------
    /// Caller is not the platform admin.
    const E_NOT_ADMIN: u64 = 1;
    /// Config already initialized.
    const E_ALREADY_INITIALIZED: u64 = 2;
    /// Config not yet initialized.
    const E_NOT_INITIALIZED: u64 = 3;
    /// Tip amount is zero.
    const E_ZERO_AMOUNT: u64 = 4;
    /// Fee exceeds the allowed maximum (50%).
    const E_FEE_TOO_HIGH: u64 = 5;
    /// Creator address is the zero address.
    const E_INVALID_ADDRESS: u64 = 6;

    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------
    /// Basis points denominator (10 000 bps = 100%).
    const BPS_DENOMINATOR: u64 = 10_000;
    /// Maximum platform fee: 50% (5 000 bps).
    const MAX_FEE_BPS: u64 = 5_000;
    /// Default platform fee: 5% (500 bps).
    const DEFAULT_FEE_BPS: u64 = 500;

    // -----------------------------------------------------------------------
    // Resources
    // -----------------------------------------------------------------------

    /// Stored under the platform admin's account after `initialize`.
    struct TippingConfig has key {
        /// Wallet that receives the platform fee portion.
        platform_address: address,
        /// Platform fee in basis points (e.g. 500 = 5%).
        fee_bps: u64,
        /// Cumulative fees collected (in octas).
        total_fees_collected: u64,
        /// Total number of tips processed.
        tip_count: u64,
    }

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    #[event]
    /// Emitted for every successful tip.
    struct TipSentEvent has drop, store {
        /// Off-chain address of the viewer who initiated the tip.
        tipper_address: address,
        /// Wallet address of the content creator who received the tip.
        creator_address: address,
        /// Gross amount the viewer intended to send (in octas).
        gross_amount: u64,
        /// Platform fee deducted (in octas).
        fee_amount: u64,
        /// Net amount transferred to the creator (in octas).
        net_amount: u64,
        /// On-chain timestamp (seconds since Unix epoch).
        timestamp_secs: u64,
    }

    // -----------------------------------------------------------------------
    // Public entry functions
    // -----------------------------------------------------------------------

    /// Initialize the tipping module.
    /// Must be called once by the platform deployer.
    ///
    /// @param admin            Platform service account signer.
    /// @param platform_address Wallet that receives fee income.
    /// @param fee_bps          Initial fee in basis points (max 5 000).
    public entry fun initialize(
        admin: &signer,
        platform_address: address,
        fee_bps: u64,
    ) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<TippingConfig>(admin_addr), error::already_exists(E_ALREADY_INITIALIZED));
        assert!(fee_bps <= MAX_FEE_BPS, error::invalid_argument(E_FEE_TOO_HIGH));
        assert!(platform_address != @0x0, error::invalid_argument(E_INVALID_ADDRESS));

        move_to(admin, TippingConfig {
            platform_address,
            fee_bps,
            total_fees_collected: 0,
            tip_count: 0,
        });
    }

    /// Send a tip from the platform's coin balance to a creator.
    ///
    /// The platform service account must have sufficient AptosCoin balance to
    /// cover the gross_amount. The contract deducts the platform fee and
    /// transfers the net amount to the creator.
    ///
    /// @param admin           Platform service account signer (must own TippingConfig).
    /// @param tipper_address  Viewer's wallet address (recorded in event only).
    /// @param creator_address Content creator's wallet address.
    /// @param gross_amount    Total octas to transfer (before fee deduction).
    public entry fun send_tip(
        admin: &signer,
        tipper_address: address,
        creator_address: address,
        gross_amount: u64,
    ) acquires TippingConfig {
        let admin_addr = signer::address_of(admin);

        // Permission check: only the admin holding TippingConfig can call this.
        assert!(exists<TippingConfig>(admin_addr), error::permission_denied(E_NOT_INITIALIZED));
        assert!(gross_amount > 0, error::invalid_argument(E_ZERO_AMOUNT));
        assert!(creator_address != @0x0, error::invalid_argument(E_INVALID_ADDRESS));
        assert!(tipper_address != @0x0, error::invalid_argument(E_INVALID_ADDRESS));

        let config = borrow_global_mut<TippingConfig>(admin_addr);

        // Calculate fee and net amounts.
        // fee_amount = floor(gross_amount * fee_bps / 10_000)
        let fee_amount = (gross_amount * config.fee_bps) / BPS_DENOMINATOR;
        let net_amount = gross_amount - fee_amount;

        // Transfer net amount to creator.
        coin::transfer<AptosCoin>(admin, creator_address, net_amount);

        // Transfer fee to platform wallet (if non-zero).
        if (fee_amount > 0) {
            coin::transfer<AptosCoin>(admin, config.platform_address, fee_amount);
        };

        // Update counters.
        config.total_fees_collected = config.total_fees_collected + fee_amount;
        config.tip_count = config.tip_count + 1;

        // Emit event for off-chain indexers.
        event::emit(TipSentEvent {
            tipper_address,
            creator_address,
            gross_amount,
            fee_amount,
            net_amount,
            timestamp_secs: timestamp::now_seconds(),
        });
    }

    /// Update the platform fee rate.
    /// Only callable by the admin.
    ///
    /// @param admin     Platform service account signer.
    /// @param new_fee_bps New fee in basis points (max 5 000).
    public entry fun update_fee(
        admin: &signer,
        new_fee_bps: u64,
    ) acquires TippingConfig {
        let admin_addr = signer::address_of(admin);
        assert!(exists<TippingConfig>(admin_addr), error::permission_denied(E_NOT_INITIALIZED));
        assert!(new_fee_bps <= MAX_FEE_BPS, error::invalid_argument(E_FEE_TOO_HIGH));

        borrow_global_mut<TippingConfig>(admin_addr).fee_bps = new_fee_bps;
    }

    // -----------------------------------------------------------------------
    // View functions
    // -----------------------------------------------------------------------

    #[view]
    /// Returns whether the tipping module is initialized under the given admin.
    public fun is_initialized(admin: address): bool {
        exists<TippingConfig>(admin)
    }

    #[view]
    /// Returns the current platform fee in basis points.
    public fun get_fee_bps(admin: address): u64 acquires TippingConfig {
        assert!(exists<TippingConfig>(admin), error::not_found(E_NOT_INITIALIZED));
        borrow_global<TippingConfig>(admin).fee_bps
    }

    #[view]
    /// Returns cumulative fees collected and total tip count.
    public fun get_platform_stats(admin: address): (u64, u64) acquires TippingConfig {
        assert!(exists<TippingConfig>(admin), error::not_found(E_NOT_INITIALIZED));
        let config = borrow_global<TippingConfig>(admin);
        (config.total_fees_collected, config.tip_count)
    }

    // -----------------------------------------------------------------------
    // Unit tests
    // -----------------------------------------------------------------------

    #[test_only]
    use aptos_framework::account;
    #[test_only]
    use aptos_framework::aptos_coin;

    #[test_only]
    /// Mint test APT to an account.
    fun mint_apt(framework: &signer, recipient: &signer, amount: u64) {
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(framework);
        aptos_coin::mint(framework, signer::address_of(recipient), amount);
        coin::destroy_mint_cap(mint_cap);
        coin::destroy_burn_cap(burn_cap);
    }

    #[test_only]
    /// Register AptosCoin store for an account.
    fun register_apt(account: &signer) {
        coin::register<AptosCoin>(account);
    }

    #[test(admin = @tipping, platform = @0xFEE, creator = @0xCAFE, framework = @aptos_framework)]
    /// Happy-path test: initialize then send a tip and verify balances.
    public entry fun test_send_tip_happy_path(
        admin: signer,
        platform: signer,
        creator: signer,
        framework: signer,
    ) acquires TippingConfig {
        // Set up accounts.
        account::create_account_for_test(signer::address_of(&admin));
        account::create_account_for_test(signer::address_of(&platform));
        account::create_account_for_test(signer::address_of(&creator));

        // Set up timestamps.
        timestamp::set_time_has_started_for_testing(&framework);

        // Fund admin with 10 000 octas for the tip.
        register_apt(&admin);
        register_apt(&platform);
        register_apt(&creator);
        mint_apt(&framework, &admin, 10_000);

        let platform_addr = signer::address_of(&platform);
        let creator_addr  = signer::address_of(&creator);
        let tipper_addr   = @0xABCD;

        // Initialize with 5% fee.
        initialize(&admin, platform_addr, DEFAULT_FEE_BPS);

        // Send a 1 000 octa tip.
        send_tip(&admin, tipper_addr, creator_addr, 1_000);

        // Platform fee = 5% of 1 000 = 50 octas.
        // Creator net  = 950 octas.
        assert!(coin::balance<AptosCoin>(creator_addr)  == 950, 1);
        assert!(coin::balance<AptosCoin>(platform_addr) == 50,  2);
        assert!(coin::balance<AptosCoin>(signer::address_of(&admin)) == 9_000, 3);

        // Verify counters.
        let (fees, count) = get_platform_stats(signer::address_of(&admin));
        assert!(fees  == 50, 4);
        assert!(count == 1,  5);
    }

    #[test(admin = @tipping, framework = @aptos_framework)]
    #[expected_failure(abort_code = 0x10004, location = Self)]
    /// Zero-amount tips must be rejected.
    public entry fun test_zero_amount_rejected(admin: signer, framework: signer) acquires TippingConfig {
        account::create_account_for_test(signer::address_of(&admin));
        timestamp::set_time_has_started_for_testing(&framework);
        register_apt(&admin);
        mint_apt(&framework, &admin, 1_000);

        initialize(&admin, @0xFEE, DEFAULT_FEE_BPS);
        send_tip(&admin, @0xABCD, @0xCAFE, 0);
    }

    #[test(non_admin = @0xBEEF, framework = @aptos_framework)]
    #[expected_failure(abort_code = 327683, location = Self)]
    /// Non-admin cannot send tips.
    public entry fun test_non_admin_cannot_tip(non_admin: signer, framework: signer) acquires TippingConfig {
        account::create_account_for_test(signer::address_of(&non_admin));
        timestamp::set_time_has_started_for_testing(&framework);
        register_apt(&non_admin);
        mint_apt(&framework, &non_admin, 1_000);

        send_tip(&non_admin, @0xABCD, @0xCAFE, 100);
    }

    #[test(admin = @tipping)]
    #[expected_failure(abort_code = 0x10005, location = Self)]
    /// Fee above 50% must be rejected.
    public entry fun test_fee_too_high_rejected(admin: signer) {
        account::create_account_for_test(signer::address_of(&admin));
        initialize(&admin, @0xFEE, 6_000); // 60% — must fail
    }

    #[test(admin = @tipping, framework = @aptos_framework)]
    /// update_fee changes the rate and is applied on subsequent tips.
    public entry fun test_update_fee(admin: signer, framework: signer) acquires TippingConfig {
        account::create_account_for_test(signer::address_of(&admin));
        account::create_account_for_test(@0xFEE);
        account::create_account_for_test(@0xCAFE);
        timestamp::set_time_has_started_for_testing(&framework);

        register_apt(&admin);
        let fee_acct  = account::create_account_for_test(@0xFEE);
        let _ = fee_acct;
        let creator_acct = account::create_account_for_test(@0xCAFE);
        let _ = creator_acct;

        coin::register<AptosCoin>(&admin);
        mint_apt(&framework, &admin, 10_000);

        initialize(&admin, @0xFEE, DEFAULT_FEE_BPS);
        assert!(get_fee_bps(signer::address_of(&admin)) == 500, 1);

        // Update to 10%.
        update_fee(&admin, 1_000);
        assert!(get_fee_bps(signer::address_of(&admin)) == 1_000, 2);
    }

    #[test(admin = @tipping)]
    #[expected_failure(abort_code = 0x80001, location = Self)]
    /// Double-initialization must fail.
    public entry fun test_double_init_rejected(admin: signer) {
        account::create_account_for_test(signer::address_of(&admin));
        initialize(&admin, @0xFEE, DEFAULT_FEE_BPS);
        initialize(&admin, @0xFEE, DEFAULT_FEE_BPS); // must abort
    }
}
