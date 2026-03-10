# WebSocket API Specifications

## Overview

Real-time communication specifications using WebSocket for messages, notifications, and live updates.

---

## Connection

### Endpoint
```
wss://api.loop.com/v1/ws
```

### Authentication
Include JWT token in connection:
- **Query Parameter**: `?token=jwt_token_here`
- **Or Header**: `Authorization: Bearer jwt_token_here`

### Connection Lifecycle

1. **Connect**: Client establishes WebSocket connection
2. **Authenticate**: Server validates token
3. **Subscribe**: Client subscribes to channels
4. **Receive Events**: Server pushes events to client
5. **Disconnect**: Client or server closes connection

---

## Message Format

### Client → Server
```json
{
  "type": "event_type",
  "payload": { /* event-specific data */ },
  "requestId": "optional_request_id" // For request-response pattern
}
```

### Server → Client
```json
{
  "type": "event_type",
  "payload": { /* event-specific data */ },
  "timestamp": "2024-01-01T00:00:00Z",
  "requestId": "optional_request_id" // Echoed from client request
}
```

### Error Message
```json
{
  "type": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  },
  "requestId": "optional_request_id"
}
```

---

## Events

### Connection Events

#### `connection:established`
Server confirms connection.

**Payload:**
```json
{
  "userId": "user_id",
  "serverTime": "2024-01-01T00:00:00Z"
}
```

#### `connection:error`
Connection error occurred.

**Payload:**
```json
{
  "code": "AUTH_FAILED" | "INVALID_TOKEN" | "RATE_LIMIT",
  "message": "Error message"
}
```

---

### Message Events

#### `message:send` (Client → Server)
Send a message in a conversation.

**Payload:**
```json
{
  "conversationId": "conversation_id",
  "text": "Message text"
}
```

**Response: `message:sent`**
```json
{
  "message": {
    "id": "message_id",
    "conversationId": "conversation_id",
    "senderId": "user_id",
    "text": "Message text",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

#### `message:new` (Server → Client)
New message received.

**Payload:**
```json
{
  "message": {
    "id": "message_id",
    "conversationId": "conversation_id",
    "senderId": "user_id",
    "sender": "@username",
    "text": "Message text",
    "timestamp": "2024-01-01T00:00:00Z",
    "isMine": false
  }
}
```

#### `message:read` (Client → Server)
Mark message as read.

**Payload:**
```json
{
  "conversationId": "conversation_id",
  "messageId": "message_id" // Optional, if not provided marks all as read
}
```

#### `message:typing` (Client → Server)
User is typing.

**Payload:**
```json
{
  "conversationId": "conversation_id",
  "isTyping": true
}
```

#### `typing:update` (Server → Client)
User typing status update.

**Payload:**
```json
{
  "conversationId": "conversation_id",
  "userId": "user_id",
  "username": "@username",
  "isTyping": true
}
```

---

### Notification Events

#### `notification:new` (Server → Client)
New notification received.

**Payload:**
```json
{
  "notification": {
    "id": "notification_id",
    "type": "like" | "comment" | "follow" | "reply" | "mention",
    "username": "@username",
    "action": "liked your video",
    "videoId": "video_id",
    "videoThumbnail": "thumbnail_url",
    "timestamp": "2024-01-01T00:00:00Z",
    "read": false
  }
}
```

#### `notification:read` (Client → Server)
Mark notification as read.

**Payload:**
```json
{
  "notificationId": "notification_id"
}
```

#### `notification:read-all` (Client → Server)
Mark all notifications as read.

**Payload:**
```json
{}
```

---

### Video Events

#### `video:processing:update` (Server → Client)
Video processing status update.

**Payload:**
```json
{
  "videoId": "video_id",
  "status": "processing" | "completed" | "failed",
  "progress": 45, // 0-100
  "stage": "transcoding" | "generating_thumbnails" | "analyzing"
}
```

#### `video:processing:complete` (Server → Client)
Video processing completed.

**Payload:**
```json
{
  "videoId": "video_id",
  "status": "completed",
  "url": "https://cdn.loop.com/videos/video_id.mp4",
  "thumbnail": "https://cdn.loop.com/thumbnails/video_id.jpg"
}
```

#### `video:like` (Server → Client)
Video received a like.

**Payload:**
```json
{
  "videoId": "video_id",
  "userId": "user_id",
  "username": "@username",
  "likesCount": 8201
}
```

#### `video:comment` (Server → Client)
Video received a comment.

**Payload:**
```json
{
  "videoId": "video_id",
  "comment": {
    "id": "comment_id",
    "username": "@username",
    "text": "Comment text",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

---

### Presence Events

#### `presence:update` (Client → Server)
Update user presence.

**Payload:**
```json
{
  "status": "online" | "away" | "offline",
  "lastSeen": "2024-01-01T00:00:00Z"
}
```

#### `presence:update` (Server → Client)
User presence update.

**Payload:**
```json
{
  "userId": "user_id",
  "username": "@username",
  "status": "online" | "away" | "offline",
  "lastSeen": "2024-01-01T00:00:00Z"
}
```

---

### Subscription Events

#### `subscribe` (Client → Server)
Subscribe to a channel.

**Payload:**
```json
{
  "channel": "notifications" | "messages" | "video:video_id" | "user:user_id",
  "conversationId": "conversation_id" // Required for messages channel
}
```

**Response: `subscribed`**
```json
{
  "channel": "notifications",
  "success": true
}
```

#### `unsubscribe` (Client → Server)
Unsubscribe from a channel.

**Payload:**
```json
{
  "channel": "notifications"
}
```

**Response: `unsubscribed`**
```json
{
  "channel": "notifications",
  "success": true
}
```

---

## Channels

### Available Channels

1. **`notifications`**
   - Receive all notifications for user
   - Auto-subscribed on connection

2. **`messages`**
   - Receive messages for all conversations
   - Auto-subscribed on connection

3. **`messages:conversation_id`**
   - Receive messages for specific conversation
   - Subscribe when opening conversation

4. **`video:video_id`**
   - Receive updates for specific video
   - Processing status, likes, comments

5. **`user:user_id`**
   - Receive updates for specific user
   - Presence, activity

---

## Heartbeat

### Keep-Alive

Client should send ping every 30 seconds:
```json
{
  "type": "ping"
}
```

Server responds with pong:
```json
{
  "type": "pong",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

If no ping received for 60 seconds, server closes connection.

---

## Error Handling

### Error Codes

| Code | Description |
|------|-------------|
| `AUTH_FAILED` | Authentication failed |
| `INVALID_TOKEN` | Invalid or expired token |
| `RATE_LIMIT` | Too many requests |
| `INVALID_CHANNEL` | Invalid channel name |
| `PERMISSION_DENIED` | No permission for channel |
| `MESSAGE_TOO_LONG` | Message exceeds length limit |
| `INVALID_PAYLOAD` | Invalid message payload |

### Error Response
```json
{
  "type": "error",
  "error": {
    "code": "AUTH_FAILED",
    "message": "Authentication failed"
  },
  "requestId": "optional_request_id"
}
```

---

## Rate Limiting

- **Messages per second**: 10
- **Subscriptions per minute**: 20
- **Ping interval**: Minimum 10 seconds

---

## Reconnection

### Automatic Reconnection

Client should implement automatic reconnection:
1. Wait 1 second after disconnect
2. Attempt reconnection
3. Exponential backoff (1s, 2s, 4s, 8s, max 30s)
4. Resubscribe to channels
5. Request missed messages/notifications

### Reconnection Payload
```json
{
  "type": "reconnect",
  "lastMessageId": "last_message_id", // Optional, for message sync
  "lastNotificationId": "last_notification_id" // Optional
}
```

---

## Example Flows

### Sending a Message

```javascript
// 1. Subscribe to conversation
ws.send(JSON.stringify({
  type: "subscribe",
  payload: {
    channel: "messages:conversation_123"
  }
}));

// 2. Send message
ws.send(JSON.stringify({
  type: "message:send",
  payload: {
    conversationId: "conversation_123",
    text: "Hello!"
  },
  requestId: "req_1"
}));

// 3. Receive confirmation
// { type: "message:sent", payload: { message: {...} }, requestId: "req_1" }

// 4. Receive message (if other user is online)
// { type: "message:new", payload: { message: {...} } }
```

### Video Processing Updates

```javascript
// 1. Subscribe to video updates
ws.send(JSON.stringify({
  type: "subscribe",
  payload: {
    channel: "video:video_123"
  }
}));

// 2. Receive processing updates
// { type: "video:processing:update", payload: { videoId: "video_123", progress: 45 } }

// 3. Receive completion
// { type: "video:processing:complete", payload: { videoId: "video_123", url: "..." } }
```

---

## Security Considerations

1. **Authentication**: Always require valid JWT token
2. **Authorization**: Verify user permissions for channels
3. **Rate Limiting**: Prevent abuse
4. **Input Validation**: Validate all message payloads
5. **Message Size**: Limit message payload size (max 64KB)
6. **Connection Limits**: Max 5 concurrent connections per user

---

## Implementation Notes

1. **Scalability**: Use Redis Pub/Sub for multi-server deployments
2. **Message Queue**: Queue messages if user is offline
3. **Delivery Guarantee**: At-least-once delivery for critical messages
4. **Ordering**: Maintain message order within conversations
5. **Compression**: Use WebSocket compression (permessage-deflate)

