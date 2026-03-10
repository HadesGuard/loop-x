"use client"

import { X, Copy, Download } from "lucide-react"

interface QRCodeModalProps {
  isOpen: boolean
  username: string | null
  onClose: () => void
}

export function QRCodeModal({ isOpen, username, onClose }: QRCodeModalProps) {
  if (!isOpen || !username) return null

  const copyProfileLink = () => {
    const profileUrl = `${window.location.origin}/profile/${username}`
    navigator.clipboard.writeText(profileUrl)
    alert("Profile link copied!")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-white/10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-white text-xl font-semibold">Share Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* QR Code */}
        <div className="p-8 flex flex-col items-center">
          {/* Profile Info */}
          <div className="mb-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3 border-4 border-white/10">
              {username.charAt(1).toUpperCase()}
            </div>
            <h3 className="text-white text-lg font-semibold">{username}</h3>
            <p className="text-white/60 text-sm">Scan to follow</p>
          </div>

          {/* QR Code Display */}
          <div className="w-64 h-64 bg-white rounded-2xl p-4 mb-6 shadow-xl">
            <div className="w-full h-full flex items-center justify-center">
              {/* QR Code SVG - simplified placeholder */}
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Top-left corner */}
                <rect x="5" y="5" width="20" height="20" fill="black" />
                <rect x="8" y="8" width="14" height="14" fill="white" />
                <rect x="11" y="11" width="8" height="8" fill="black" />

                {/* Top-right corner */}
                <rect x="75" y="5" width="20" height="20" fill="black" />
                <rect x="78" y="8" width="14" height="14" fill="white" />
                <rect x="81" y="11" width="8" height="8" fill="black" />

                {/* Bottom-left corner */}
                <rect x="5" y="75" width="20" height="20" fill="black" />
                <rect x="8" y="78" width="14" height="14" fill="white" />
                <rect x="11" y="81" width="8" height="8" fill="black" />

                {/* Center pattern - simplified data pattern */}
                {Array.from({ length: 15 }, (_, i) =>
                  Array.from({ length: 15 }, (_, j) => {
                    const shouldShow = (i + j) % 3 === 0 || (i * j) % 5 === 0
                    if (shouldShow && i > 3 && i < 12 && j > 3 && j < 12) {
                      return (
                        <rect
                          key={`${i}-${j}`}
                          x={30 + j * 3}
                          y={30 + i * 3}
                          width="2.5"
                          height="2.5"
                          fill="black"
                        />
                      )
                    }
                    return null
                  }),
                )}
              </svg>
            </div>
          </div>

          {/* Share Actions */}
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={copyProfileLink}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-colors border border-white/10"
            >
              <Copy className="w-4 h-4" />
              Copy Profile Link
            </button>

            <button
              onClick={() => {
                // In a real app, this would generate and download an actual QR code image
                alert("QR Code download would start here")
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg text-white font-medium transition-all"
            >
              <Download className="w-4 h-4" />
              Save QR Code
            </button>
          </div>

          <p className="text-white/40 text-xs mt-4 text-center">Anyone can scan this code to visit your profile</p>
        </div>
      </div>
    </div>
  )
}

