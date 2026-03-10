"use client"

import { X } from "lucide-react"

interface EditProfileData {
  displayName: string
  bio: string
  website: string
  instagram: string
  twitter: string
  youtube: string
}

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profileData: EditProfileData
  onProfileDataChange: (data: EditProfileData) => void
  onSave: () => void
}

export function EditProfileModal({
  isOpen,
  onClose,
  profileData,
  onProfileDataChange,
  onSave,
}: EditProfileModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-neutral-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Edit Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Picture */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
              U
            </div>
            <div>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors">
                Change Photo
              </button>
              <p className="text-xs text-neutral-400 mt-2">JPG, PNG. Max size 2MB</p>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Display Name</label>
            <input
              type="text"
              value={profileData.displayName}
              onChange={(e) => onProfileDataChange({ ...profileData, displayName: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your display name"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Username</label>
            <input
              type="text"
              value="current_user"
              disabled
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-neutral-500 cursor-not-allowed"
            />
            <p className="text-xs text-neutral-500 mt-2">Username cannot be changed</p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Bio</label>
            <textarea
              value={profileData.bio}
              onChange={(e) => onProfileDataChange({ ...profileData, bio: e.target.value })}
              rows={4}
              maxLength={150}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Tell people about yourself"
            />
            <p className="text-xs text-neutral-400 mt-2">{profileData.bio.length}/150</p>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Website</label>
            <input
              type="url"
              value={profileData.website}
              onChange={(e) => onProfileDataChange({ ...profileData, website: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://yourwebsite.com"
            />
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-neutral-300">Social Links</h3>

            <div>
              <label className="block text-xs text-neutral-400 mb-2">Instagram</label>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">@</span>
                <input
                  type="text"
                  value={profileData.instagram}
                  onChange={(e) => onProfileDataChange({ ...profileData, instagram: e.target.value })}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="instagram_username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-2">Twitter</label>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">@</span>
                <input
                  type="text"
                  value={profileData.twitter}
                  onChange={(e) => onProfileDataChange({ ...profileData, twitter: e.target.value })}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="twitter_username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-2">YouTube</label>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">@</span>
                <input
                  type="text"
                  value={profileData.youtube}
                  onChange={(e) => onProfileDataChange({ ...profileData, youtube: e.target.value })}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="youtube_channel"
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
            onClick={onSave}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg text-white font-medium transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

