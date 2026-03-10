"use client"

import { X } from "lucide-react"

interface ReportModalProps {
  isOpen: boolean
  reportTarget: { type: "user" | "video"; identifier: string | number } | null
  onClose: () => void
  onReport: (reason: string) => void
}

export function ReportModal({ isOpen, reportTarget, onClose, onReport }: ReportModalProps) {
  if (!isOpen || !reportTarget) return null

  const reasons = [
    "Spam",
    "Harassment or bullying",
    "Hate speech",
    "Violence or dangerous content",
    "Nudity or sexual content",
    "Misinformation",
    "Intellectual property violation",
    "Other",
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-white text-xl font-semibold">Report {reportTarget.type === "user" ? "User" : "Video"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-white/70 text-sm mb-4">Why are you reporting this {reportTarget.type}?</p>

          {reasons.map((reason) => (
            <button
              key={reason}
              onClick={() => onReport(reason)}
              className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"
            >
              {reason}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
