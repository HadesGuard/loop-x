"use client"

import { X, Lock, Eye, UserCheck, Shield } from "lucide-react"
import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface PrivacySettingsData {
  accountPrivacy: "public" | "private"
  showActivityStatus: boolean
  allowMessagesFrom: "everyone" | "following" | "none"
  showProfileInSearch: boolean
  allowDuet: boolean
  allowStitch: boolean
  allowDownload: boolean
  restrictMessages: boolean
}

interface PrivacySettingsModalProps {
  isOpen: boolean
  onClose: () => void
  privacyData: PrivacySettingsData
  onPrivacyDataChange: (data: PrivacySettingsData) => void
  onSave: () => void
}

export function PrivacySettingsModal({
  isOpen,
  onClose,
  privacyData,
  onPrivacyDataChange,
  onSave,
}: PrivacySettingsModalProps) {
  if (!isOpen) return null

  const handleSave = () => {
    onSave()
    toast.success("Privacy settings saved", {
      description: "Your privacy preferences have been updated",
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-neutral-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Privacy Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Account Privacy */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-white/60" />
              <h3 className="text-lg font-semibold text-white">Account Privacy</h3>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-4 bg-neutral-800/50 rounded-lg cursor-pointer hover:bg-neutral-800 transition-colors">
                <input
                  type="radio"
                  name="accountPrivacy"
                  value="public"
                  checked={privacyData.accountPrivacy === "public"}
                  onChange={(e) =>
                    onPrivacyDataChange({ ...privacyData, accountPrivacy: e.target.value as "public" | "private" })
                  }
                  className="w-4 h-4 text-blue-500 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-white font-medium">Public Account</div>
                  <div className="text-sm text-white/60">Anyone can view your videos and follow you</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 bg-neutral-800/50 rounded-lg cursor-pointer hover:bg-neutral-800 transition-colors">
                <input
                  type="radio"
                  name="accountPrivacy"
                  value="private"
                  checked={privacyData.accountPrivacy === "private"}
                  onChange={(e) =>
                    onPrivacyDataChange({ ...privacyData, accountPrivacy: e.target.value as "public" | "private" })
                  }
                  className="w-4 h-4 text-blue-500 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-white font-medium">Private Account</div>
                  <div className="text-sm text-white/60">Only approved followers can view your videos</div>
                </div>
              </label>
            </div>
          </div>

          {/* Activity Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-white/60" />
                <div>
                  <div className="text-white font-medium">Show Activity Status</div>
                  <div className="text-sm text-white/60">Let others see when you're active</div>
                </div>
              </div>
              <Switch
                checked={privacyData.showActivityStatus}
                onCheckedChange={(checked) => onPrivacyDataChange({ ...privacyData, showActivityStatus: checked })}
              />
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-white/60" />
              <h3 className="text-lg font-semibold text-white">Who Can Message You</h3>
            </div>
            <select
              value={privacyData.allowMessagesFrom}
              onChange={(e) =>
                onPrivacyDataChange({
                  ...privacyData,
                  allowMessagesFrom: e.target.value as "everyone" | "following" | "none",
                })
              }
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="everyone">Everyone</option>
              <option value="following">People you follow</option>
              <option value="none">No one</option>
            </select>
          </div>

          {/* Search */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">Show Profile in Search</div>
                <div className="text-sm text-white/60">Allow others to find you by searching</div>
              </div>
              <Switch
                checked={privacyData.showProfileInSearch}
                onCheckedChange={(checked) => onPrivacyDataChange({ ...privacyData, showProfileInSearch: checked })}
              />
            </div>
          </div>

          {/* Video Interactions */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Video Interactions</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Allow Duet</div>
                  <div className="text-sm text-white/60">Let others create duets with your videos</div>
                </div>
                <Switch
                  checked={privacyData.allowDuet}
                  onCheckedChange={(checked) => onPrivacyDataChange({ ...privacyData, allowDuet: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Allow Stitch</div>
                  <div className="text-sm text-white/60">Let others stitch your videos</div>
                </div>
                <Switch
                  checked={privacyData.allowStitch}
                  onCheckedChange={(checked) => onPrivacyDataChange({ ...privacyData, allowStitch: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Allow Download</div>
                  <div className="text-sm text-white/60">Let others download your videos</div>
                </div>
                <Switch
                  checked={privacyData.allowDownload}
                  onCheckedChange={(checked) => onPrivacyDataChange({ ...privacyData, allowDownload: checked })}
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

