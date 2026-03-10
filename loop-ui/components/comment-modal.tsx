"use client"

import { X, Heart, Send } from "lucide-react"
import { EmptyState } from "@/components/empty-state"

interface Comment {
  id: number
  username: string
  text: string
  likes: number
  timestamp: string
  replies?: Comment[]
}

interface CommentModalProps {
  isOpen: boolean
  onClose: () => void
  comments: Comment[]
  newComment: string
  onNewCommentChange: (value: string) => void
  onAddComment: () => void
  onLikeComment: (id: number) => void
  likedComments: Set<number>
  onReply: (commentId: number, username: string) => void
  replyingTo: number | null
  onCancelReply: () => void
}

export function CommentModal({
  isOpen,
  onClose,
  comments,
  newComment,
  onNewCommentChange,
  onAddComment,
  onLikeComment,
  likedComments,
  onReply,
  replyingTo,
  onCancelReply,
}: CommentModalProps) {
  if (!isOpen) return null

  const replyingToComment = comments.find((c) => c.id === replyingTo)

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end">
      <div className="bg-neutral-900 w-full max-h-[85vh] rounded-t-3xl flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h3 className="text-lg font-semibold text-white">{comments.length} Comments</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <EmptyState type="comments" />
          ) : (
            comments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm">{comment.username[1].toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm">{comment.username}</span>
                    <span className="text-neutral-500 text-xs">{comment.timestamp}</span>
                  </div>
                  <p className="text-white/90 text-sm mt-1">{comment.text}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <button
                      onClick={() => onLikeComment(comment.id)}
                      className="flex items-center gap-1 text-neutral-400 hover:text-pink-500 transition-colors"
                    >
                      <Heart
                        className={`w-4 h-4 ${likedComments.has(comment.id) ? "fill-pink-500 text-pink-500" : ""}`}
                      />
                      <span className="text-xs">{comment.likes}</span>
                    </button>
                    <button
                      onClick={() => onReply(comment.id, comment.username)}
                      className="text-neutral-400 hover:text-white text-xs transition-colors"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>

              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-12 space-y-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-xs">{reply.username[1].toUpperCase()}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold text-xs">{reply.username}</span>
                          <span className="text-neutral-500 text-xs">{reply.timestamp}</span>
                        </div>
                        <p className="text-white/90 text-sm mt-1">{reply.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-neutral-800 bg-neutral-900">
          {replyingTo && (
            <div className="flex items-center justify-between mb-2 p-2 bg-neutral-800 rounded-lg">
              <span className="text-sm text-neutral-400">Replying to @{replyingToComment?.username}</span>
              <button onClick={onCancelReply} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => onNewCommentChange(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-neutral-800 text-white px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-white/20"
              onKeyPress={(e) => e.key === "Enter" && onAddComment()}
            />
            <button
              onClick={onAddComment}
              disabled={!newComment.trim()}
              className="p-3 bg-white text-black rounded-full hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
