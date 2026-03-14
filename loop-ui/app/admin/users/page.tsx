"use client"

import { useEffect, useState, useCallback } from "react"
import { formatDistanceToNow } from "date-fns"
import { Search, RefreshCw, ChevronLeft, ChevronRight, ShieldCheck, Ban, RotateCcw } from "lucide-react"
import { api } from "@/lib/api/api"
import { toast } from "sonner"

type User = {
  id: string
  username: string
  fullName: string | null
  email: string | null
  avatarUrl: string | null
  role: string
  isActive: boolean
  createdAt: string
  _count?: { videos: number; followers: number; following: number }
}

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-pink-500/20 text-pink-400",
  moderator: "bg-purple-500/20 text-purple-400",
  user: "bg-white/10 text-white/40",
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [page, setPage] = useState(1)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    userId: string
    username: string
    action: "suspend" | "activate" | "promote" | "demote"
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.adminGetUsers({ search: search || undefined, page, limit: 20 })
      setUsers(result.users)
      setPagination(result.pagination)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { load() }, [load])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  async function handleAction() {
    if (!confirmModal) return
    const { userId, action } = confirmModal
    setSubmitting(userId)
    try {
      if (action === "suspend") {
        await api.adminUpdateUser(userId, { isActive: false })
        toast.success("User suspended")
      } else if (action === "activate") {
        await api.adminUpdateUser(userId, { isActive: true })
        toast.success("User activated")
      } else if (action === "promote") {
        await api.adminUpdateUser(userId, { role: "moderator" })
        toast.success("User promoted to moderator")
      } else if (action === "demote") {
        await api.adminUpdateUser(userId, { role: "user" })
        toast.success("User role set to user")
      }
      setConfirmModal(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed")
    } finally {
      setSubmitting(null)
    }
  }

  const actionLabel = {
    suspend: "Suspend",
    activate: "Activate",
    promote: "Promote to Moderator",
    demote: "Remove Moderator Role",
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">User Management</h2>
          <p className="text-sm text-white/40 mt-1">{pagination.total} total users</p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-white/50" />
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by username, email, or name..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-sm text-white hover:bg-white/15 transition-colors"
        >
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(""); setSearchInput(""); setPage(1) }}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/50 hover:bg-white/10 transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr className="text-white/40 text-xs uppercase tracking-wider">
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Content</th>
              <th className="p-3 text-left">Joined</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="p-3">
                      <div className="h-4 bg-white/5 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-white/30">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/40">
                          {user.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">@{user.username}</p>
                        {user.fullName && <p className="text-white/40 text-xs">{user.fullName}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-white/50 text-xs">{user.email ?? "—"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_BADGE[user.role] ?? "bg-white/10 text-white/40"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {user.isActive ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="p-3 text-white/40 text-xs">
                    {user._count && (
                      <span>{user._count.videos} videos · {user._count.followers} followers</span>
                    )}
                  </td>
                  <td className="p-3 text-white/40 text-xs whitespace-nowrap">
                    {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {user.isActive ? (
                        <button
                          onClick={() => setConfirmModal({ userId: user.id, username: user.username, action: "suspend" })}
                          disabled={submitting === user.id}
                          className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          title="Suspend user"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmModal({ userId: user.id, username: user.username, action: "activate" })}
                          disabled={submitting === user.id}
                          className="p-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                          title="Activate user"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {user.role === "user" && (
                        <button
                          onClick={() => setConfirmModal({ userId: user.id, username: user.username, action: "promote" })}
                          disabled={submitting === user.id}
                          className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                          title="Promote to moderator"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {user.role === "moderator" && (
                        <button
                          onClick={() => setConfirmModal({ userId: user.id, username: user.username, action: "demote" })}
                          disabled={submitting === user.id}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 transition-colors disabled:opacity-50"
                          title="Remove moderator role"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-white/40">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} users)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-white mb-2">{actionLabel[confirmModal.action]}</h3>
            <p className="text-sm text-white/50 mb-6">
              Are you sure you want to {confirmModal.action} <span className="text-white font-medium">@{confirmModal.username}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={submitting !== null}
                className="flex-1 px-4 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
              >
                {submitting ? "..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
