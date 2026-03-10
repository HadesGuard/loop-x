"use client"

import { useEffect, useState } from "react"
import { ProfileModal } from "./profile-modal"
import { EditProfileModal } from "./edit-profile-modal"
import { ChangePasswordModal } from "./change-password-modal"
import { DeleteAccountModal } from "./delete-account-modal"
import { BlockedUsersModal } from "./blocked-users-modal"
import { QRCodeModal } from "./qrcode-modal"
import { PrivacySettingsModal } from "./privacy-settings-modal"
import { NotificationPreferencesModal } from "./notification-preferences-modal"
import { LanguageSettingsModal } from "./language-settings-modal"
import { api } from "@/lib/api/api"
import type { Video } from "@/types/video"

interface ProfileStats {
  videos: number
  followers: number
  following: number
  likes: number
  bio: string
  joined: string
  website: string | null
}

interface ProfileModalLoaderProps {
  selectedProfile: string
  currentUser: string
  profileTab: "videos" | "liked" | "saved" | "settings"
  isBlocked: boolean
  isFollowed: boolean
  blockedUsers: Set<string>
  onClose: () => void
  onTabChange: (tab: "videos" | "liked" | "saved" | "settings") => void
  onReport: () => void
  onBlock: () => void
  onUnblock: (username: string) => void
  onFollow: (e: React.MouseEvent) => void
  onEditProfile: () => void
  onOpenInbox: () => void
  onOpenMessage: () => void
  onLogout: () => void
}

export function ProfileModalLoader(props: ProfileModalLoaderProps) {
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [userVideos, setUserVideos] = useState<Video[]>([])
  const [likedVideos, setLikedVideos] = useState<Video[]>([])
  const [savedVideos, setSavedVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  // Profile modals state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [editProfileData, setEditProfileData] = useState({
    displayName: "Current User",
    bio: "🎬 Content creator | 🌍 Traveler | ✨ Dream chaser\n📍 San Francisco, CA",
    website: "mywebsite.com",
    instagram: "",
    twitter: "",
    youtube: "",
  })

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false)
  const [showQRCodeModal, setShowQRCodeModal] = useState(false)
  const [showPrivacySettingsModal, setShowPrivacySettingsModal] = useState(false)
  const [showNotificationPreferencesModal, setShowNotificationPreferencesModal] = useState(false)
  const [showLanguageSettingsModal, setShowLanguageSettingsModal] = useState(false)

  // Privacy settings state
  const [privacyData, setPrivacyData] = useState({
    accountPrivacy: "public" as "public" | "private",
    showActivityStatus: true,
    allowMessagesFrom: "everyone" as "everyone" | "following" | "none",
    showProfileInSearch: true,
    allowDuet: true,
    allowStitch: true,
    allowDownload: false,
    restrictMessages: false,
  })

  // Notification preferences state
  const [notificationData, setNotificationData] = useState({
    pushNotifications: true,
    emailNotifications: true,
    likes: true,
    comments: true,
    mentions: true,
    followers: true,
    videoUploads: false,
    trendingVideos: false,
    directMessages: true,
    liveStreams: false,
  })

  // Language settings state
  const [languageData, setLanguageData] = useState({
    appLanguage: "en",
    contentLanguage: ["en"],
    autoTranslate: false,
  })

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Load user profile and videos
        const [userData, videosData] = await Promise.all([
          api.getUserByUsername(props.selectedProfile),
          api.getUserVideos(props.selectedProfile),
        ])
        
        // Transform user data to stats format
        const statsData: ProfileStats = {
          videos: userData.videosCount || 0,
          followers: userData.followersCount || 0,
          following: userData.followingCount || 0,
          likes: 0, // Not available from backend
          bio: userData.bio || '',
          joined: new Date(userData.createdAt).toLocaleDateString(),
          website: userData.website || null,
        }
        
        setStats(statsData)
        setUserVideos(videosData)
        // Note: getUserLikedVideos and getUserSavedVideos not available in backend yet
        setLikedVideos([])
        setSavedVideos([])
      } catch (error) {
        console.error("Error loading profile data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [props.selectedProfile])

  if (loading || !stats) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
        <div className="w-full h-[90vh] bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-800 rounded-t-3xl overflow-hidden animate-slide-up flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <>
      <ProfileModal
        isOpen={true}
        selectedProfile={props.selectedProfile}
        currentUser={props.currentUser}
        profileTab={props.profileTab}
        stats={stats}
        userVideos={userVideos}
        likedVideos={likedVideos}
        savedVideos={savedVideos}
        isBlocked={props.isBlocked}
        isFollowed={props.isFollowed}
        onClose={props.onClose}
        onTabChange={props.onTabChange}
        onReport={props.onReport}
        onBlock={props.onBlock}
        onUnblock={() => props.onUnblock(props.selectedProfile)}
        onFollow={props.onFollow}
        onEditProfile={props.onEditProfile}
        onOpenInbox={props.onOpenInbox}
        onOpenQRCode={() => setShowQRCodeModal(true)}
        onOpenMessage={props.onOpenMessage}
        onLogout={props.onLogout}
        onOpenEditProfileModal={() => setShowEditProfileModal(true)}
        onOpenChangePasswordModal={() => setShowChangePasswordModal(true)}
        onOpenDeleteAccountModal={() => setShowDeleteAccountModal(true)}
        onOpenPrivacySettingsModal={() => setShowPrivacySettingsModal(true)}
        onOpenBlockedUsersModal={() => setShowBlockedUsersModal(true)}
        onOpenNotificationPreferencesModal={() => setShowNotificationPreferencesModal(true)}
        onOpenLanguageSettingsModal={() => setShowLanguageSettingsModal(true)}
      />

      {/* Profile-related modals */}
      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        profileData={editProfileData}
        onProfileDataChange={setEditProfileData}
        onSave={() => {
          // Save profile changes
          setShowEditProfileModal(false)
        }}
      />

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => {
          setShowChangePasswordModal(false)
          setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
        }}
        passwordData={passwordData}
        onPasswordDataChange={setPasswordData}
        onSave={() => {
          if (passwordData.newPassword === passwordData.confirmPassword && passwordData.newPassword.length >= 8) {
            alert("Password changed successfully!")
            setShowChangePasswordModal(false)
            setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
          }
        }}
      />

      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={() => {
          alert("Account deleted. You will be logged out.")
          props.onLogout()
        }}
      />

      <BlockedUsersModal
        isOpen={showBlockedUsersModal}
        onClose={() => setShowBlockedUsersModal(false)}
        blockedUsers={props.blockedUsers}
        onUnblock={props.onUnblock}
      />

      <QRCodeModal
        isOpen={showQRCodeModal}
        username={props.selectedProfile}
        onClose={() => setShowQRCodeModal(false)}
      />

      <PrivacySettingsModal
        isOpen={showPrivacySettingsModal}
        onClose={() => setShowPrivacySettingsModal(false)}
        privacyData={privacyData}
        onPrivacyDataChange={setPrivacyData}
        onSave={() => {
          // Save privacy settings
          setShowPrivacySettingsModal(false)
        }}
      />

      <NotificationPreferencesModal
        isOpen={showNotificationPreferencesModal}
        onClose={() => setShowNotificationPreferencesModal(false)}
        notificationData={notificationData}
        onNotificationDataChange={setNotificationData}
        onSave={() => {
          // Save notification preferences
          setShowNotificationPreferencesModal(false)
        }}
      />

      <LanguageSettingsModal
        isOpen={showLanguageSettingsModal}
        onClose={() => setShowLanguageSettingsModal(false)}
        languageData={languageData}
        onLanguageDataChange={setLanguageData}
        onSave={() => {
          // Save language settings
          setShowLanguageSettingsModal(false)
        }}
      />
    </>
  )
}

