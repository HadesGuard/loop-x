"use client"

import { useState, useEffect } from "react"
import type { Conversation, Message } from "@/types/video"
import { api } from "@/lib/api/api"
import { toast } from "sonner"

export function useMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState("")

  // Load conversations on mount
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    if (!token) return

    api
      .getConversations()
      .then(setConversations)
      .catch((error) => console.error("Error loading conversations:", error))
  }, [])

  // Load messages when conversation is selected
  useEffect(() => {
    let ignore = false
    if (selectedConversation) {
      api
        .getMessages(selectedConversation)
        .then((msgs) => {
          if (!ignore) setMessages(msgs)
        })
        .catch((error) => {
          if (!ignore) console.error("Error loading messages:", error)
        })
    }
    return () => {
      ignore = true
    }
  }, [selectedConversation])

  const sendMessage = async () => {
    if (messageInput.trim() && selectedConversation) {
      try {
        const newMessage = await api.sendMessage(selectedConversation, messageInput)
        setMessages((prev) => [...prev, newMessage])
        setMessageInput("")
      } catch (error) {
        console.error("Error sending message:", error)
        toast.error("Failed to send message")
      }
    }
  }

  // Handlers for WebSocket updates
  const handleIncomingMessage = (message: Message) => {
    const msgConversationId = message.conversationId
    if (selectedConversation && msgConversationId === selectedConversation) {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === message.id)
        return exists ? prev : [...prev, message]
      })
    }
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === msgConversationId) {
          return {
            ...conv,
            lastMessage: message.text,
            timestamp: message.timestamp,
            unread: conv.id === selectedConversation ? 0 : conv.unread + 1,
          }
        }
        return conv
      }),
    )
  }

  return {
    conversations,
    messages,
    selectedConversation,
    setSelectedConversation,
    messageInput,
    setMessageInput,
    sendMessage,
    handleIncomingMessage,
  }
}
