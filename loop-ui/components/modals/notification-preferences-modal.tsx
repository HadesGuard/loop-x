"use client"

import { X, Bell, Heart, MessageCircle, UserPlus, Video, TrendingUp } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface NotificationPreferencesData {
  pushNotifications: boolean
  emailNotifications: boolean
  likes: boolean
  comments: boolean
  mentions: boolean
  followers: boolean
  videoUploads: boolean
  trendingVideos: boolean
  directMessages: boolean
  liveStreams: boolean
}

interface NotificationPreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  notificationData: NotificationPreferencesData
  onNotificationDataChange: (data: NotificationPreferencesData) => void
  onSave: () => void
}

export function NotificationPreferencesModal({
  isOpen,
  onClose,
  notificationData,
  onNotificationDataChange,
  onSave,
}: NotificationPreferencesModalProps) {
  if (!isOpen) return null

  const handleSave = () => {
    onSave()
    toast.success("Notification preferences saved", {
      description: "Your notification settings have been updated",
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-neutral-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Notification Preferences</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* General Settings */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">General</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Push Notifications</div>
                  <div className="text-sm text-white/60">Receive notifications on your device</div>
                </div>
                <Switch
                  checked={notificationData.pushNotifications}
                  onCheckedChange={(checked) =>
                    onNotificationDataChange({ ...notificationData, pushNotifications: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Email Notifications</div>
                  <div className="text-sm text-white/60">Receive notifications via email</div>
                </div>
                <Switch
                  checked={notificationData.emailNotifications}
                  onCheckedChange={(checked) =>
                    onNotificationDataChange({ ...notificationData, emailNotifications: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Interactions */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Interactions</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-white/60" />
                  <div>
                    <div className="text-white font-medium">Likes</div>
                    <div className="text-sm text-white/60">When someone likes your video</div>
                  </div>
                </div>
                <Switch
                  checked={notificationData.likes}
                  onCheckedChange={(checked) => onNotificationDataChange({ ...notificationData, likes: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-white/60" />
                  <div>
                    <div className="text-white font-medium">Comments</div>
                    <div className="text-sm text-white/60">When someone comments on your video</div>
                  </div>
                </div>
                <Switch
                  checked={notificationData.comments}
                  onCheckedChange={(checked) => onNotificationDataChange({ ...notificationData, comments: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5 text-white/60" />
                  <div>
                    <div className="text-white font-medium">Mentions</div>
                    <div className="text-sm text-white/60">When someone mentions you</div>
                  </div>
                </div>
                <Switch
                  checked={notificationData.mentions}
                  onCheckedChange={(checked) => onNotificationDataChange({ ...notificationData, mentions: checked })}
                />
              </div>
            </div>
          </div>

          {/* Social */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Social</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5 text-white/60" />
                  <div>
                    <div className="text-white font-medium">New Followers</div>
                    <div className="text-sm text-white/60">When someone follows you</div>
                  </div>
                </div>
                <Switch
                  checked={notificationData.followers}
                  onCheckedChange={(checked) => onNotificationDataChange({ ...notificationData, followers: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-white/60" />
                  <div>
                    <div className="text-white font-medium">Direct Messages</div>
                    <div className="text-sm text-white/60">When someone sends you a message</div>
                  </div>
                </div>
                <Switch
                  checked={notificationData.directMessages}
                  onCheckedChange={(checked) =>
                    onNotificationDataChange({ ...notificationData, directMessages: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Content</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-white/60" />
                  <div>
                    <div className="text-white font-medium">Video Uploads</div>
                    <div className="text-sm text-white/60">When creators you follow upload videos</div>
                  </div>
                </div>
                <Switch
                  checked={notificationData.videoUploads}
                  onCheckedChange={(checked) =>
                    onNotificationDataChange({ ...notificationData, videoUploads: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-white/60" />
                  <div>
                    <div className="text-white font-medium">Trending Videos</div>
                    <div className="text-sm text-white/60">When videos you might like are trending</div>
                  </div>
                </div>
                <Switch
                  checked={notificationData.trendingVideos}
                  onCheckedChange={(checked) =>
                    onNotificationDataChange({ ...notificationData, trendingVideos: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-white/60" />
                  <div>
                    <div className="text-white font-medium">Live Streams</div>
                    <div className="text-sm text-white/60">When creators you follow go live</div>
                  </div>
                </div>
                <Switch
                  checked={notificationData.liveStreams}
                  onCheckedChange={(checked) =>
                    onNotificationDataChange({ ...notificationData, liveStreams: checked })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-neutral-900 border-t border-white/10 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg text-white font-medium transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

