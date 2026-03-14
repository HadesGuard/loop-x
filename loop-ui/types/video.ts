export interface Video {
  id: number
  originalId?: string // Store original UUID from backend for API calls
  url: string
  hlsUrl?: string
  username: string
  caption: string
  views: number
  likes: number
  commentsCount: number
  sharesCount: number
  duration: number | null
  createdAt: string
  thumbnail?: string
}

export interface Comment {
  id: number
  originalId?: string // Store original UUID from backend for API calls
  username: string
  text: string
  likes: number
  timestamp: string
  replies?: Comment[]
}

export interface Notification {
  id: number
  type: "like" | "comment" | "follow" | "mention"
  username: string
  avatar: string
  action: string
  comment?: string
  videoThumbnail?: string
  timestamp: string
  read: boolean
}

export interface Conversation {
  id: string
  username: string
  avatar: string
  lastMessage: string
  timestamp: string
  unread: number
}

export interface Message {
  id: string
  sender: string
  text: string
  timestamp: string
  isMine: boolean
  conversationId?: string // Optional for WebSocket messages
}

export interface SearchResults {
  users: Array<{
    id: number
    username: string
    avatar: string
    followers: string
    isVerified: boolean
  }>
  videos: Video[]
  hashtags: Array<{
    tag: string
    views: string
  }>
}
