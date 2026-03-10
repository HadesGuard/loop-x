"use client"

import {
  X,
  MoreHorizontal,
  Flag,
  Ban,
  ChevronLeft,
  Grid,
  Heart,
  Bookmark,
  Settings,
  ExternalLink,
  MessageCircle,
  QrCode,
} from "lucide-react"
import type { Video } from "@/types/video"
import { formatViews } from "@/lib/format"

interface ProfileStats {
  videos: number
  followers: number
  following: number
  likes: number
  bio: string
  joined: string
  website: string | null
}

interface ProfileModalProps {
  isOpen: boolean
  selectedProfile: string | null
  currentUser: string
  profileTab: "videos" | "liked" | "saved" | "settings"
  stats: ProfileStats
  userVideos: Video[]
  likedVideos: Video[]
  savedVideos: Video[]
  isBlocked: boolean
  isFollowed: boolean
  onClose: () => void
  onTabChange: (tab: "videos" | "liked" | "saved" | "settings") => void
  onReport: () => void
  onBlock: () => void
  onUnblock: () => void
  onFollow: (e: React.MouseEvent) => void
  onEditProfile: () => void
  onOpenInbox: () => void
  onOpenQRCode: () => void
  onOpenMessage: () => void
  onLogout: () => void
  onOpenEditProfileModal: () => void
  onOpenChangePasswordModal: () => void
  onOpenDeleteAccountModal: () => void
  onOpenPrivacySettingsModal: () => void
  onOpenBlockedUsersModal: () => void
  onOpenNotificationPreferencesModal: () => void
  onOpenLanguageSettingsModal: () => void
}

export function ProfileModal({
  isOpen,
  selectedProfile,
  currentUser,
  profileTab,
  stats,
  userVideos,
  likedVideos,
  savedVideos,
  isBlocked,
  isFollowed,
  onClose,
  onTabChange,
  onReport,
  onBlock,
  onUnblock,
  onFollow,
  onEditProfile,
  onOpenInbox,
  onOpenQRCode,
  onOpenMessage,
  onLogout,
  onOpenEditProfileModal,
  onOpenChangePasswordModal,
  onOpenDeleteAccountModal,
  onOpenPrivacySettingsModal,
  onOpenBlockedUsersModal,
  onOpenNotificationPreferencesModal,
  onOpenLanguageSettingsModal,
}: ProfileModalProps) {
  if (!isOpen || !selectedProfile) return null

  const isOwnProfile = selectedProfile === currentUser

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full h-[90vh] bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-800 rounded-t-3xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-neutral-900/90 backdrop-blur-lg border-b border-neutral-800">
          {isOwnProfile && profileTab === "settings" ? (
            <button
              onClick={() => onTabChange("videos")}
              className="flex items-center gap-2 text-white hover:text-white/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-xl font-semibold">Settings</span>
            </button>
          ) : (
            <h3 className="text-xl font-semibold text-white">{isOwnProfile ? "My Profile" : "Profile"}</h3>
          )}
          <div className="flex items-center gap-2">
            {!isOwnProfile && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                }}
                className="p-2 hover:bg-neutral-800 rounded-full transition-colors relative"
              >
                <MoreHorizontal className="w-5 h-5 text-neutral-400" />
                {/* Quick actions dropdown */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-neutral-800 rounded-lg shadow-lg border border-white/10 overflow-hidden z-50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onReport()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                  >
                    <Flag className="w-4 h-4 text-white/60" />
                    <span className="text-white text-sm">Report</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isBlocked) {
                        onUnblock()
                      } else {
                        onBlock()
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-t border-white/5"
                  >
                    <Ban className="w-4 h-4 text-red-500" />
                    <span className="text-red-500 text-sm">{isBlocked ? "Unblock" : "Block"} User</span>
                  </button>
                </div>
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </div>

        {isOwnProfile && profileTab === "settings" ? (
          // Settings Content
          <div className="p-6 space-y-6 overflow-y-auto h-[calc(90vh-64px)]">
            {/* Account Settings */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Account</h4>
              <div className="space-y-2">
                <button
                  onClick={onOpenEditProfileModal}
                  className="w-full flex items-center justify-between p-4 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <span className="text-white">Edit Profile</span>
                  <ChevronLeft className="w-5 h-5 text-neutral-400 rotate-180" />
                </button>
                <button
                  onClick={onOpenChangePasswordModal}
                  className="w-full flex items-center justify-between p-4 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <span className="text-white">Change Password</span>
                  <ChevronLeft className="w-5 h-5 text-neutral-400 rotate-180" />
                </button>
                <button
                  onClick={onOpenDeleteAccountModal}
                  className="w-full flex items-center justify-between p-4 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <span className="text-white">Manage Account</span>
                  <ChevronLeft className="w-5 h-5 text-neutral-400 rotate-180" />
                </button>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Privacy</h4>
              <div className="space-y-2">
                <button
                  onClick={onOpenPrivacySettingsModal}
                  className="w-full flex items-center justify-between p-4 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <span className="text-white">Privacy Settings</span>
                  <ChevronLeft className="w-5 h-5 text-neutral-400 rotate-180" />
                </button>
                <button
                  onClick={onOpenBlockedUsersModal}
                  className="w-full flex items-center justify-between p-4 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <span className="text-white">Blocked Users</span>
                  <ChevronLeft className="w-5 h-5 text-neutral-400 rotate-180" />
                </button>
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Preferences</h4>
              <div className="space-y-2">
                <button
                  onClick={onOpenNotificationPreferencesModal}
                  className="w-full flex items-center justify-between p-4 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <span className="text-white">Notifications</span>
                  <ChevronLeft className="w-5 h-5 text-neutral-400 rotate-180" />
                </button>
                <button
                  onClick={onOpenLanguageSettingsModal}
                  className="w-full flex items-center justify-between p-4 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <span className="text-white">Language & Region</span>
                  <ChevronLeft className="w-5 h-5 text-neutral-400 rotate-180" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg transition-colors">
                  <span className="text-white">Theme</span>
                  <ChevronLeft className="w-5 h-5 text-neutral-400 rotate-180" />
                </button>
              </div>
            </div>

            {/* About */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">About</h4>
              <div className="space-y-2">
                <button className="w-full flex items-center justify-between p-4 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg transition-colors">
                  <span className="text-white">Help Center</span>
                  <ChevronLeft className="w-5 h-5 text-neutral-400 rotate-180" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg transition-colors">
                  <span className="text-white">Terms of Service</span>
                  <ChevronLeft className="w-5 h-5 text-neutral-400 rotate-180" />
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg transition-colors">
                  <span className="text-white">Privacy Policy</span>
                  <ChevronLeft className="w-5 h-5 text-neutral-400 rotate-180" />
                </button>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="w-full p-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-white font-semibold"
            >
              Logout
            </button>
          </div>
        ) : (
          // Profile Content
          <div className="overflow-y-auto h-[calc(90vh-64px)]">
            {/* Cover gradient */}
            <div className="h-32 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-pink-600/20" />

            {/* Profile info */}
            <div className="px-6 pb-6">
              {/* Avatar */}
              <div className="relative -mt-16 mb-4">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold border-4 border-black"
                  style={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                  }}
                >
                  {selectedProfile.charAt(1).toUpperCase()}
                </div>
              </div>

              <div className="mb-4">
                <h2 className="text-white text-2xl font-bold mb-1">{selectedProfile}</h2>
                <p className="text-white/70 text-sm mb-2 whitespace-pre-line leading-relaxed">{stats.bio}</p>
                {stats.website && (
                  <a
                    href={`https://${stats.website}`}
                    className="text-blue-400 text-sm hover:underline flex items-center gap-1 mb-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {stats.website}
                  </a>
                )}
                <p className="text-white/40 text-xs mb-3">{stats.joined}</p>

                {/* Stats */}
                <div className="flex gap-6 mb-4">
                  <div className="text-center">
                    <div className="text-white font-bold text-lg">{stats.following}</div>
                    <div className="text-white/60 text-xs">Following</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold text-lg">{stats.followers}</div>
                    <div className="text-white/60 text-xs">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-bold text-lg">{stats.likes}</div>
                    <div className="text-white/60 text-xs">Likes</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-6">
                  {isOwnProfile ? (
                    <>
                      <button
                        onClick={onOpenInbox}
                        className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-white font-medium transition-all"
                      >
                        Inbox
                      </button>
                      <button
                        onClick={onOpenEditProfileModal}
                        className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white font-medium transition-colors"
                      >
                        Edit Profile
                      </button>
                      <button
                        onClick={onOpenQRCode}
                        className="p-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white transition-colors"
                      >
                        <QrCode className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onTabChange("settings")}
                        className="p-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white transition-colors"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={onFollow}
                        className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200"
                        style={{
                          backgroundColor: isFollowed ? "rgba(255,255,255,0.1)" : "white",
                          color: isFollowed ? "white" : "black",
                          border: isFollowed ? "1px solid rgba(255,255,255,0.2)" : "none",
                        }}
                      >
                        {isFollowed ? "Following" : "Follow"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenQRCode()
                        }}
                        className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-200"
                      >
                        <QrCode className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenMessage()
                        }}
                        className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-200"
                      >
                        <MessageCircle className="w-4 h-4 text-white" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 border-b border-neutral-800 mb-6">
              <button
                onClick={() => onTabChange("videos")}
                className={`pb-4 px-4 font-medium transition-colors relative ${
                  profileTab === "videos" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Grid className="w-5 h-5 mx-auto mb-1" />
                Videos
                {profileTab === "videos" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
              </button>
              <button
                onClick={() => onTabChange("liked")}
                className={`pb-4 px-4 font-medium transition-colors relative ${
                  profileTab === "liked" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Heart className="w-5 h-5 mx-auto mb-1" />
                Liked
                {profileTab === "liked" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
              </button>
              {isOwnProfile && (
                <>
                  <button
                    onClick={() => onTabChange("saved")}
                    className={`pb-4 px-4 font-medium transition-colors relative ${
                      profileTab === "saved" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    <Bookmark className="w-5 h-5 mx-auto mb-1" />
                    Saved
                    {profileTab === "saved" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
                  </button>
                  <button
                    onClick={() => onTabChange("settings")}
                    className={`pb-4 px-4 font-medium transition-colors relative ${
                      profileTab === "settings" ? "text-white" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    <Settings className="w-5 h-5 mx-auto mb-1" />
                    Settings
                    {profileTab === "settings" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
                  </button>
                </>
              )}
            </div>

            {/* Videos Grid */}
            <div className="px-6 pb-6">
              {profileTab === "videos" ? (
                <div className="grid grid-cols-3 gap-1">
                  {userVideos.map((video) => (
                    <div
                      key={video.id}
                      className="relative aspect-[9/16] bg-gray-900 rounded overflow-hidden group cursor-pointer"
                    >
                      <video src={video.url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <Heart className="w-8 h-8 text-white fill-white" />
                      </div>
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-semibold">
                        <Heart className="w-3 h-3" />
                        {formatViews(video.views)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : profileTab === "liked" ? (
                <div className="grid grid-cols-3 gap-1">
                  {likedVideos.length > 0 ? (
                    likedVideos.map((video) => (
                      <div
                        key={video.id}
                        className="relative aspect-[9/16] bg-gray-900 rounded overflow-hidden group cursor-pointer"
                      >
                        <video src={video.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <Heart className="w-8 h-8 text-white fill-white" />
                        </div>
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-semibold">
                          <Heart className="w-3 h-3" />
                          {formatViews(video.views)}
                        </div>
                        <div className="absolute top-2 right-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
                          @{video.username}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 text-center py-12">
                      <Heart className="w-16 h-16 text-white/20 mx-auto mb-4" />
                      <p className="text-white/40 text-sm">No liked videos yet</p>
                    </div>
                  )}
                </div>
              ) : profileTab === "saved" ? (
                <div className="grid grid-cols-3 gap-1">
                  {savedVideos.length > 0 ? (
                    savedVideos.map((video) => (
                      <div
                        key={video.id}
                        className="relative aspect-[9/16] bg-gray-900 rounded overflow-hidden group cursor-pointer"
                      >
                        <video src={video.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <Bookmark className="w-8 h-8 text-white fill-white" />
                        </div>
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-semibold">
                          <Heart className="w-3 h-3" />
                          {formatViews(video.views)}
                        </div>
                        <div className="absolute top-2 right-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
                          @{video.username}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 text-center py-12">
                      <Bookmark className="w-16 h-16 text-white/20 mx-auto mb-4" />
                      <p className="text-white/40 text-sm">No saved videos yet</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

