"use client"

import { X, Ban } from "lucide-react"

interface BlockedUsersModalProps {
  isOpen: boolean
  onClose: () => void
  blockedUsers: Set<string>
  onUnblock: (username: string) => void
}

export function BlockedUsersModal({ isOpen, onClose, blockedUsers, onUnblock }: BlockedUsersModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-white text-xl font-semibold">Blocked Users</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {blockedUsers.size === 0 ? (
            <div className="text-center py-12">
              <Ban className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/60 text-sm">No blocked users</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from(blockedUsers).map((username) => (
                <div key={username} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center text-white font-bold">
                      {username.charAt(1).toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{username}</span>
                  </div>
                  <button
                    onClick={() => onUnblock(username)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

