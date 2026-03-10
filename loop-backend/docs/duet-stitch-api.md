# Duet & Stitch API Specifications

## Overview

API specifications for Duet and Stitch features - allowing users to create collaborative videos.

---

## Duet Feature

### What is Duet?
Duet allows users to create a side-by-side video with an existing video, creating a collaborative response or reaction.

### POST /videos/:id/duet
Create a duet with an existing video.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "video": "video_file", // Multipart file upload
  "thumbnail": "thumbnail_file", // Optional
  "title": "My Duet Video",
  "description": "Duet description",
  "hashtags": ["duet", "response"],
  "privacy": "public",
  "position": "left" | "right", // Which side the new video appears
  "alignment": "top" | "center" | "bottom", // Vertical alignment
  "soundId": "sound_id", // Optional, use different sound
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
    "id": "duet_video_id",
    "originalVideoId": "original_video_id",
    "type": "duet",
    "position": "left",
    "status": "processing",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### GET /videos/:id/duets
Get all duets created from a video.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sort`: `recent`, `popular`, `trending` (default: recent)

**Response:**
```json
{
  "success": true,
  "data": {
    "originalVideo": {
      "id": "original_video_id",
      "title": "Original Video"
    },
    "duets": [
      {
        "id": "duet_video_id",
        "thumbnail": "thumbnail_url",
        "username": "@username",
        "caption": "Duet caption",
        "views": "125K",
        "likes": "8.2K",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "hasMore": true
    }
  }
}
```

### GET /videos/:id/duet-info
Get duet information for a video (if it's a duet).

**Response:**
```json
{
  "success": true,
  "data": {
    "isDuet": true,
    "originalVideo": {
      "id": "original_video_id",
      "title": "Original Video",
      "username": "@original_user",
      "thumbnail": "thumbnail_url"
    },
    "duetVideo": {
      "id": "duet_video_id",
      "title": "Duet Video",
      "username": "@duet_user",
      "thumbnail": "thumbnail_url"
    },
    "position": "left",
    "alignment": "center"
  }
}
```

---

## Stitch Feature

### What is Stitch?
Stitch allows users to clip and integrate scenes from another user's video into their own video.

### POST /videos/:id/stitch
Create a stitched video.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "video": "video_file", // Multipart file upload
  "thumbnail": "thumbnail_file", // Optional
  "title": "My Stitched Video",
  "description": "Stitched video description",
  "hashtags": ["stitch", "remix"],
  "privacy": "public",
  "clipStartTime": 5, // Start time in original video (seconds)
  "clipEndTime": 15, // End time in original video (seconds)
  "clipDuration": 10, // Duration of clip used
  "soundId": "sound_id", // Optional
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
    "id": "stitch_video_id",
    "originalVideoId": "original_video_id",
    "type": "stitch",
    "clipStartTime": 5,
    "clipEndTime": 15,
    "status": "processing",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### GET /videos/:id/stitches
Get all stitches created from a video.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sort`: `recent`, `popular`, `trending` (default: recent)

**Response:**
```json
{
  "success": true,
  "data": {
    "originalVideo": {
      "id": "original_video_id",
      "title": "Original Video"
    },
    "stitches": [
      {
        "id": "stitch_video_id",
        "thumbnail": "thumbnail_url",
        "username": "@username",
        "caption": "Stitch caption",
        "views": "89K",
        "likes": "5.1K",
        "clipInfo": {
          "startTime": 5,
          "endTime": 15,
          "duration": 10
        },
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "hasMore": true
    }
  }
}
```

### GET /videos/:id/stitch-info
Get stitch information for a video (if it's a stitch).

**Response:**
```json
{
  "success": true,
  "data": {
    "isStitch": true,
    "originalVideo": {
      "id": "original_video_id",
      "title": "Original Video",
      "username": "@original_user",
      "thumbnail": "thumbnail_url"
    },
    "stitchVideo": {
      "id": "stitch_video_id",
      "title": "Stitched Video",
      "username": "@stitch_user",
      "thumbnail": "thumbnail_url"
    },
    "clipInfo": {
      "startTime": 5,
      "endTime": 15,
      "duration": 10
    }
  }
}
```

---

## Privacy Settings

### Video Privacy for Duet/Stitch

Videos can have privacy settings that control whether they can be used for duets/stitches:

```typescript
interface VideoPrivacy {
  privacy: "public" | "private" | "friends";
  allowComments: boolean;
  allowDuet: boolean; // Allow others to create duets
  allowStitch: boolean; // Allow others to create stitches
}
```

### Update Privacy Settings

#### PUT /videos/:id/privacy
Update video privacy settings.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
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
    "videoId": "video_id",
    "privacy": "public",
    "allowComments": true,
    "allowDuet": true,
    "allowStitch": true
  }
}
```

---

## Duet/Stitch Processing

### Video Composition

#### Duet Processing
1. **Video Alignment**
   - Resize both videos to fit side-by-side
   - Maintain aspect ratios
   - Apply alignment settings

2. **Audio Mixing**
   - Mix audio from both videos (optional)
   - Or use sound from one video
   - Balance audio levels

3. **Synchronization**
   - Sync videos to start together
   - Handle different durations
   - Loop shorter video if needed

#### Stitch Processing
1. **Clip Extraction**
   - Extract clip from original video
   - Apply start/end times
   - Maintain quality

2. **Video Composition**
   - Combine clip with new video
   - Smooth transitions
   - Maintain timeline

3. **Audio Handling**
   - Use audio from stitched video
   - Or mix with original audio
   - Apply fade in/out

---

## Database Schema

### video_relations table
```sql
CREATE TABLE video_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    related_video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    relation_type VARCHAR(20) NOT NULL CHECK (relation_type IN ('duet', 'stitch')),
    metadata JSONB, -- Store position, alignment, clip times, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (related_video_id) REFERENCES videos(id) ON DELETE CASCADE,
    INDEX idx_video_id (video_id),
    INDEX idx_related_video_id (related_video_id),
    INDEX idx_relation_type (relation_type)
);
```

### Update videos table
```sql
-- Add columns to videos table
ALTER TABLE videos
ADD COLUMN allow_duet BOOLEAN DEFAULT TRUE,
ADD COLUMN allow_stitch BOOLEAN DEFAULT TRUE,
ADD COLUMN duets_count INT DEFAULT 0,
ADD COLUMN stitches_count INT DEFAULT 0;
```

---

## API Endpoints Summary

### Duet Endpoints
- `POST /videos/:id/duet` - Create duet
- `GET /videos/:id/duets` - Get duets from video
- `GET /videos/:id/duet-info` - Get duet information

### Stitch Endpoints
- `POST /videos/:id/stitch` - Create stitch
- `GET /videos/:id/stitches` - Get stitches from video
- `GET /videos/:id/stitch-info` - Get stitch information

### Privacy Endpoints
- `PUT /videos/:id/privacy` - Update privacy settings
- `GET /videos/:id/privacy` - Get privacy settings

---

## Error Handling

| Error Code | Description |
|------------|-------------|
| `DUET_NOT_ALLOWED` | Original video doesn't allow duets |
| `STITCH_NOT_ALLOWED` | Original video doesn't allow stitches |
| `VIDEO_NOT_FOUND` | Original video doesn't exist |
| `INVALID_CLIP_TIME` | Clip start/end time invalid |
| `CLIP_TOO_LONG` | Clip duration exceeds limit |
| `PRIVATE_VIDEO` | Cannot duet/stitch private video |

---

## Limits & Constraints

### Duet Limits
- **Max Duration**: Same as regular videos (5 minutes)
- **Position Options**: Left, Right
- **Alignment Options**: Top, Center, Bottom

### Stitch Limits
- **Max Clip Duration**: 15 seconds
- **Min Clip Duration**: 1 second
- **Max Clips per Video**: 3 clips
- **Total Stitched Duration**: Max 30 seconds

### Rate Limits
- **Duets per day**: 20 per user
- **Stitches per day**: 20 per user
- **Duets per video**: Unlimited (if allowed)
- **Stitches per video**: Unlimited (if allowed)

---

## Analytics

### Duet/Stitch Analytics

Track metrics for duets and stitches:
- Number of duets/stitches created
- Views from duets/stitches
- Engagement from duets/stitches
- Top dueted/stitched videos

### GET /videos/:id/duet-analytics
Get duet analytics for a video.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video_id",
    "totalDuets": 1250,
    "totalViewsFromDuets": 5000000,
    "topDuets": [
      {
        "duetVideoId": "duet_id",
        "views": 500000,
        "likes": 25000
      }
    ]
  }
}
```

---

## Best Practices

1. **Always Check Permissions**
   - Verify `allowDuet` or `allowStitch` before creating
   - Respect privacy settings

2. **Attribution**
   - Always credit original creator
   - Show original video info in duet/stitch

3. **Content Guidelines**
   - Duets/stitches must follow community guidelines
   - Original creator can report inappropriate use

4. **Performance**
   - Cache duet/stitch lists
   - Lazy load related videos
   - Optimize video composition processing

