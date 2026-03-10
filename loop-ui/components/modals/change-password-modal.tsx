"use client"

import { X } from "lucide-react"

interface PasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  passwordData: PasswordData
  onPasswordDataChange: (data: PasswordData) => void
  onSave: () => void
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  passwordData,
  onPasswordDataChange,
  onSave,
}: ChangePasswordModalProps) {
  if (!isOpen) return null

  const isValid =
    passwordData.currentPassword &&
    passwordData.newPassword &&
    passwordData.newPassword === passwordData.confirmPassword &&
    passwordData.newPassword.length >= 8

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-white text-xl font-semibold">Change Password</h2>
          <button
            onClick={() => {
              onPasswordDataChange({ currentPassword: "", newPassword: "", confirmPassword: "" })
              onClose()
            }}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Current Password</label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => onPasswordDataChange({ ...passwordData, currentPassword: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">New Password</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => onPasswordDataChange({ ...passwordData, newPassword: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new password"
            />
            <p className="text-xs text-neutral-400 mt-2">Must be at least 8 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => onPasswordDataChange({ ...passwordData, confirmPassword: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm new password"
            />
          </div>

          {passwordData.newPassword &&
            passwordData.confirmPassword &&
            passwordData.newPassword !== passwordData.confirmPassword && (
              <p className="text-sm text-red-400">Passwords do not match</p>
            )}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={() => {
              onPasswordDataChange({ currentPassword: "", newPassword: "", confirmPassword: "" })
              onClose()
            }}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!isValid}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Change Password
          </button>
        </div>
      </div>
    </div>
  )
}

