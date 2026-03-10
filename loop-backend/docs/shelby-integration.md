# Shelby Storage Integration Guide

## Overview

Loop backend uses **Shelby Network** as decentralized storage for videos, instead of AWS S3. Shelby is a blockchain-based storage network built on Aptos.

---

## Shelby Storage Architecture

### Key Concepts

1. **Blob**: A file stored on the Shelby network
2. **Blob Name**: Unique identifier for a blob within an account
3. **Commitments**: Hash commitments for data verification
4. **Merkle Root**: Root hash of the blob merkle tree
5. **Account-based Storage**: Each account can store multiple blobs
6. **Expiration**: Blobs have an expiration time (microseconds)

### Storage Flow

```
1. Encode File → Generate Commitments → Merkle Root
2. Register on Chain → Submit Transaction
3. Upload to Shelby RPC → Verify with Storage Providers
4. Store in Database → Save blob metadata
```

---

## Video Upload with Shelby

### Step 1: Encode Video File

```typescript
import { generateCommitments, ClayErasureCodingProvider } from "@shelby-protocol/sdk/browser";

export const encodeVideo = async (file: File): Promise<BlobCommitments> => {
  // Convert file to Buffer
  const data = Buffer.from(await file.arrayBuffer());

  // Create provider for erasure coding
  const provider = await ClayErasureCodingProvider.create();

  // Generate commitments (chunks + merkle root)
  const commitments = await generateCommitments(provider, data);

  return commitments;
};
```

**Output:**
```typescript
interface BlobCommitments {
  blob_merkle_root: string;
  raw_data_size: number;
  chunks: Array<{
    commitment: string;
    // ... other chunk data
  }>;
}
```

### Step 2: Register Blob on Chain

```typescript
import { ShelbyBlobClient, expectedTotalChunksets } from "@shelby-protocol/sdk/browser";
import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

// Create transaction payload
const payload = ShelbyBlobClient.createRegisterBlobPayload({
  account: account.address,
  blobName: `video_${videoId}.mp4`,
  blobMerkleRoot: commitments.blob_merkle_root,
  numChunksets: expectedTotalChunksets(commitments.raw_data_size),
  expirationMicros: (Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000, // 30 days
  blobSize: commitments.raw_data_size,
});

// Submit transaction (Aptos native or cross-chain)
if (wallet.isAptosNativeWallet) {
  const transaction = await signAndSubmitTransaction({ data: payload });
  await aptosClient.waitForTransaction({ transactionHash: transaction.hash });
} else {
  // Cross-chain wallet with sponsor
  // ... (see cross-chain-accounts example)
}
```

### Step 3: Upload to Shelby RPC

```typescript
import { ShelbyClient } from "@shelby-protocol/sdk/browser";

const shelbyClient = new ShelbyClient({
  network: Network.SHELBYNET,
  apiKey: process.env.NEXT_PUBLIC_SHELBY_API_KEY,
});

// Upload blob data to Shelby RPC
await shelbyClient.rpc.putBlob({
  account: account.address,
  blobName: `video_${videoId}.mp4`,
  blobData: new Uint8Array(await videoFile.arrayBuffer()),
});
```

### Step 4: Store Metadata in Database

```sql
-- Update videos table
UPDATE videos
SET
  shelby_account = 'account_address',
  shelby_blob_name = 'video_123.mp4',
  shelby_merkle_root = 'merkle_root_hash',
  shelby_expiration = '2024-02-01T00:00:00Z',
  status = 'ready'
WHERE id = 'video_id';
```

---

## Backend Implementation

### Video Upload Endpoint

#### POST /videos/upload
Upload video to Shelby network.

**Request:**
```typescript
// Multipart form data
{
  video: File, // Video file
  thumbnail: File, // Optional thumbnail
  title: string,
  description: string,
  hashtags: string,
  privacy: "public" | "private" | "friends",
  allowComments: boolean,
  allowDuet: boolean,
  allowStitch: boolean
}
```

**Backend Flow:**
```typescript
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";
import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import { generateCommitments, ClayErasureCodingProvider } from "@shelby-protocol/sdk/node";

export async function uploadVideoToShelby(
  videoFile: Buffer,
  videoId: string,
  accountPrivateKey: string
) {
  // 1. Initialize Shelby client
  const client = new ShelbyNodeClient({
    network: Network.SHELBYNET,
    apiKey: process.env.SHELBY_API_KEY,
  });

  // 2. Create signer from private key
  const signer = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(accountPrivateKey),
  });

  // 3. Encode video file
  const provider = await ClayErasureCodingProvider.create();
  const commitments = await generateCommitments(provider, videoFile);

  // 4. Register blob on chain
  const payload = ShelbyBlobClient.createRegisterBlobPayload({
    account: signer.accountAddress.toString(),
    blobName: `video_${videoId}.mp4`,
    blobMerkleRoot: commitments.blob_merkle_root,
    numChunksets: expectedTotalChunksets(commitments.raw_data_size),
    expirationMicros: (Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000, // 30 days
    blobSize: commitments.raw_data_size,
  });

  // Submit transaction
  const transaction = await client.aptos.transaction.build.simple({
    sender: signer.accountAddress,
    data: payload,
  });

  const signedTransaction = await client.aptos.transaction.sign({
    signer,
    transaction,
  });

  const submitted = await client.aptos.transaction.submit.simple({
    transaction: signedTransaction,
  });

  await client.aptos.waitForTransaction({
    transactionHash: submitted.hash,
  });

  // 5. Upload to Shelby RPC
  await client.upload({
    blobData: videoFile,
    signer,
    blobName: `video_${videoId}.mp4`,
    expirationMicros: (Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000,
  });

  return {
    account: signer.accountAddress.toString(),
    blobName: `video_${videoId}.mp4`,
    merkleRoot: commitments.blob_merkle_root,
    expirationMicros: (Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000,
  };
}
```

---

## Video Retrieval

### Download Video from Shelby

```typescript
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";
import { AccountAddress } from "@aptos-labs/ts-sdk";

export async function downloadVideoFromShelby(
  accountAddress: string,
  blobName: string
): Promise<ReadableStream> {
  const client = new ShelbyNodeClient({
    network: Network.SHELBYNET,
    apiKey: process.env.SHELBY_API_KEY,
  });

  const account = AccountAddress.fromString(accountAddress);

  // Get readable stream
  const { readable } = await client.download({
    account,
    blobName,
  });

  return readable;
}
```

### GET /videos/:id/stream
Stream video from Shelby.

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video_id",
    "streamUrl": "https://api.loop.com/v1/videos/video_id/stream",
    "account": "account_address",
    "blobName": "video_123.mp4"
  }
}
```

**Stream Endpoint Implementation:**
```typescript
router.get('/videos/:id/stream', async (req, res) => {
  const { id } = req.params;

  // Get video from database
  const video = await Video.findByPk(id);
  if (!video) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  }

  // Download from Shelby
  const stream = await downloadVideoFromShelby(
    video.shelbyAccount,
    video.shelbyBlobName
  );

  // Set headers
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `inline; filename="${video.title}.mp4"`);

  // Stream video
  const nodeStream = Readable.fromWeb(stream as ReadableStream<Uint8Array>);
  nodeStream.pipe(res);
});
```

---

## Database Schema Updates

### Update videos table

```sql
-- Add Shelby storage columns
ALTER TABLE videos
ADD COLUMN shelby_account VARCHAR(255),
ADD COLUMN shelby_blob_name VARCHAR(255),
ADD COLUMN shelby_merkle_root VARCHAR(255),
ADD COLUMN shelby_expiration BIGINT, -- microseconds timestamp
ADD COLUMN shelby_size BIGINT, -- bytes
ADD COLUMN shelby_chunksets INT;

-- Create indexes
CREATE INDEX idx_shelby_account ON videos(shelby_account);
CREATE INDEX idx_shelby_blob_name ON videos(shelby_blob_name);
```

### Video Storage Model

```typescript
interface VideoStorage {
  id: string;
  shelbyAccount: string; // Account address that owns the blob
  shelbyBlobName: string; // Blob name in Shelby
  shelbyMerkleRoot: string; // Merkle root for verification
  shelbyExpiration: number; // Expiration in microseconds
  shelbySize: number; // File size in bytes
  shelbyChunksets: number; // Number of chunksets
  url?: string; // CDN URL (if using CDN cache)
}
```

---

## Account Management

### Service Account Strategy

There are 2 ways to manage accounts:

#### Option 1: Single Service Account (Recommended for MVP)
- One service account for all videos
- Simple, easy to manage
- All videos belong to the service account

```typescript
// .env
SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY=your_service_account_private_key
SHELBY_SERVICE_ACCOUNT_ADDRESS=service_account_address
```

#### Option 2: Per-User Accounts (Advanced)
- Each user has their own account
- Videos belong to the user account
- More complex but more decentralized

```sql
-- Add to users table
ALTER TABLE users
ADD COLUMN shelby_account_address VARCHAR(255),
ADD COLUMN shelby_account_private_key_encrypted TEXT; -- Encrypted
```

---

## Thumbnail Storage

Thumbnails can also be stored on Shelby:

```typescript
// Upload thumbnail
await client.upload({
  blobData: thumbnailBuffer,
  signer,
  blobName: `thumbnail_${videoId}.jpg`,
  expirationMicros: (Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000,
});
```

Or use traditional storage (S3) for thumbnails since they are smaller.

---

## Sound Storage

Sounds are also stored on Shelby:

```typescript
await client.upload({
  blobData: audioBuffer,
  signer,
  blobName: `sound_${soundId}.mp3`,
  expirationMicros: (Date.now() + 365 * 24 * 60 * 60 * 1000) * 1000, // 1 year
});
```

---

## List User's Videos

### GET /users/:username/videos
List videos from user's Shelby account.

```typescript
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";
import { AccountAddress } from "@aptos-labs/ts-sdk";

export async function listUserVideos(accountAddress: string) {
  const client = new ShelbyNodeClient({
    network: Network.SHELBYNET,
    apiKey: process.env.SHELBY_API_KEY,
  });

  const account = AccountAddress.fromString(accountAddress);

  // Get all blobs from account
  const blobs = await client.coordination.getAccountBlobs({ account });

  // Filter video blobs
  const videoBlobs = blobs.filter(blob =>
    blob.name.startsWith('video_') && blob.name.endsWith('.mp4')
  );

  return videoBlobs;
}
```

---

## Expiration Management

### Auto-Renewal

Videos need to be renewed before they expire:

```typescript
// Cron job to renew expiring videos
export async function renewExpiringVideos() {
  const expiringVideos = await Video.findAll({
    where: {
      shelbyExpiration: {
        [Op.lt]: Date.now() * 1000 + 7 * 24 * 60 * 60 * 1000 * 1000, // 7 days
      },
    },
  });

  for (const video of expiringVideos) {
    // Renew blob
    await renewShelbyBlob(video.shelbyAccount, video.shelbyBlobName, 30 * 24 * 60 * 60 * 1000 * 1000);

    // Update database
    video.shelbyExpiration = Date.now() * 1000 + 30 * 24 * 60 * 60 * 1000 * 1000;
    await video.save();
  }
}
```

---

## Error Handling

### Common Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| `EBLOB_WRITE_CHUNKSET_ALREADY_EXISTS` | Blob already exists | Use unique blob name |
| `INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE` | Not enough APT | Add APT to account |
| `EBLOB_WRITE_INSUFFICIENT_FUNDS` | Not enough Shelby tokens | Add Shelby tokens |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Implement backoff |
| `BLOB_NOT_FOUND` | Blob doesn't exist | Check blob name |

---

## Environment Variables

```env
# Shelby Configuration
SHELBY_API_KEY=your_shelby_api_key
SHELBY_NETWORK=shelbynet
SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY=service_account_private_key
SHELBY_SERVICE_ACCOUNT_ADDRESS=service_account_address

# Optional: For cross-chain wallet sponsorship
SPONSOR_PRIVATE_KEY=sponsor_account_private_key
```

---

## Cost Considerations

### Shelby Storage Costs

- **Transaction Fee**: APT tokens (for on-chain registration)
- **Storage Fee**: Shelby tokens (per blob, per time period)
- **1 Shelby token = 1 upload** (as per docs)

### Cost Optimization

1. **Batch Uploads**: Group multiple videos in one transaction
2. **Expiration Management**: Set appropriate expiration times
3. **CDN Caching**: Cache popular videos on CDN
4. **Compression**: Compress videos before upload

---

## Migration from S3 to Shelby

### Migration Strategy

1. **Phase 1**: New videos → Shelby
2. **Phase 2**: Migrate existing videos gradually
3. **Phase 3**: Remove S3 dependency

### Migration Script

```typescript
export async function migrateVideoToShelby(videoId: string) {
  // 1. Download from S3
  const s3Video = await downloadFromS3(videoId);

  // 2. Upload to Shelby
  const shelbyInfo = await uploadVideoToShelby(s3Video, videoId);

  // 3. Update database
  await Video.update(
    {
      shelbyAccount: shelbyInfo.account,
      shelbyBlobName: shelbyInfo.blobName,
      shelbyMerkleRoot: shelbyInfo.merkleRoot,
      shelbyExpiration: shelbyInfo.expirationMicros,
    },
    { where: { id: videoId } }
  );

  // 4. (Optional) Delete from S3 after verification
}
```

---

## Best Practices

1. **Unique Blob Names**: Use `video_{videoId}_{timestamp}.mp4`
2. **Expiration Management**: Set 30-90 days, auto-renew
3. **Error Handling**: Retry with exponential backoff
4. **Monitoring**: Track upload success rate, storage costs
5. **Backup**: Keep metadata in database, verify blob existence
6. **CDN**: Use CDN to cache popular videos for faster delivery

---

## API Updates

### Updated Endpoints

#### POST /videos/upload
- Upload video to Shelby instead of S3
- Return Shelby account and blob name

#### GET /videos/:id/stream
- Stream from Shelby instead of S3
- Handle Shelby download stream

#### GET /videos/:id/shelby-info
Get Shelby storage information.

**Response:**
```json
{
  "success": true,
  "data": {
    "account": "account_address",
    "blobName": "video_123.mp4",
    "merkleRoot": "merkle_root_hash",
    "expiration": "2024-02-01T00:00:00Z",
    "size": 52428800,
    "chunksets": 10
  }
}
```

---

## Dependencies

```json
{
  "dependencies": {
    "@shelby-protocol/sdk": "latest",
    "@aptos-labs/ts-sdk": "^5.1.1"
  }
}
```

---

## Conclusion

Shelby Network provides:
- ✅ Decentralized storage
- ✅ Blockchain-based verification
- ✅ Account-based organization
- ✅ Cost-effective storage
- ✅ Integration with Aptos ecosystem

Loop backend uses Shelby as primary storage for videos, sounds, and thumbnails.
