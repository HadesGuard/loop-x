"use client"

import { X, Bell, MessageCircle, Send } from "lucide-react"
import { useState } from "react"
import type { Notification, Conversation, Message } from "@/types/video"
import { EmptyState } from "@/components/empty-state"

interface NotificationModalProps {
  isOpen: boolean
  notifications: Notification[]
  conversations: Conversation[]
  messages: Message[]
  selectedConversation: string | null
  messageInput: string
  onClose: () => void
  onMarkAsRead: (id: number) => void
  onMarkAllAsRead: () => void
  onSelectConversation: (id: string) => void
  onMessageInputChange: (value: string) => void
  onSendMessage: () => void
}

export function NotificationModal({
  isOpen,
  notifications,
  conversations,
  messages,
  selectedConversation,
  messageInput,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectConversation,
  onMessageInputChange,
  onSendMessage,
}: NotificationModalProps) {
  const [activeTab, setActiveTab] = useState<"notifications" | "messages">("notifications")

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md h-[80vh] bg-neutral-900/95 backdrop-blur-lg rounded-t-3xl overflow-hidden animate-slide-up flex flex-col">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <h3 className="text-xl font-semibold text-white">
            {activeTab === "notifications" ? "Notifications" : "Messages"}
          </h3>
          <div className="flex items-center gap-2">
            {activeTab === "notifications" && (
              <button
                onClick={onMarkAllAsRead}
                className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "notifications"
                ? "text-white border-b-2 border-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </div>
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "messages"
                ? "text-white border-b-2 border-white"
                : "text-white/60 hover:text-white"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Messages
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === "notifications" ? (
            <div className="p-4">
              {notifications.length === 0 ? (
                <EmptyState type="notifications" />
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => !notification.read && onMarkAsRead(notification.id)}
                      className={`w-full flex items-start gap-3 p-4 rounded-lg transition-all ${
                        notification.read ? "bg-white/5" : "bg-blue-500/10 border border-blue-500/20"
                      } hover:bg-white/10`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {notification.avatar}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white text-sm">
                          <span className="font-semibold">@{notification.username}</span>{" "}
                          <span className="text-white/70">{notification.action}</span>
                        </p>
                        {notification.comment && <p className="text-white/60 text-sm mt-1">{notification.comment}</p>}
                        <p className="text-white/40 text-xs mt-1">{notification.timestamp}</p>
                      </div>
                      {notification.videoThumbnail && (
                        <img
                          src={notification.videoThumbnail || "/placeholder.svg"}
                          alt="Video thumbnail"
                          className="w-12 h-16 rounded object-cover flex-shrink-0"
                        />
                      )}
                      {!notification.read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {!selectedConversation ? (
                <div className="flex-1 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <EmptyState type="messages" />
                  ) : (
                    conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-white/5 border-b border-white/5 transition-colors"
                    >
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                          {conv.avatar}
                        </div>
                        {conv.unread > 0 && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {conv.unread}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-semibold">@{conv.username}</span>
                          <span className="text-white/40 text-xs">{conv.timestamp}</span>
                        </div>
                        <p className="text-white/60 text-sm truncate">{conv.lastMessage}</p>
                      </div>
                    </button>
                    ))
                  )}
                </div>
              ) : (
                <>
                  <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => onSelectConversation(null!)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-white rotate-180" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {conversations.find((c) => c.id === selectedConversation)?.avatar || "T"}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">
                        @{conversations.find((c) => c.id === selectedConversation)?.username || "user"}
                      </h3>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <EmptyState type="messages" title="No messages yet" description="Start the conversation!" />
                    ) : (
                      messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            msg.isMine ? "bg-blue-500 text-white" : "bg-white/10 text-white"
                          }`}
                        >
                          <p className="text-sm">{msg.text}</p>
                          <p className={`text-xs mt-1 ${msg.isMine ? "text-white/70" : "text-white/50"}`}>
                            {msg.timestamp}
                          </p>
                        </div>
                      </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 border-t border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => onMessageInputChange(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            onSendMessage()
                          }
                        }}
                      />
                      <button
                        onClick={onSendMessage}
                        className="p-2.5 bg-blue-500 hover:bg-blue-600 rounded-full transition-colors"
                      >
                        <Send className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
