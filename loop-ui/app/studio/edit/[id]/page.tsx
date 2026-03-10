"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save, X, Hash, Loader2 } from "lucide-react"
import { api } from "@/lib/api/api"
import { toast } from "sonner"

export default function EditVideoPage() {
  const router = useRouter()
  const params = useParams()
  const videoId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [videoData, setVideoData] = useState({
    title: "",
    description: "",
    thumbnail: "",
    privacy: "public",
    allowComments: true,
    allowDuet: true,
    allowStitch: true,
  })
  const [hashtagInput, setHashtagInput] = useState("")
  const [hashtags, setHashtags] = useState<string[]>([])

  useEffect(() => {
    const loadVideo = async () => {
      try {
        const video = await api.getVideoById(videoId)
        if (video) {
          setVideoData({
            title: video.caption || "",
            description: "",
            thumbnail: video.thumbnail || "",
            privacy: "public",
            allowComments: true,
            allowDuet: true,
            allowStitch: true,
          })
        }
      } catch {
        toast.error("Failed to load video")
      } finally {
        setLoading(false)
      }
    }
    loadVideo()
  }, [videoId])

  const handleSave = async () => {
    if (!videoData.title.trim()) {
      toast.error("Title is required")
      return
    }
    setSaving(true)
    try {
      await api.updateVideo(videoId, {
        title: videoData.title,
        description: videoData.description || undefined,
        privacy: videoData.privacy,
        allowComments: videoData.allowComments,
        allowDuet: videoData.allowDuet,
        allowStitch: videoData.allowStitch,
      })
      toast.success("Video updated successfully")
      router.push("/studio")
    } catch {
      toast.error("Failed to update video")
    } finally {
      setSaving(false)
    }
  }

  const addHashtag = () => {
    const trimmed = hashtagInput.trim()
    if (trimmed && !hashtags.includes(trimmed)) {
      setHashtags([...hashtags, trimmed])
      setHashtagInput("")
    }
  }

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter((t) => t !== tag))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/60" />
      </div>
    )
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
                <h1 className="text-2xl font-bold">Edit Video</h1>
                <p className="text-white/60 text-sm">Update your video details</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/studio")}
                className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 transition-all font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Video Preview */}
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">Video Preview</h3>
              <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden">
                <img
                  src={videoData.thumbnail || "/placeholder.svg"}
                  alt={videoData.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Right Column - Video Details */}
          <div className="space-y-6">
            {/* Title */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={videoData.title}
                onChange={(e) => setVideoData({ ...videoData, title: e.target.value })}
                maxLength={100}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Give your video a title"
              />
              <p className="text-xs text-neutral-400 mt-2">{videoData.title.length}/100</p>
            </div>

            {/* Description */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={videoData.description}
                onChange={(e) => setVideoData({ ...videoData, description: e.target.value })}
                rows={4}
                maxLength={500}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Describe your video"
              />
              <p className="text-xs text-neutral-400 mt-2">{videoData.description.length}/500</p>
            </div>

            {/* Hashtags */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <label className="block text-sm font-medium mb-2">Hashtags</label>
              <div className="flex gap-2 mb-3">
                <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4">
                  <Hash className="w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addHashtag()
                      }
                    }}
                    className="flex-1 bg-transparent py-3 text-white placeholder-neutral-500 focus:outline-none"
                    placeholder="Add hashtag"
                  />
                </div>
                <button
                  onClick={addHashtag}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-all"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag) => (
                  <div key={tag} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-sm group">
                    <span>#{tag}</span>
                    <button
                      onClick={() => removeHashtag(tag)}
                      className="opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <label className="block text-sm font-medium mb-4">Privacy</label>
              <div className="space-y-3">
                {[
                  { value: "public", label: "Public", description: "Everyone can see this video" },
                  { value: "friends", label: "Friends", description: "Only people who follow you" },
                  { value: "private", label: "Private", description: "Only you can see this" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setVideoData({ ...videoData, privacy: option.value })}
                    className={`w-full text-left p-4 rounded-lg transition-all ${
                      videoData.privacy === option.value
                        ? "bg-blue-500/20 border-2 border-blue-500"
                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-neutral-400 mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Interaction Settings */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <label className="block text-sm font-medium mb-4">Allow Others To</label>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/80">Comment</span>
                  <input
                    type="checkbox"
                    checked={videoData.allowComments}
                    onChange={(e) => setVideoData({ ...videoData, allowComments: e.target.checked })}
                    className="w-5 h-5 rounded bg-white/10 border-white/20 text-blue-500 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/80">Duet</span>
                  <input
                    type="checkbox"
                    checked={videoData.allowDuet}
                    onChange={(e) => setVideoData({ ...videoData, allowDuet: e.target.checked })}
                    className="w-5 h-5 rounded bg-white/10 border-white/20 text-blue-500 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/80">Stitch</span>
                  <input
                    type="checkbox"
                    checked={videoData.allowStitch}
                    onChange={(e) => setVideoData({ ...videoData, allowStitch: e.target.checked })}
                    className="w-5 h-5 rounded bg-white/10 border-white/20 text-blue-500 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
