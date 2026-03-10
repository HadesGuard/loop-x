import type { Video, Comment, Notification, Conversation, Message } from '@/types/video';
import type {
  ApiVideoResponse,
  ApiCommentResponse,
  ApiUserResponse,
  ApiNotificationResponse,
  ApiConversationResponse,
  ApiMessageResponse,
} from '@/types/api';
import { formatDistanceToNow } from 'date-fns';

// Convert UUID string to number (simple hash for compatibility)
function stringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Transform backend video to frontend video
export function transformVideo(beVideo: ApiVideoResponse, user?: ApiUserResponse): Video {
  return {
    id: stringToNumber(beVideo.id),
    originalId: beVideo.id, // Keep original UUID for API calls
    url: beVideo.url,
    hlsUrl: beVideo.hlsManifestUrl || undefined,
    username: user?.username || beVideo.user?.username || 'unknown',
    caption: beVideo.description || beVideo.title || '',
    views: beVideo.views || 0,
    likes: beVideo.likesCount || 0,
    commentsCount: beVideo.commentsCount || 0,
    thumbnail: beVideo.thumbnailUrl || undefined,
  };
}

// Transform backend comment to frontend comment
export function transformComment(beComment: ApiCommentResponse): Comment {
  const user = beComment.user;
  return {
    id: stringToNumber(beComment.id),
    originalId: beComment.id, // Keep original UUID for API calls
    username: user?.username || 'unknown',
    text: beComment.text,
    likes: beComment.likesCount || 0,
    timestamp: formatDistanceToNow(new Date(beComment.createdAt), { addSuffix: true }),
    replies: beComment.replies?.map(transformComment) || [],
  };
}

// Transform backend notification to frontend notification
export function transformNotification(beNotif: ApiNotificationResponse): Notification {
  const actor = beNotif.actor;
  return {
    id: stringToNumber(beNotif.id),
    type: beNotif.type === 'reply' ? 'comment' : beNotif.type,
    username: actor?.username || 'unknown',
    avatar: actor?.avatarUrl || '',
    action: getActionText(beNotif.type),
    comment: beNotif.comment?.text,
    videoThumbnail: beNotif.video?.thumbnailUrl ?? undefined,
    timestamp: formatDistanceToNow(new Date(beNotif.createdAt), { addSuffix: true }),
    read: beNotif.read,
  };
}

// Transform backend conversation to frontend conversation
export function transformConversation(beConv: ApiConversationResponse): Conversation {
  return {
    id: beConv.id,
    username: beConv.username,
    avatar: beConv.user.avatar || '',
    lastMessage: beConv.lastMessage || '',
    timestamp: beConv.timestamp,
    unread: beConv.unread || 0,
  };
}

// Transform backend message to frontend message
export function transformMessage(beMsg: ApiMessageResponse, currentUserId?: string): Message {
  return {
    id: beMsg.id,
    sender: beMsg.sender?.username || 'unknown',
    text: beMsg.text,
    timestamp: formatDistanceToNow(new Date(beMsg.createdAt), { addSuffix: true }),
    isMine: beMsg.senderId === currentUserId,
  };
}

// Helper to get action text
function getActionText(type: string): string {
  switch (type) {
    case 'like':
      return 'liked your video';
    case 'comment':
      return 'commented on your video';
    case 'reply':
      return 'replied to your comment';
    case 'follow':
      return 'started following you';
    case 'mention':
      return 'mentioned you';
    default:
      return 'interacted with you';
  }
}

