"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, X, ImageIcon, Film, Check, AlertCircle, Hash, Globe, Lock, Users } from "lucide-react"
import { useChunkedUpload } from "@/hooks/useChunkedUpload"
import { api } from "@/lib/api/api"

export default function UploadPage() {
  const router = useRouter()
  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [hashtags, setHashtags] = useState("")
  const [privacy, setPrivacy] = useState<"public" | "private" | "friends">("public")
  const [allowComments, setAllowComments] = useState(true)
  const [allowDuet, setAllowDuet] = useState(true)
  const [allowStitch, setAllowStitch] = useState(true)

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview)
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview)
    }
  }, [videoPreview, thumbnailPreview])

  const CHUNKED_UPLOAD_THRESHOLD = 10 * 1024 * 1024 // 10MB
  const { upload: chunkedUpload, progress: chunkedProgress, isUploading: isChunkedUploading, error: chunkedError, cancel: cancelChunkedUpload } = useChunkedUpload()

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("video/")) {
      setSelectedVideo(file)
      const url = URL.createObjectURL(file)
      setVideoPreview(url)
    }
  }

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setSelectedThumbnail(file)
      const url = URL.createObjectURL(file)
      setThumbnailPreview(url)
    }
  }

  const handleUpload = async () => {
    if (!selectedVideo || !title) return

    const metadata = {
      title,
      description: description || undefined,
      privacy,
      allowComments,
      allowDuet,
      allowStitch,
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      if (selectedVideo.size > CHUNKED_UPLOAD_THRESHOLD) {
        // Use chunked upload for large files
        await chunkedUpload(selectedVideo, metadata)
      } else {
        // Use regular upload for small files
        await api.uploadVideo(selectedVideo, metadata)
      }
      setUploadProgress(100)
      setTimeout(() => {
        setUploading(false)
        router.push("/studio")
      }, 1000)
    } catch (err) {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const removeVideo = () => {
    setSelectedVideo(null)
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview)
      setVideoPreview(null)
    }
  }

  const removeThumbnail = () => {
    setSelectedThumbnail(null)
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview)
      setThumbnailPreview(null)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/studio")}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Upload Video</h1>
                <p className="text-white/60 text-sm">Share your content with the world</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(uploading || isChunkedUploading) && selectedVideo && selectedVideo.size > CHUNKED_UPLOAD_THRESHOLD && (
                <button
                  onClick={cancelChunkedUpload}
                  className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all font-semibold text-sm"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleUpload}
                disabled={!selectedVideo || !title || uploading || isChunkedUploading}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading || isChunkedUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {chunkedProgress ? `Uploading ${chunkedProgress.percentage}%` : `Uploading ${uploadProgress}%`}
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Publish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Video & Thumbnail */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Upload */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Film className="w-5 h-5" />
                Video
              </h2>

              {!selectedVideo ? (
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all"
                >
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Select video to upload</h3>
                  <p className="text-white/60 text-sm text-center mb-4">
                    Or drag and drop a file
                    <br />
                    MP4, MOV, AVI (max 500MB)
                  </p>
                  <button className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all font-semibold">
                    Select File
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                    <video src={videoPreview || undefined} className="w-full h-full object-contain" controls />
                    <button
                      onClick={removeVideo}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-5 h-5 text-green-400" />
                    <div className="flex-1">
                      <p className="text-white font-medium">{selectedVideo.name}</p>
                      <p className="text-white/60">{(selectedVideo.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button
                      onClick={() => videoInputRef.current?.click()}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-sm font-medium"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />

              {/* Chunked upload progress bar */}
              {chunkedProgress && chunkedProgress.stage !== 'done' && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">
                      {chunkedProgress.stage === 'initiating' && 'Preparing upload...'}
                      {chunkedProgress.stage === 'uploading' && `Uploading chunk ${chunkedProgress.uploadedChunks}/${chunkedProgress.totalChunks}`}
                      {chunkedProgress.stage === 'completing' && 'Finalizing...'}
                      {chunkedProgress.stage === 'error' && 'Upload failed'}
                    </span>
                    <span className="text-white font-medium">{chunkedProgress.percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        chunkedProgress.stage === 'error' ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                      }`}
                      style={{ width: `${chunkedProgress.percentage}%` }}
                    />
                  </div>
                  {chunkedError && (
                    <p className="text-red-400 text-sm">{chunkedError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Thumbnail Upload */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Thumbnail (Optional)
              </h2>

              {!selectedThumbnail ? (
                <div
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
                    <ImageIcon className="w-6 h-6 text-purple-400" />
                  </div>
                  <p className="text-white/60 text-sm text-center mb-3">Upload a custom thumbnail</p>
                  <button className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-sm font-medium">
                    Select Image
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                    <img src={thumbnailPreview || undefined} alt="Thumbnail" className="w-full h-full object-cover" />
                    <button
                      onClick={removeThumbnail}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-white/60 text-sm">{selectedThumbnail.name}</p>
                    <button
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-sm"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                onChange={handleThumbnailSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Title & Description */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
              <div>
                <label className="text-white font-medium mb-2 block">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your video a catchy title"
                  maxLength={100}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-all"
                />
                <p className="text-white/40 text-xs mt-1">{title.length}/100</p>
              </div>

              <div>
                <label className="text-white font-medium mb-2 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers about your video"
                  maxLength={500}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-all resize-none"
                />
                <p className="text-white/40 text-xs mt-1">{description.length}/500</p>
              </div>

              <div>
                <label className="text-white font-medium mb-2 block flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Hashtags
                </label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#travel #adventure #nature"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-all"
                />
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-semibold mb-3">Privacy</h3>

              <div className="space-y-2">
                <button
                  onClick={() => setPrivacy("public")}
                  className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
                    privacy === "public" ? "bg-white/10 border border-white/20" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <Globe className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">Public</p>
                    <p className="text-white/60 text-xs">Everyone can see this video</p>
                  </div>
                  {privacy === "public" && <Check className="w-5 h-5 text-blue-400" />}
                </button>

                <button
                  onClick={() => setPrivacy("friends")}
                  className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
                    privacy === "friends" ? "bg-white/10 border border-white/20" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">Friends</p>
                    <p className="text-white/60 text-xs">Only your friends can see</p>
                  </div>
                  {privacy === "friends" && <Check className="w-5 h-5 text-blue-400" />}
                </button>

                <button
                  onClick={() => setPrivacy("private")}
                  className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
                    privacy === "private" ? "bg-white/10 border border-white/20" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">Private</p>
                    <p className="text-white/60 text-xs">Only you can see this video</p>
                  </div>
                  {privacy === "private" && <Check className="w-5 h-5 text-blue-400" />}
                </button>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-semibold mb-3">Advanced Settings</h3>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium">Allow Comments</p>
                  <p className="text-white/60 text-xs">Let people comment on your video</p>
                </div>
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => setAllowComments(e.target.checked)}
                  className="w-12 h-6 bg-white/10 rounded-full appearance-none cursor-pointer relative transition-all checked:bg-blue-500 before:content-[''] before:absolute before:w-5 before:h-5 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-all checked:before:left-6"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium">Allow Duet</p>
                  <p className="text-white/60 text-xs">Let others create duets with your video</p>
                </div>
                <input
                  type="checkbox"
                  checked={allowDuet}
                  onChange={(e) => setAllowDuet(e.target.checked)}
                  className="w-12 h-6 bg-white/10 rounded-full appearance-none cursor-pointer relative transition-all checked:bg-blue-500 before:content-[''] before:absolute before:w-5 before:h-5 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-all checked:before:left-6"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium">Allow Stitch</p>
                  <p className="text-white/60 text-xs">Let others stitch your video</p>
                </div>
                <input
                  type="checkbox"
                  checked={allowStitch}
                  onChange={(e) => setAllowStitch(e.target.checked)}
                  className="w-12 h-6 bg-white/10 rounded-full appearance-none cursor-pointer relative transition-all checked:bg-blue-500 before:content-[''] before:absolute before:w-5 before:h-5 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-all checked:before:left-6"
                />
              </label>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-white/80">
                <p className="font-medium mb-1">Video Guidelines</p>
                <p className="text-white/60 text-xs">
                  Make sure your video follows our community guidelines. Videos may be reviewed before publishing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
