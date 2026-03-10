# Video Processing & Upload Specifications

## Overview

Specifications for video upload, processing, and delivery pipeline.

---

## Video Upload Flow

### 1. Upload Initiation

#### POST /videos/upload/initiate
Initiate a video upload session.

**Request:**
```json
{
  "fileName": "my-video.mp4",
  "fileSize": 52428800, // bytes
  "mimeType": "video/mp4",
  "title": "Video Title",
  "description": "Video description",
  "hashtags": ["tag1", "tag2"],
  "privacy": "public",
  "allowComments": true,
  "allowDuet": true,
  "allowStitch": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadId": "upload_session_id",
    "chunkSize": 5242880, // 5MB chunks
    "totalChunks": 10,
    "uploadUrls": [
      {
        "chunkIndex": 0,
        "url": "https://storage.example.com/upload/chunk-0",
        "expiresAt": "2024-01-01T00:05:00Z"
      }
    ],
    "expiresAt": "2024-01-01T01:00:00Z"
  }
}
```

### 2. Chunk Upload

#### PUT /videos/upload/chunk
Upload a video chunk.

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: application/octet-stream`
- `X-Upload-Id: {uploadId}`
- `X-Chunk-Index: {chunkIndex}`
- `X-Chunk-Size: {chunkSize}`

**Request Body:**
- Binary chunk data

**Response:**
```json
{
  "success": true,
  "data": {
    "chunkIndex": 0,
    "uploaded": true,
    "nextChunkUrl": "https://storage.example.com/upload/chunk-1"
  }
}
```

### 3. Upload Completion

#### POST /videos/upload/complete
Complete the upload and start processing.

**Request:**
```json
{
  "uploadId": "upload_session_id",
  "chunks": [
    {
      "index": 0,
      "etag": "chunk-etag-0"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video_id",
    "status": "processing",
    "estimatedProcessingTime": 300, // seconds
    "webhookUrl": "https://api.loop.com/v1/webhooks/video-processing"
  }
}
```

### 4. Upload Status

#### GET /videos/upload/:uploadId/status
Get upload progress.

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadId": "upload_session_id",
    "status": "uploading" | "processing" | "completed" | "failed",
    "progress": {
      "uploadedChunks": 8,
      "totalChunks": 10,
      "percentage": 80
    },
    "processing": {
      "stage": "transcoding",
      "progress": 45
    },
    "error": null
  }
}
```

---

## Video Processing Pipeline

### Processing Stages

1. **Upload Validation**
   - File format validation
   - File size check
   - Virus scanning
   - Content moderation (pre-screening)

2. **Transcoding**
   - Generate multiple quality versions:
     - 1080p (HD)
     - 720p (SD)
     - 480p (Mobile)
     - 360p (Low bandwidth)
   - Optimize bitrate for each quality
   - Generate HLS/DASH streams for adaptive playback

3. **Thumbnail Generation**
   - Extract frames at: 0s, 25%, 50%, 75%, 100%
   - Generate multiple thumbnail sizes:
     - 1280x720 (HD)
     - 640x360 (SD)
     - 320x180 (Thumbnail)
   - Auto-select best thumbnail

4. **Metadata Extraction**
   - Duration
   - Resolution
   - Frame rate
   - Bitrate
   - Codec information
   - Audio track information

5. **Content Analysis**
   - Scene detection
   - Object detection
   - Text recognition (OCR)
   - Audio transcription (optional)

6. **Storage**
   - Store original file (optional, for creators)
   - Store transcoded versions
   - Store thumbnails
   - Generate CDN URLs

### Processing Status

```typescript
enum VideoProcessingStatus {
  PENDING = "pending",
  UPLOADING = "uploading",
  VALIDATING = "validating",
  TRANSCODING = "transcoding",
  GENERATING_THUMBNAILS = "generating_thumbnails",
  ANALYZING = "analyzing",
  COMPLETED = "completed",
  FAILED = "failed"
}
```

### Webhook Events

#### Video Processing Complete
```json
{
  "event": "video.processing.complete",
  "videoId": "video_id",
  "status": "completed",
  "urls": {
    "1080p": "https://cdn.loop.com/videos/video_id_1080p.mp4",
    "720p": "https://cdn.loop.com/videos/video_id_720p.mp4",
    "thumbnail": "https://cdn.loop.com/thumbnails/video_id.jpg"
  },
  "metadata": {
    "duration": 154,
    "resolution": "1920x1080",
    "frameRate": 30
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Video Processing Failed
```json
{
  "event": "video.processing.failed",
  "videoId": "video_id",
  "status": "failed",
  "error": {
    "code": "TRANSCODING_ERROR",
    "message": "Failed to transcode video",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## Video Quality & Formats

### Supported Input Formats
- MP4 (H.264, H.265)
- MOV (H.264, H.265)
- AVI (H.264)
- WebM (VP9, VP8)

### Output Formats
- MP4 (H.264) - Primary format
- HLS (HTTP Live Streaming) - Adaptive streaming
- DASH (Dynamic Adaptive Streaming) - Alternative adaptive streaming

### Quality Presets

| Quality | Resolution | Bitrate | Use Case |
|---------|-----------|---------|----------|
| 1080p | 1920x1080 | 5-8 Mbps | High quality playback |
| 720p | 1280x720 | 2-4 Mbps | Standard quality |
| 480p | 854x480 | 1-2 Mbps | Mobile data saving |
| 360p | 640x360 | 500-1000 Kbps | Low bandwidth |

### Adaptive Bitrate Streaming

Videos are delivered using adaptive bitrate streaming:
- Client automatically selects best quality based on connection
- Seamless quality switching during playback
- Reduces buffering and improves user experience

---

## Thumbnail Generation

### Thumbnail Strategy

1. **Auto-Generated Thumbnails**
   - Extract frames at key timestamps
   - Use ML to select most engaging frame
   - Generate multiple sizes

2. **Custom Thumbnails**
   - User can upload custom thumbnail
   - Validate dimensions and format
   - Generate required sizes

### Thumbnail Sizes

- **Large**: 1280x720 (for video detail pages)
- **Medium**: 640x360 (for feed/grid views)
- **Small**: 320x180 (for thumbnails in lists)
- **Square**: 640x640 (for profile videos)

### Thumbnail API

#### POST /videos/:id/thumbnail
Upload custom thumbnail.

**Request:**
- `Content-Type: multipart/form-data`
- `thumbnail`: Image file (JPEG, PNG, max 5MB)

**Response:**
```json
{
  "success": true,
  "data": {
    "thumbnailUrl": "https://cdn.loop.com/thumbnails/video_id.jpg",
    "sizes": {
      "large": "https://cdn.loop.com/thumbnails/video_id_1280x720.jpg",
      "medium": "https://cdn.loop.com/thumbnails/video_id_640x360.jpg",
      "small": "https://cdn.loop.com/thumbnails/video_id_320x180.jpg"
    }
  }
}
```

---

## File Storage

### Storage Strategy (Shelby Network)

**Loop sử dụng Shelby Network làm decentralized storage thay vì AWS S3.**

1. **Video Files**
   - Stored on Shelby Network (blockchain-based)
   - Account-based storage
   - Merkle root verification
   - Expiration-based (30-90 days, auto-renewable)

2. **Processed Files**
   - Multiple quality versions stored on Shelby
   - Each version is a separate blob
   - CDN caching for faster delivery

3. **Thumbnails**
   - Stored on Shelby Network
   - CDN cached for performance
   - Multiple sizes

### Shelby Storage Details

- **Network**: Shelbynet (Aptos-based)
- **Account Model**: Service account or per-user accounts
- **Blob Naming**: `video_{videoId}_{quality}.mp4`
- **Expiration**: 30-90 days (configurable)
- **Verification**: Merkle root on-chain

See [shelby-integration.md](./shelby-integration.md) for detailed integration guide.

### CDN Configuration

- **Primary CDN**: CloudFront / Cloudflare (for caching)
- **Source**: Shelby Network
- **Caching**: 30 days for videos, 7 days for thumbnails
- **Compression**: Gzip/Brotli for metadata
- **HTTPS**: Required for all content

---

## Video Delivery

### Streaming URLs

#### GET /videos/:id/stream
Get streaming URLs for video.

**Query Parameters:**
- `quality`: `auto`, `1080p`, `720p`, `480p`, `360p` (default: auto)
- `format`: `mp4`, `hls`, `dash` (default: mp4)

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video_id",
    "formats": {
      "mp4": {
        "1080p": "https://cdn.loop.com/videos/video_id_1080p.mp4",
        "720p": "https://cdn.loop.com/videos/video_id_720p.mp4",
        "480p": "https://cdn.loop.com/videos/video_id_480p.mp4",
        "360p": "https://cdn.loop.com/videos/video_id_360p.mp4"
      },
      "hls": {
        "master": "https://cdn.loop.com/videos/video_id.m3u8",
        "playlist": "https://cdn.loop.com/videos/video_id_playlist.m3u8"
      },
      "dash": {
        "manifest": "https://cdn.loop.com/videos/video_id.mpd"
      }
    },
    "thumbnail": "https://cdn.loop.com/thumbnails/video_id.jpg",
    "duration": 154
  }
}
```

### Video URLs

Videos are served from Shelby Network:

**Public Videos:**
```json
{
  "url": "https://api.loop.com/v1/videos/video_id/stream",
  "shelbyAccount": "account_address",
  "blobName": "video_123.mp4"
}
```

**Private Videos:**
- Require authentication token
- Stream endpoint validates user permissions
- Direct Shelby download with account verification

---

## Content Moderation

### Pre-Upload Screening

- File format validation
- File size limits
- Basic content checks

### Post-Upload Analysis

1. **Automated Moderation**
   - Object detection (inappropriate content)
   - Text detection (spam, hate speech)
   - Audio analysis (copyright detection)
   - Scene analysis

2. **Manual Review**
   - Flagged content review
   - User reports
   - Creator appeals

### Moderation Status

```typescript
enum ModerationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  FLAGGED = "flagged",
  REJECTED = "rejected",
  UNDER_REVIEW = "under_review"
}
```

---

## Error Handling

### Upload Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| `FILE_TOO_LARGE` | File exceeds size limit | Reduce file size or use compression |
| `INVALID_FORMAT` | Unsupported file format | Convert to supported format |
| `UPLOAD_EXPIRED` | Upload session expired | Restart upload |
| `CHUNK_MISMATCH` | Chunk verification failed | Re-upload chunk |
| `STORAGE_ERROR` | Storage service error | Retry upload |

### Processing Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| `TRANSCODING_FAILED` | Video transcoding failed | Check video format/corruption |
| `THUMBNAIL_FAILED` | Thumbnail generation failed | Retry or upload custom thumbnail |
| `METADATA_EXTRACTION_FAILED` | Could not extract metadata | Check video file integrity |

---

## Performance Optimization

### Upload Optimization

1. **Chunked Upload**
   - 5MB chunks for better reliability
   - Parallel chunk uploads (up to 3 concurrent)
   - Automatic retry on failure

2. **Resumable Uploads**
   - Save upload progress
   - Resume from last chunk
   - Support pause/resume

### Processing Optimization

1. **Queue Management**
   - Priority queue for verified creators
   - Batch processing for efficiency
   - Auto-scaling workers

2. **Caching**
   - Cache processing results
   - Reuse thumbnails when possible
   - CDN caching for delivery

---

## Limits & Quotas

### Upload Limits

- **Max File Size**: 500MB
- **Max Duration**: 5 minutes (300 seconds)
- **Max Resolution**: 4K (3840x2160)
- **Min Resolution**: 360p (640x360)

### Rate Limits

- **Uploads per hour**: 10 per user
- **Uploads per day**: 50 per user
- **Concurrent uploads**: 2 per user

### Storage Limits

- **Free tier**: 10GB storage
- **Creator tier**: 100GB storage
- **Pro tier**: Unlimited storage

---

## Monitoring & Metrics

### Key Metrics

- Upload success rate
- Average processing time
- Processing queue length
- Storage usage
- CDN bandwidth
- Error rates by type

### Alerts

- Processing queue backlog > 100
- Processing failure rate > 5%
- Storage usage > 80%
- CDN errors > 1%

---

## Future Enhancements

- [ ] Live streaming support
- [ ] Video editing tools
- [ ] AI-powered thumbnail selection
- [ ] Advanced content analysis
- [ ] Real-time processing status
- [ ] Batch upload API
- [ ] Video compression optimization

