"use client"

import { AlertCircle } from "lucide-react"

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteAccountModal({ isOpen, onClose, onConfirm }: DeleteAccountModalProps) {
  if (!isOpen) return null

  const handleDelete = () => {
    const input = document.getElementById("deleteConfirm") as HTMLInputElement
    if (input?.value === "DELETE") {
      onConfirm()
      onClose()
    } else {
      alert("Please type DELETE to confirm")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-white text-xl font-semibold">Delete Account</h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-semibold mb-1">This action cannot be undone</p>
              <p className="text-white/70 text-sm">
                Deleting your account will permanently remove all your videos, comments, and profile data.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Type "DELETE" to confirm</label>
            <input
              type="text"
              id="deleteConfirm"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Type DELETE"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}

