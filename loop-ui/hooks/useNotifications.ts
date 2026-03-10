"use client"

import { useState, useEffect } from "react"
import type { Notification } from "@/types/video"
import { api } from "@/lib/api/api"

export function useNotifications() {
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    if (!token) return

    api
      .getNotifications()
      .then(setNotifications)
      .catch((error) => console.error("Error loading notifications:", error))
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

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

  const handleIncomingNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev])
  }

  return {
    showNotifications,
    setShowNotifications,
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    handleIncomingNotification,
  }
}
