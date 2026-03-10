"use client"

import { X, Copy, Download, ExternalLink, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface ShareModalProps {
  isOpen: boolean
  videoId: number | null
  onClose: () => void
}

export function ShareModal({ isOpen, videoId, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen || !videoId) return null

  const copyLinkToClipboard = async () => {
    const url = `${window.location.origin}/video/${videoId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success("Link copied!", {
        description: "Share this video with your friends",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy link: ", err)
      toast.error("Failed to copy link", {
        description: "Please try again",
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-neutral-900/95 backdrop-blur-lg rounded-t-3xl overflow-hidden animate-slide-up">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Share</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <button
            onClick={copyLinkToClipboard}
            className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              {copied ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5 text-white/60" />
              )}
              <span className="text-white font-medium">{copied ? "Link copied!" : "Copy link"}</span>
            </div>
            <ExternalLink className="w-4 h-4 text-white/40" />
          </button>

          <button className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-white/60" />
              <span className="text-white font-medium">Save video</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
