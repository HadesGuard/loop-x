"use client"

import { Search, Volume2, VolumeX } from "lucide-react"

interface VideoFeedHeaderProps {
  feedType: "foryou" | "following"
  onFeedTypeChange: (type: "foryou" | "following") => void
  showUI: boolean
  isMuted: boolean
  onToggleMute: () => void
  onOpenSearch: () => void
  videoProgress: number
}

export function VideoFeedHeader({
  feedType,
  onFeedTypeChange,
  showUI,
  isMuted,
  onToggleMute,
  onOpenSearch,
  videoProgress,
}: VideoFeedHeaderProps) {
  return (
    <>
      {/* Header */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 px-6 py-4 transition-all duration-500 ${
          showUI ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => onFeedTypeChange("foryou")}
              className={`text-lg font-semibold transition-all ${
                feedType === "foryou" ? "text-white scale-110" : "text-gray-400"
              }`}
            >
              For You
            </button>
            <button
              onClick={() => onFeedTypeChange("following")}
              className={`text-lg font-semibold transition-all ${
                feedType === "following" ? "text-white scale-110" : "text-gray-400"
              }`}
            >
              Following
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`fixed top-0 left-0 right-0 z-40 transition-opacity duration-300 ${showUI ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
              <div className="flex justify-end items-center p-4 gap-3">
                {/* Search Button */}
                <button
                  onClick={onOpenSearch}
                  className="p-2.5 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-black/30 transition-all"
                >
                  <Search className="w-5 h-5 text-white" />
                </button>

                {/* Mute/Unmute Button */}
                <button
                  onClick={onToggleMute}
                  className="p-2.5 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-black/30 transition-all"
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-30 h-0.5 bg-white/10 transition-opacity duration-500 ${
          showUI ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="h-full bg-white transition-all duration-200" style={{ width: `${videoProgress}%` }} />
      </div>
    </>
  )
}

