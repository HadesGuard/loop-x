"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BottomNavigation } from "@/components/bottom-navigation"
import { NotificationModal } from "@/components/modals/notification-modal"
import { api } from "@/lib/api/api"
import type { Notification, Conversation, Message } from "@/types/video"
import { toast } from "sonner"
import { useWebSocket } from "@/hooks/useWebSocket"

export default function InboxPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showNotifications, setShowNotifications] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState("")

  useEffect(() => {
    const authToken = localStorage.getItem("auth_token")
    setIsAuthenticated(!!authToken)
  }, [])

  // Load notifications and conversations
  useEffect(() => {
    api.getNotifications().then(setNotifications).catch(err => console.error("Error loading notifications:", err))
    api.getConversations().then(setConversations).catch(err => console.error("Error loading conversations:", err))
  }, [])

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      api.getMessages(selectedConversation).then(setMessages).catch(err => console.error("Error loading messages:", err))
    }
  }, [selectedConversation])

  // WebSocket integration for real-time updates
  const { sendMessage: wsSendMessage, startTyping, stopTyping } = useWebSocket({
    enabled: isAuthenticated,
    onNotification: (notification) => {
      setNotifications((prev) => [notification, ...prev])
      toast.info(notification.action, {
        description: `${notification.username} ${notification.action}`,
      })
    },
    onMessage: (message) => {
      // Backend sends message with conversationId
      const msgConversationId = (message as any).conversationId

      if (selectedConversation && msgConversationId === selectedConversation && message.isMine === false) {
        setMessages((prev) => {
          // Avoid duplicates
          const exists = prev.some(m => m.id === message.id)
          return exists ? prev : [...prev, message]
        })
      }
      // Update conversation list
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv.id === msgConversationId) {
            return {
              ...conv,
              lastMessage: message.text,
              timestamp: message.timestamp,
              unread: conv.id === selectedConversation ? 0 : conv.unread + 1,
            }
          }
          return conv
        })
      })
    },
  })

  const sendMessage = async () => {
    if (messageInput.trim() && selectedConversation) {
      try {
        // Send via WebSocket for real-time delivery
        wsSendMessage(selectedConversation, messageInput)
        // Also send via API for persistence
        const newMessage = await api.sendMessage(selectedConversation, messageInput)
        setMessages((prev) => {
          // Avoid duplicates - check if message already exists
          const exists = prev.some(m => m.id === newMessage.id)
          return exists ? prev : [...prev, newMessage]
        })
        setMessageInput("")
        stopTyping(selectedConversation)
      } catch (error) {
        console.error("Error sending message:", error)
        toast.error("Failed to send message", {
          description: error instanceof Error ? error.message : "Please try again",
        })
      }
    }
  }

  // Handle typing indicators
  useEffect(() => {
    if (!messageInput.trim() || !selectedConversation) {
      return
    }

    const typingTimeout = setTimeout(() => {
      startTyping(selectedConversation)
    }, 500)

    return () => {
      clearTimeout(typingTimeout)
      stopTyping(selectedConversation)
    }
  }, [messageInput, selectedConversation, startTyping, stopTyping])

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  const markAsRead = async (id: number) => {
    try {
      await api.markNotificationAsRead(String(id))
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch (error) {
      console.error("Error marking as read:", error)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Notification & Inbox Modal */}
      <NotificationModal
        isOpen={showNotifications}
        notifications={notifications}
        conversations={conversations}
        messages={messages}
        selectedConversation={selectedConversation}
        messageInput={messageInput}
        onClose={() => {
          setShowNotifications(false)
          setSelectedConversation(null)
          // Navigate back when closing
          startTransition(() => {
            router.push("/")
          })
        }}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onSelectConversation={setSelectedConversation}
        onMessageInputChange={setMessageInput}
        onSendMessage={sendMessage}
      />

      {/* Bottom Navigation */}
      <BottomNavigation
        currentPage="inbox"
        onNavigate={(page) => {
          if (page === "profile") {
            startTransition(() => {
              router.push("/")
            })
          } else {
            startTransition(() => {
              router.push(page)
            })
          }
        }}
        isAuthenticated={isAuthenticated}
        unreadCount={unreadCount}
        onNotificationClick={() => setShowNotifications(true)}
      />
    </div>
  )
}


