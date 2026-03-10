# Loop Backend API Specifications

## Table of Contents
1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [User Management](#user-management)
4. [Video Management](#video-management)
5. [Feed System](#feed-system)
6. [Interactions](#interactions)
7. [Comments](#comments)
8. [Messaging](#messaging)
9. [Notifications](#notifications)
10. [Search](#search)
11. [Hashtags](#hashtags)
12. [Sounds & Music](#sounds--music)
13. [Analytics](#analytics)
14. [Privacy & Safety](#privacy--safety)
15. [Watch History](#watch-history)
16. [Discover & Trending](#discover--trending)
17. [Data Models](#data-models)
18. [Error Handling](#error-handling)

---

## Overview

**Base URL**: `https://api.loop.com/v1`

**API Version**: `v1`

**Response Format**: JSON

**Authentication**: Bearer Token (JWT) in Authorization header

---

## Authentication & Authorization

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "username": "username",
  "fullName": "Full Name"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "username": "username",
      "email": "user@example.com",
      "fullName": "Full Name",
      "avatar": null,
      "isVerified": false,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "rememberMe": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

### POST /auth/google
Login/Register with Google OAuth.

**Request Body:**
```json
{
  "idToken": "google_id_token"
}
```

### POST /auth/apple
Login/Register with Apple OAuth.

**Request Body:**
```json
{
  "idToken": "apple_id_token",
  "authorizationCode": "authorization_code"
}
```

### POST /auth/refresh
Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

### POST /auth/logout
Logout current user.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /auth/forgot-password
Request password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### POST /auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "reset_token",
  "newPassword": "newSecurePassword123"
}
```

---

## User Management

### GET /users/me
Get current user profile.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "username": "username",
    "email": "user@example.com",
    "fullName": "Full Name",
    "avatar": "avatar_url",
    "bio": "User bio",
    "website": "website.com",
    "isVerified": false,
    "followers": 125000,
    "following": 500,
    "videos": 48,
    "likes": 450000,
    "joined": "January 2024",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### GET /users/:username
Get user profile by username.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "username": "username",
    "fullName": "Full Name",
    "avatar": "avatar_url",
    "bio": "User bio",
    "website": "website.com",
    "isVerified": false,
    "followers": 125000,
    "following": 500,
    "videos": 48,
    "likes": 450000,
    "joined": "January 2024",
    "isFollowing": false,
    "isBlocked": false
  }
}
```

### PUT /users/me
Update current user profile.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "fullName": "Updated Name",
  "bio": "Updated bio",
  "website": "newwebsite.com",
  "avatar": "avatar_url"
}
```

### POST /users/me/avatar
Upload user avatar.

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: multipart/form-data`

**Request:**
- `file`: Image file

### DELETE /users/me
Delete current user account.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "password": "current_password"
}
```

### GET /users/:username/videos
Get user's videos.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sort`: Sort by `newest`, `oldest`, `popular` (default: newest)

### GET /users/:username/liked
Get user's liked videos.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page

### GET /users/:username/saved
Get user's saved videos.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page

### GET /users/:username/followers
Get user's followers.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page

### GET /users/:username/following
Get users that user is following.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page

### POST /users/:username/follow
Follow a user.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "following": true,
    "followersCount": 125001
  }
}
```

### DELETE /users/:username/follow
Unfollow a user.

**Headers:**
- `Authorization: Bearer {token}`

---

## Video Management

> **Note**: For detailed video upload flow with Shelby Network, see [SHELBY_STORAGE_INTEGRATION.md](./SHELBY_STORAGE_INTEGRATION.md).  
> For video processing pipeline details, see [VIDEO_PROCESSING_SPECS.md](./VIDEO_PROCESSING_SPECS.md).

### POST /videos
Upload a new video.

**Storage**: Videos are stored on Shelby Network (decentralized storage). See [SHELBY_STORAGE_INTEGRATION.md](./SHELBY_STORAGE_INTEGRATION.md) for implementation details.

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: multipart/form-data`

**Request:**
- `video`: Video file (MP4, MOV, AVI, max 500MB)
- `thumbnail`: Thumbnail image (optional)
- `title`: Video title (required, max 100 chars)
- `description`: Video description (optional, max 500 chars)
- `hashtags`: Comma-separated hashtags (optional)
- `privacy`: `public`, `private`, `friends` (default: public)
- `allowComments`: boolean (default: true)
- `allowDuet`: boolean (default: true)
- `allowStitch`: boolean (default: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "video_id",
    "url": "video_url",
    "thumbnail": "thumbnail_url",
    "title": "Video Title",
    "description": "Video description",
    "hashtags": ["tag1", "tag2"],
    "privacy": "public",
    "allowComments": true,
    "allowDuet": true,
    "allowStitch": true,
    "status": "processing",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### GET /videos/:id
Get video by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "video_id",
    "url": "video_url",
    "thumbnail": "thumbnail_url",
    "title": "Video Title",
    "description": "Video description",
    "username": "@username",
    "user": {
      "id": "user_id",
      "username": "@username",
      "avatar": "avatar_url",
      "isVerified": false
    },
    "views": 124500,
    "likes": 8200,
    "comments": 342,
    "shares": 156,
    "isLiked": false,
    "isSaved": false,
    "hashtags": ["tag1", "tag2"],
    "createdAt": "2024-01-01T00:00:00Z",
    "duration": 154
  }
}
```

### PUT /videos/:id
Update video metadata.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "hashtags": "tag1,tag2",
  "privacy": "public",
  "allowComments": true,
  "allowDuet": true,
  "allowStitch": true
}
```

### DELETE /videos/:id
Delete a video.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "message": "Video deleted successfully"
}
```

### POST /videos/:id/thumbnail
Update video thumbnail.

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: multipart/form-data`

**Request:**
- `thumbnail`: Image file

---

## Feed System

### GET /feed
Get video feed.

**Query Parameters:**
- `type`: `foryou` or `following` (default: foryou)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `cursor`: Cursor for pagination (optional)

**Headers:**
- `Authorization: Bearer {token}` (optional, for personalized feed)

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": "video_id",
        "url": "video_url",
        "thumbnail": "thumbnail_url",
        "username": "@username",
        "caption": "Video caption with #hashtags",
        "views": 1000,
        "likes": 100,
        "comments": 10,
        "shares": 5,
        "isLiked": false,
        "isSaved": false,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "hasMore": true,
      "nextCursor": "cursor_string"
    }
  }
}
```

### GET /feed/more
Get more videos (infinite scroll).

**Query Parameters:**
- `type`: `foryou` or `following`
- `offset`: Number of videos already loaded
- `limit`: Items to load (default: 10)

---

## Interactions

### POST /videos/:id/like
Like a video.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "liked": true,
    "likesCount": 8201
  }
}
```

### DELETE /videos/:id/like
Unlike a video.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "liked": false,
    "likesCount": 8200
  }
}
```

### POST /videos/:id/save
Save a video to favorites.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "saved": true
  }
}
```

### DELETE /videos/:id/save
Remove video from favorites.

**Headers:**
- `Authorization: Bearer {token}`

### POST /videos/:id/share
Record a share action.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "platform": "copy_link" | "twitter" | "facebook" | "whatsapp" | "telegram"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shareUrl": "https://loop.com/video/video_id",
    "sharesCount": 157
  }
}
```

---

## Comments

### GET /videos/:id/comments
Get comments for a video.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sort`: `newest`, `oldest`, `popular` (default: newest)

**Response:**
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_id",
        "username": "@username",
        "user": {
          "id": "user_id",
          "username": "@username",
          "avatar": "avatar_url"
        },
        "text": "Comment text",
        "likes": 245,
        "isLiked": false,
        "timestamp": "2h ago",
        "createdAt": "2024-01-01T00:00:00Z",
        "replies": [
          {
            "id": "reply_id",
            "username": "@reply_user",
            "text": "Reply text",
            "likes": 10,
            "timestamp": "1h ago",
            "createdAt": "2024-01-01T01:00:00Z"
          }
        ],
        "repliesCount": 1
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "hasMore": false
    }
  }
}
```

### POST /videos/:id/comments
Add a comment to a video.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "text": "Comment text",
  "parentId": "comment_id" // Optional, for replies
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "comment_id",
    "username": "@username",
    "text": "Comment text",
    "likes": 0,
    "timestamp": "Just now",
    "createdAt": "2024-01-01T00:00:00Z",
    "replies": []
  }
}
```

### DELETE /comments/:id
Delete a comment.

**Headers:**
- `Authorization: Bearer {token}`

### POST /comments/:id/like
Like a comment.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "liked": true,
    "likes": 246
  }
}
```

### DELETE /comments/:id/like
Unlike a comment.

**Headers:**
- `Authorization: Bearer {token}`

---

## Messaging

### GET /conversations
Get all conversations for current user.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conversation_id",
        "username": "@username",
        "user": {
          "id": "user_id",
          "username": "@username",
          "avatar": "avatar_url"
        },
        "lastMessage": "Last message text",
        "timestamp": "2m ago",
        "unread": 2,
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### GET /conversations/:id/messages
Get messages in a conversation.

**Headers:**
- `Authorization: Bearer {token}`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `before`: Message ID to get messages before (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "message_id",
        "sender": "@username",
        "senderId": "user_id",
        "text": "Message text",
        "timestamp": "10:30 AM",
        "isMine": false,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "hasMore": false
    }
  }
}
```

### POST /conversations
Create or get existing conversation with a user.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "userId": "user_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "conversation_id",
    "username": "@username",
    "user": { /* user object */ },
    "lastMessage": null,
    "timestamp": "Just now",
    "unread": 0,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### POST /conversations/:id/messages
Send a message in a conversation.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "text": "Message text"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "message_id",
    "sender": "@current_user",
    "text": "Message text",
    "timestamp": "10:35 AM",
    "isMine": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### PUT /conversations/:id/read
Mark conversation as read.

**Headers:**
- `Authorization: Bearer {token}`

---

## Notifications

### GET /notifications
Get user notifications.

**Headers:**
- `Authorization: Bearer {token}`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `type`: Filter by type: `like`, `comment`, `follow` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notification_id",
        "type": "like",
        "username": "@username",
        "user": {
          "id": "user_id",
          "username": "@username",
          "avatar": "avatar_url"
        },
        "action": "liked your video",
        "comment": null,
        "video": {
          "id": "video_id",
          "thumbnail": "thumbnail_url"
        },
        "timestamp": "2m ago",
        "read": false,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "unreadCount": 3,
    "pagination": {
      "page": 1,
      "limit": 20,
      "hasMore": false
    }
  }
}
```

### PUT /notifications/:id/read
Mark notification as read.

**Headers:**
- `Authorization: Bearer {token}`

### PUT /notifications/read-all
Mark all notifications as read.

**Headers:**
- `Authorization: Bearer {token}`

---

## Search

### GET /search
Search for users, videos, and hashtags.

**Query Parameters:**
- `q`: Search query (required)
- `type`: `all`, `users`, `videos`, `hashtags` (default: all)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "username": "@username",
        "avatar": "avatar_url",
        "followers": "2.4M",
        "isVerified": true
      }
    ],
    "videos": [
      {
        "id": "video_id",
        "thumbnail": "thumbnail_url",
        "caption": "Video caption",
        "username": "@username",
        "views": "1.2M"
      }
    ],
    "hashtags": [
      {
        "tag": "hashtag",
        "views": "45.2M"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "hasMore": false
    }
  }
}
```

---

## Hashtags

### GET /hashtags/:tag
Get hashtag page with videos.

**Query Parameters:**
- `sort`: `trending`, `recent` (default: trending)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "tag": "hashtag",
    "totalVideos": 1200000,
    "totalViews": "45.2M",
    "videos": [ /* video objects */ ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "hasMore": true
    }
  }
}
```

### GET /hashtags/trending
Get trending hashtags.

**Query Parameters:**
- `limit`: Number of hashtags (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "hashtags": [
      {
        "tag": "foryou",
        "views": "128.5B",
        "growth": "+12%",
        "videosCount": 5000000
      }
    ]
  }
}
```

### POST /hashtags/:tag/follow
Follow a hashtag.

**Headers:**
- `Authorization: Bearer {token}`

### DELETE /hashtags/:tag/follow
Unfollow a hashtag.

**Headers:**
- `Authorization: Bearer {token}`

---

## Sounds & Music

> **Note**: For complete sound/music API documentation, see [SOUND_MUSIC_API.md](./SOUND_MUSIC_API.md).

### GET /sounds
Get list of sounds/music tracks.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sort`: `trending`, `recent`, `popular` (default: trending)
- `genre`: Filter by genre (optional)
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
        "artist": "@artist",
        "duration": 30,
        "totalVideos": 124500,
        "totalViews": "45.2M"
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

### GET /sounds/:id/videos
Get videos using this sound.

### POST /sounds
Upload a new sound/music track.

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: multipart/form-data`

**Request:**
- `audio`: Audio file (MP3, WAV, M4A, max 10MB)
- `title`: Sound title (required)
- `genre`: Genre (optional)
- `description`: Description (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sound_id",
    "title": "My Original Sound",
    "duration": 30,
    "status": "processing",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

> See [SOUND_MUSIC_API.md](./SOUND_MUSIC_API.md) for complete sound API documentation.

---

## Analytics

### GET /analytics/overview
Get overall analytics for current user.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalViews": 2450000,
    "totalFollowers": 125000,
    "totalLikes": 450000,
    "totalVideos": 48,
    "avgEngagement": 8.5,
    "weeklyGrowth": 12.3,
    "watchHours": 2400
  }
}
```

### GET /videos/:id/analytics
Get analytics for a specific video.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "video_id",
    "views": 124500,
    "likes": 8200,
    "comments": 342,
    "shares": 156,
    "watchTime": 45000,
    "avgWatchPercentage": 65.5,
    "engagementRate": 7.2,
    "viewsByDay": [
      {
        "date": "2024-01-01",
        "views": 5000
      }
    ],
    "demographics": {
      "ageGroups": { /* age group data */ },
      "genders": { /* gender data */ },
      "locations": { /* location data */ }
    }
  }
}
```

---

## Privacy & Safety

### POST /users/:username/block
Block a user.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "message": "User blocked successfully"
}
```

### DELETE /users/:username/block
Unblock a user.

**Headers:**
- `Authorization: Bearer {token}`

### GET /users/me/blocked
Get list of blocked users.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "username": "@username",
        "avatar": "avatar_url",
        "blockedAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### POST /reports
Report a user or video.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "type": "user" | "video",
  "targetId": "user_id_or_video_id",
  "reason": "spam" | "harassment" | "inappropriate" | "violence" | "copyright" | "other",
  "description": "Additional details (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Report submitted successfully"
}
```

### GET /users/me/privacy-settings
Get privacy settings.

**Headers:**
- `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "profileVisibility": "public" | "private",
    "allowMessages": "everyone" | "followers" | "none",
    "allowComments": true,
    "allowDuet": true,
    "allowStitch": true,
    "showActivityStatus": true
  }
}
```

### PUT /users/me/privacy-settings
Update privacy settings.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "profileVisibility": "public",
  "allowMessages": "followers",
  "allowComments": true,
  "allowDuet": true,
  "allowStitch": true,
  "showActivityStatus": false
}
```

---

## Watch History

### GET /history
Get watch history.

**Headers:**
- `Authorization: Bearer {token}`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": "video_id",
        "url": "video_url",
        "thumbnail": "thumbnail_url",
        "username": "@username",
        "caption": "Video caption",
        "views": "1.2M",
        "watchedAt": "2 hours ago",
        "duration": "10:34",
        "watchedAtTimestamp": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "hasMore": false
    }
  }
}
```

### POST /history
Add video to watch history.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "videoId": "video_id",
  "watchedDuration": 120 // seconds
}
```

### DELETE /history
Clear watch history.

**Headers:**
- `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "videoIds": ["video_id1", "video_id2"] // Optional, if empty clears all
}
```

---

## Discover & Trending

### GET /discover/trending
Get trending videos.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `timeframe`: `day`, `week`, `month` (default: week)

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [ /* video objects with trending rank */ ],
    "pagination": { /* pagination object */ }
  }
}
```

### GET /discover/creators
Get top creators.

**Query Parameters:**
- `limit`: Number of creators (default: 20)
- `category`: Category filter (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "creators": [
      {
        "id": "user_id",
        "username": "@username",
        "avatar": "avatar_url",
        "followers": "2.4M",
        "isVerified": true,
        "bio": "Creator bio",
        "rank": 1
      }
    ]
  }
}
```

### GET /discover/hashtags
Get trending hashtags.

**Query Parameters:**
- `limit`: Number of hashtags (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "hashtags": [
      {
        "tag": "hashtag",
        "views": "128.5B",
        "growth": "+12%",
        "videosCount": 5000000
      }
    ]
  }
}
```

---

## Data Models

### User
```typescript
{
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatar: string | null;
  bio: string | null;
  website: string | null;
  isVerified: boolean;
  followers: number;
  following: number;
  videos: number;
  likes: number;
  joined: string;
  createdAt: string;
  updatedAt: string;
}
```

### Video
```typescript
{
  id: string;
  url: string;
  thumbnail: string | null;
  title: string;
  description: string | null;
  username: string;
  userId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  hashtags: string[];
  privacy: "public" | "private" | "friends";
  allowComments: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  duration: number; // seconds
  status: "processing" | "ready" | "failed";
  createdAt: string;
  updatedAt: string;
}
```

### Comment
```typescript
{
  id: string;
  videoId: string;
  userId: string;
  username: string;
  text: string;
  likes: number;
  parentId: string | null; // For replies
  replies: Comment[];
  repliesCount: number;
  createdAt: string;
  updatedAt: string;
}
```

### Notification
```typescript
{
  id: string;
  type: "like" | "comment" | "follow" | "reply";
  userId: string;
  username: string;
  action: string;
  comment: string | null;
  videoId: string | null;
  videoThumbnail: string | null;
  read: boolean;
  createdAt: string;
}
```

### Conversation
```typescript
{
  id: string;
  participants: string[]; // User IDs
  lastMessage: string | null;
  unread: number;
  updatedAt: string;
  createdAt: string;
}
```

### Message
```typescript
{
  id: string;
  conversationId: string;
  senderId: string;
  sender: string;
  text: string;
  createdAt: string;
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional details
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data
- `CONFLICT` (409): Resource conflict (e.g., already following)
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

### Status Codes

- `200 OK`: Success
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## Rate Limiting

- **General API**: 100 requests per minute per user
- **Upload**: 10 uploads per hour per user
- **Search**: 30 requests per minute per user
- **Authentication**: 5 attempts per 15 minutes per IP

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

---

## WebSocket Events (Real-time)

### Connection
- Endpoint: `wss://api.loop.com/v1/ws`
- Authentication: Bearer token in query parameter or header

### Events

#### Client → Server
- `message:send`: Send a message
- `typing:start`: User started typing
- `typing:stop`: User stopped typing
- `presence:update`: Update user presence

#### Server → Client
- `message:new`: New message received
- `notification:new`: New notification
- `typing:update`: User typing status update
- `presence:update`: User presence update

---

## File Upload

### Video Upload
- **Max Size**: 500MB
- **Formats**: MP4, MOV, AVI
- **Processing**: Videos are processed asynchronously
- **Status**: Check video status via `GET /videos/:id`

### Image Upload
- **Max Size**: 10MB
- **Formats**: JPEG, PNG, WebP
- **Thumbnails**: Auto-generated if not provided

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (1-indexed)
- `limit`: Items per page (default: 20, max: 100)
- `cursor`: Cursor-based pagination (optional, for infinite scroll)

**Response:**
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true,
    "nextCursor": "cursor_string" // For cursor-based pagination
  }
}
```

---

## Notes

1. All timestamps are in ISO 8601 format (UTC)
2. All IDs are UUIDs (v4)
3. All text fields support Unicode
4. Video processing may take time; check status via video endpoint
5. Real-time features require WebSocket connection
6. File uploads use multipart/form-data
7. All endpoints return JSON except file downloads
8. CORS is enabled for frontend domain
9. API versioning via URL path (`/v1/...`)
10. Authentication tokens expire after 24 hours (configurable)

