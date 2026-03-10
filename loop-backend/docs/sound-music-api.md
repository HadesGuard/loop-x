# Sound & Music API Specifications

## Overview

API specifications for sound/music management, discovery, and video-sound relationships.

---

## Sound Management

### GET /sounds
Get list of sounds/music tracks.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sort`: `trending`, `recent`, `popular`, `alphabetical` (default: trending)
- `genre`: Filter by genre (optional)
- `duration`: Filter by duration range, e.g., `0-30`, `30-60` (optional)
- `search`: Search query (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "sounds": [
      {
        "id": "sound_id",
        "title": "Original Audio",
        "artist": "@bunny_films",
        "artistId": "user_id",
        "duration": 30, // seconds
        "url": "https://cdn.loop.com/sounds/sound_id.mp3",
        "thumbnail": "https://cdn.loop.com/sounds/thumbnails/sound_id.jpg",
        "genre": "electronic",
        "totalVideos": 124500,
        "totalViews": "45.2M",
        "isFavorited": false,
        "isOriginal": true,
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

### GET /sounds/:id
Get sound details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sound_id",
    "title": "Original Audio",
    "artist": "@bunny_films",
    "artistId": "user_id",
    "artistInfo": {
      "id": "user_id",
      "username": "@bunny_films",
      "avatar": "avatar_url",
      "isVerified": true
    },
    "duration": 30,
    "url": "https://cdn.loop.com/sounds/sound_id.mp3",
    "thumbnail": "https://cdn.loop.com/sounds/thumbnails/sound_id.jpg",
    "genre": "electronic",
    "tags": ["dance", "electronic", "viral"],
    "totalVideos": 124500,
    "totalViews": "45.2M",
    "totalLikes": "2.1M",
    "isFavorited": false,
    "isOriginal": true,
    "description": "Catchy electronic beat",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### GET /sounds/:id/videos
Get videos using this sound.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sort`: `trending`, `recent`, `popular` (default: trending)

**Response:**
```json
{
  "success": true,
  "data": {
    "sound": {
      "id": "sound_id",
      "title": "Original Audio"
    },
    "videos": [
      {
        "id": "video_id",
        "thumbnail": "thumbnail_url",
        "caption": "Video caption",
        "username": "@username",
        "views": "2.4M",
        "likes": "184K",
        "duration": 30
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

### POST /sounds
Upload a new sound/music track.

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: multipart/form-data`

**Request:**
- `audio`: Audio file (MP3, WAV, M4A, max 10MB)
- `title`: Sound title (required, max 100 chars)
- `genre`: Genre (optional)
- `description`: Description (optional, max 500 chars)
- `tags`: Comma-separated tags (optional)
- `thumbnail`: Thumbnail image (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sound_id",
    "title": "My Original Sound",
    "duration": 30,
    "url": "https://cdn.loop.com/sounds/sound_id.mp3",
    "status": "processing",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### PUT /sounds/:id
Update sound metadata.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "genre": "pop",
  "tags": "tag1,tag2"
}
```

### DELETE /sounds/:id
Delete a sound.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "message": "Sound deleted successfully"
}
```

---

## Sound Interactions

### POST /sounds/:id/favorite
Add sound to favorites.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "favorited": true
  }
}
```

### DELETE /sounds/:id/favorite
Remove sound from favorites.

**Headers:**
- `Authorization: Bearer {token}`

### GET /sounds/favorites
Get user's favorite sounds.

**Headers:**
- `Authorization: Bearer {token}`

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page

---

## Video-Sound Relationship

### Link Sound to Video

When uploading/editing a video, link a sound:

**Request Body (POST /videos):**
```json
{
  "title": "Video Title",
  "soundId": "sound_id", // Optional
  "useOriginalAudio": false, // If true, use original video audio
  "soundStartTime": 0, // Start time in sound (seconds)
  "soundVolume": 100 // 0-100
}
```

### GET /videos/:id/sound
Get sound used in video.

**Response:**
```json
{
  "success": true,
  "data": {
    "sound": {
      "id": "sound_id",
      "title": "Original Audio",
      "artist": "@artist",
      "duration": 30,
      "url": "https://cdn.loop.com/sounds/sound_id.mp3"
    },
    "videoSoundSettings": {
      "startTime": 0,
      "volume": 100,
      "useOriginalAudio": false
    }
  }
}
```

---

## Sound Discovery

### GET /sounds/trending
Get trending sounds.

**Query Parameters:**
- `timeframe`: `day`, `week`, `month` (default: week)
- `limit`: Number of sounds (default: 20)
- `genre`: Filter by genre (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "sounds": [ /* sound objects */ ],
    "timeframe": "week"
  }
}
```

### GET /sounds/genres
Get available genres.

**Response:**
```json
{
  "success": true,
  "data": {
    "genres": [
      {
        "id": "electronic",
        "name": "Electronic",
        "soundCount": 12500,
        "thumbnail": "genre_thumbnail_url"
      }
    ]
  }
}
```

### GET /sounds/search
Search sounds.

**Query Parameters:**
- `q`: Search query (required)
- `page`: Page number
- `limit`: Items per page
- `genre`: Filter by genre (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "sounds": [ /* sound objects */ ],
    "pagination": { /* pagination object */ }
  }
}
```

---

## Original Sounds

### Create Original Sound from Video

When a user uploads a video with original audio, create a sound:

**Automatic Process:**
1. Extract audio from video
2. Create sound entry
3. Link to video
4. Mark as "original"

### GET /users/:username/original-sounds
Get user's original sounds.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "sounds": [ /* sound objects with isOriginal: true */ ],
    "pagination": { /* pagination object */ }
  }
}
```

---

## Sound Analytics

### GET /sounds/:id/analytics
Get sound analytics (for sound creator).

**Headers:**
- `Authorization: Bearer {token}`

**Query Parameters:**
- `timeframe`: `7d`, `30d`, `90d`, `all` (default: 30d)

**Response:**
```json
{
  "success": true,
  "data": {
    "soundId": "sound_id",
    "totalVideos": 124500,
    "totalViews": 45200000,
    "totalLikes": 2100000,
    "growth": {
      "videos": "+12.5%",
      "views": "+8.3%"
    },
    "topVideos": [
      {
        "videoId": "video_id",
        "views": 5000000,
        "likes": 250000
      }
    ],
    "usageByDay": [
      {
        "date": "2024-01-01",
        "videos": 1250,
        "views": 450000
      }
    ]
  }
}
```

---

## Database Schema

### sounds table
```sql
CREATE TABLE sounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    artist VARCHAR(255),
    duration INT NOT NULL, -- seconds
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    genre VARCHAR(50),
    description TEXT,
    tags TEXT[], -- Array of tags
    total_videos INT DEFAULT 0,
    total_views BIGINT DEFAULT 0,
    total_likes INT DEFAULT 0,
    is_original BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_genre (genre),
    INDEX idx_created_at (created_at),
    FULLTEXT INDEX idx_title_artist (title, artist)
);
```

### video_sounds table
```sql
CREATE TABLE video_sounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    sound_id UUID NOT NULL REFERENCES sounds(id) ON DELETE CASCADE,
    start_time INT DEFAULT 0, -- Start time in sound (seconds)
    volume INT DEFAULT 100, -- 0-100
    use_original_audio BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (sound_id) REFERENCES sounds(id) ON DELETE CASCADE,
    UNIQUE(video_id, sound_id),
    INDEX idx_video_id (video_id),
    INDEX idx_sound_id (sound_id)
);
```

### sound_favorites table
```sql
CREATE TABLE sound_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sound_id UUID NOT NULL REFERENCES sounds(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sound_id) REFERENCES sounds(id) ON DELETE CASCADE,
    UNIQUE(user_id, sound_id),
    INDEX idx_user_id (user_id),
    INDEX idx_sound_id (sound_id)
);
```

---

## Sound Processing

### Audio Processing Pipeline

1. **Upload Validation**
   - Format validation (MP3, WAV, M4A)
   - File size check (max 10MB)
   - Duration validation

2. **Audio Processing**
   - Normalize audio levels
   - Extract metadata (duration, bitrate, sample rate)
   - Generate waveform visualization

3. **Thumbnail Generation**
   - Extract album art if available
   - Generate waveform image
   - Create default thumbnail

4. **Storage**
   - Store audio file
   - Store thumbnail
   - Generate CDN URLs

---

## Limits & Quotas

### Upload Limits
- **Max File Size**: 10MB
- **Max Duration**: 5 minutes
- **Supported Formats**: MP3, WAV, M4A
- **Uploads per day**: 20 per user

### Rate Limits
- **Sound API**: 100 requests/minute
- **Upload**: 5 uploads/hour

---

## Error Handling

| Error Code | Description |
|------------|-------------|
| `SOUND_NOT_FOUND` | Sound does not exist |
| `INVALID_AUDIO_FORMAT` | Unsupported audio format |
| `FILE_TOO_LARGE` | Audio file exceeds size limit |
| `DURATION_TOO_LONG` | Audio duration exceeds limit |
| `UNAUTHORIZED` | Not authorized to perform action |

