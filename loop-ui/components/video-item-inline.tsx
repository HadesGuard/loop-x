"use client"

import React, { useEffect, useRef, useCallback } from "react"
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  Bookmark,
  Share2,
  AlertCircle,
  Music,
  User,
} from "lucide-react"
import type { Video } from "@/types/video"
import { formatViews } from "@/lib/format"

interface VideoItemInlineProps {
  video: Video
  index: number
  videoRefs: React.MutableRefObject<(HTMLVideoElement | null)[]>
  isMuted: boolean
  isPlaying: { [key: number]: boolean }
  videoProgress: { [key: number]: number }
  doubleTapHearts: { [key: number]: boolean }
  showPlaybackControls: { [key: number]: boolean }
  playbackSpeed: { [key: number]: number }
  videoQuality: { [key: number]: string }
  showUI: boolean
  likedVideos: Set<number>
  savedVideos: Set<number>
  followedUsers: Set<string>
  showMoreMenu: number | null
  currentUser: string
  onVideoRef: (index: number, el: HTMLVideoElement | null) => void
  onDoubleTap: (videoId: number) => void
  onToggleLike: (videoId: number) => void
  onOpenComments: (videoId: number) => void
  onToggleSave: (videoId: number) => void
  onOpenShareModal: (videoId: number) => void
  onSetReportTarget: (target: { type: "user" | "video"; identifier: string | number }) => void
  onShowReportModal: (show: boolean) => void
  onSetShowMoreMenu: (id: number | null) => void
  onRequireAuth: (callback: () => void) => void
  onOpenProfile: (username: string) => void
  onToggleFollow: (e: React.MouseEvent, username: string) => void
  onTogglePlayPause: (videoId: number, index: number) => void
  onChangePlaybackSpeed: (videoId: number, index: number, speed: number) => void
  onSeekVideo: (videoId: number, index: number, percentage: number) => void
  onSetVideoProgress: React.Dispatch<React.SetStateAction<{ [key: number]: number }>>
  onSetIsPlaying: React.Dispatch<React.SetStateAction<{ [key: number]: boolean }>>
  onSetVideoQuality: React.Dispatch<React.SetStateAction<{ [key: number]: string }>>
  onSetShowPlaybackControls: React.Dispatch<React.SetStateAction<{ [key: number]: boolean }>>
}

export const VideoItemInline = React.memo(function VideoItemInline({
  video,
  index,
  videoRefs,
  isMuted,
  isPlaying,
  videoProgress,
  doubleTapHearts,
  showPlaybackControls,
  playbackSpeed,
  videoQuality,
  showUI,
  likedVideos,
  savedVideos,
  followedUsers,
  showMoreMenu,
  currentUser,
  onVideoRef,
  onDoubleTap,
  onToggleLike,
  onOpenComments,
  onToggleSave,
  onOpenShareModal,
  onSetReportTarget,
  onShowReportModal,
  onSetShowMoreMenu,
  onRequireAuth,
  onOpenProfile,
  onToggleFollow,
  onTogglePlayPause,
  onChangePlaybackSpeed,
  onSeekVideo,
  onSetVideoProgress,
  onSetIsPlaying,
  onSetVideoQuality,
  onSetShowPlaybackControls,
}: VideoItemInlineProps) {
  const hlsRef = useRef<import("hls.js").default | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)

  const setVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      localVideoRef.current = el
      onVideoRef(index, el)
    },
    [index, onVideoRef]
  )

  // Initialize HLS.js when video has an hlsUrl
  useEffect(() => {
    const videoEl = localVideoRef.current
    if (!videoEl || !video.hlsUrl) return

    // Safari supports HLS natively
    if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
      videoEl.src = video.hlsUrl
      return
    }

    // Dynamically import hls.js for non-Safari browsers
    let hls: import("hls.js").default | null = null

    import("hls.js").then((HlsModule) => {
      const Hls = HlsModule.default
      if (!Hls.isSupported()) {
        videoEl.src = video.url
        return
      }

      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      })
      hlsRef.current = hls
      hls.loadSource(video.hlsUrl!)
      hls.attachMedia(videoEl)
    }).catch(() => {
      videoEl.src = video.url
    })

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [video.hlsUrl, video.url])

  return (
    <div key={`${video.id}-${index}`} className="relative w-full h-screen snap-start snap-always bg-black">
      {/* Video */}
      <video
        ref={setVideoRef}
        id={video.id.toString()}
        src={video.hlsUrl ? undefined : video.url}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        onClick={() => onDoubleTap(video.id)}
        onError={(e) => {
          console.error(`Video ${video.id} load error:`, e)
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

      {doubleTapHearts[video.id] && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <Heart className="w-24 h-24 text-white fill-white animate-like-heart drop-shadow-lg" />
        </div>
      )}

      {showPlaybackControls[video.id] && (
        <div
          className="absolute inset-0 z-30 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center"
          onClick={(e) => {
            e.stopPropagation()
            onSetShowPlaybackControls((prev) => ({ ...prev, [video.id]: false }))
          }}
        >
          {/* Center play/pause button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTogglePlayPause(video.id, index)
            }}
            className="mb-8 w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center hover:bg-white/30 transition-all"
          >
            {isPlaying[video.id] !== false ? (
              <div className="flex gap-1.5">
                <div className="w-1.5 h-8 bg-white rounded-full" />
                <div className="w-1.5 h-8 bg-white rounded-full" />
              </div>
            ) : (
              <div className="w-0 h-0 border-t-[16px] border-t-transparent border-l-[28px] border-l-white border-b-[16px] border-b-transparent ml-2" />
            )}
          </button>

          {/* Bottom control panel */}
          <div className="absolute bottom-24 left-4 right-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-white text-xs">
                <span>
                  {Math.floor(
                    ((videoProgress[video.id] / 100) * (videoRefs.current[index]?.duration || 0)) / 60,
                  )}
                  :
                  {String(
                    Math.floor(
                      ((videoProgress[video.id] / 100) * (videoRefs.current[index]?.duration || 0)) % 60,
                    ),
                  ).padStart(2, "0")}
                </span>
                <span>
                  {Math.floor((videoRefs.current[index]?.duration || 0) / 60)}:
                  {String(Math.floor((videoRefs.current[index]?.duration || 0) % 60)).padStart(2, "0")}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={videoProgress[video.id] || 0}
                onChange={(e) => onSeekVideo(video.id, index, Number(e.target.value))}
                className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-center gap-3">
              {/* Playback speed */}
              <div className="relative group">
                <button className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-lg text-white text-sm font-medium hover:bg-white/30 transition-all border border-white/20">
                  {playbackSpeed[video.id] || 1}x
                </button>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block">
                  <div className="bg-black/90 backdrop-blur-md rounded-lg p-2 space-y-1 border border-white/10 whitespace-nowrap">
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => onChangePlaybackSpeed(video.id, index, speed)}
                        className={`w-full px-3 py-1.5 text-sm rounded transition-colors ${
                          (playbackSpeed[video.id] || 1) === speed
                            ? "bg-white/20 text-white"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Skip backward */}
              <button
                onClick={() => {
                  const videoElement = videoRefs.current[index]
                  if (videoElement) {
                    videoElement.currentTime = Math.max(0, videoElement.currentTime - 10)
                  }
                }}
                className="p-3 bg-white/20 backdrop-blur-md rounded-lg hover:bg-white/30 transition-all border border-white/20"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
                  />
                </svg>
              </button>

              {/* Large play/pause */}
              <button
                onClick={() => onTogglePlayPause(video.id, index)}
                className="p-4 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-all border-2 border-white/20"
              >
                {isPlaying[video.id] !== false ? (
                  <div className="flex gap-1">
                    <div className="w-1 h-6 bg-white rounded-full" />
                    <div className="w-1 h-6 bg-white rounded-full" />
                  </div>
                ) : (
                  <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-1" />
                )}
              </button>

              {/* Skip forward */}
              <button
                onClick={() => {
                  const videoElement = videoRefs.current[index]
                  if (videoElement) {
                    videoElement.currentTime = Math.min(videoElement.duration, videoElement.currentTime + 10)
                  }
                }}
                className="p-3 bg-white/20 backdrop-blur-md rounded-lg hover:bg-white/30 transition-all border border-white/20"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
                  />
                </svg>
              </button>

              {/* Quality selector */}
              <div className="relative group">
                <button className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-lg text-white text-sm font-medium hover:bg-white/30 transition-all border border-white/20">
                  {videoQuality[video.id] || "Auto"}
                </button>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block">
                  <div className="bg-black/90 backdrop-blur-md rounded-lg p-2 space-y-1 border border-white/10 whitespace-nowrap">
                    {["Auto", "1080p", "720p", "480p", "360p"].map((quality) => (
                      <button
                        key={quality}
                        onClick={() => onSetVideoQuality((prev) => ({ ...prev, [video.id]: quality }))}
                        className={`w-full px-3 py-1.5 text-sm rounded transition-colors ${
                          (videoQuality[video.id] || "Auto") === quality
                            ? "bg-white/20 text-white"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {quality}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom info */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 px-4 pb-24 transition-all duration-500 ${
          showUI ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* User info */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpenProfile(video.username)
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            {video.username.charAt(1).toUpperCase()}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpenProfile(video.username)
            }}
            className="text-white font-semibold text-sm hover:underline"
          >
            {video.username}
          </button>
          {!followedUsers.has(video.username) && (
            <button
              onClick={(e) => onToggleFollow(e, video.username)}
              className="px-4 py-1 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all"
            >
              Follow
            </button>
          )}
        </div>

        {/* Caption and music */}
        <div className="space-y-1.5 pointer-events-none">
          <p className="text-white text-sm leading-relaxed">{video.caption}</p>
          <div className="flex items-center gap-1.5 text-white/70 text-xs">
            <Music className="w-3 h-3" />
            <span>Original Audio</span>
          </div>
          <div className="text-white/60 text-xs">{formatViews(video.views)} views</div>
        </div>
      </div>

      {/* Right side actions */}
      <div
        className={`absolute right-3 bottom-32 z-20 flex flex-col gap-5 transition-opacity duration-300 pointer-events-auto ${
          showUI ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleLike(video.id)
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-all hover:scale-110">
            <Heart
              className={`w-6 h-6 transition-all ${
                likedVideos.has(video.id) ? "text-red-500 fill-red-500" : "text-white"
              }`}
            />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{formatViews(video.likes)}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenComments(video.id)
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-all hover:scale-110">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{formatViews(video.commentsCount)}</span>
        </button>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSetShowMoreMenu(showMoreMenu === video.id ? null : video.id)
            }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-11 h-11 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-all hover:scale-110">
              <MoreHorizontal className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs font-semibold drop-shadow">More</span>
          </button>

          {/* More Options Menu */}
          {showMoreMenu === video.id && (
            <div className="absolute right-full mr-3 top-0 w-48 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSave(video.id)
                  onSetShowMoreMenu(null)
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors"
              >
                <Bookmark
                  className={`w-5 h-5 ${
                    savedVideos.has(video.id) ? "text-yellow-400 fill-yellow-400" : "text-white"
                  }`}
                />
                <span className="text-white text-sm">{savedVideos.has(video.id) ? "Unsave" : "Save"}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenShareModal(video.id)
                  onSetShowMoreMenu(null)
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors"
              >
                <Share2 className="w-5 h-5 text-white" />
                <span className="text-white text-sm">Share</span>
              </button>

              <div className="h-px bg-white/10 my-1" />

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSetReportTarget({ type: "video", identifier: video.id })
                  onShowReportModal(true)
                  onSetShowMoreMenu(null)
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors"
              >
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-white text-sm">Report</span>
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => onRequireAuth(() => onOpenProfile(currentUser))}
          className="flex flex-col items-center gap-0.5 pointer-events-auto"
        >
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-white/20 flex items-center justify-center hover:scale-105 transition-all">
            <User className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">Profile</span>
        </button>
      </div>
    </div>
  )
})

