"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, CheckCircle2, XCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { api } from "@/lib/api/api"
import { toast } from "sonner"

type Report = {
  id: string
  reporterId: string
  reporter: { id: string; username: string; avatarUrl: string | null }
  type: string
  targetId: string
  reason: string
  description: string | null
  status: string
  notes: string | null
  createdAt: string
  reviewedAt: string | null
  reviewedBy: string | null
}

const STATUS_FILTERS = ["all", "pending", "reviewed", "resolved", "dismissed"]
const TYPE_FILTERS = ["all", "video", "comment", "user"]

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-orange-500/20 text-orange-400",
  reviewed: "bg-blue-500/20 text-blue-400",
  resolved: "bg-green-500/20 text-green-400",
  dismissed: "bg-white/10 text-white/40",
}

const TYPE_BADGE: Record<string, string> = {
  video: "bg-pink-500/20 text-pink-400",
  comment: "bg-purple-500/20 text-purple-400",
  user: "bg-cyan-500/20 text-cyan-400",
}

export default function ModerationPage() {
  const searchParams = useSearchParams()
  const [reports, setReports] = useState<Report[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "pending")
  const [typeFilter, setTypeFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [actionModal, setActionModal] = useState<{
    report: Report
    mode: "review" | "action"
  } | null>(null)
  const [actionReason, setActionReason] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("reviewed")
  const [selectedAction, setSelectedAction] = useState("warn")
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.getReports({
        status: statusFilter === "all" ? undefined : statusFilter,
        type: typeFilter === "all" ? undefined : typeFilter,
        page,
        limit: 20,
      })
      setReports(result.reports)
      setPagination(result.pagination)
      setSelected(new Set())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load reports")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, page])

  useEffect(() => { load() }, [load])

  async function handleReview() {
    if (!actionModal) return
    setSubmitting(true)
    try {
      await api.reviewReport(actionModal.report.id, selectedStatus, actionReason || undefined)
      toast.success("Report reviewed")
      setActionModal(null)
      setActionReason("")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to review report")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTakeAction() {
    if (!actionModal) return
    setSubmitting(true)
    try {
      await api.takeReportAction(actionModal.report.id, selectedAction, actionReason)
      toast.success("Action taken successfully")
      setActionModal(null)
      setActionReason("")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to take action")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBulkDismiss() {
    if (selected.size === 0) return
    setSubmitting(true)
    try {
      await Promise.all([...selected].map((id) => api.reviewReport(id, "dismissed")))
      toast.success(`Dismissed ${selected.size} reports`)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to dismiss reports")
    } finally {
      setSubmitting(false)
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === reports.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(reports.map((r) => r.id)))
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Content Moderation</h2>
          <p className="text-sm text-white/40 mt-1">{pagination.total} total reports</p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-white/50" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`px-3 py-1 rounded-md text-xs capitalize transition-colors ${
                statusFilter === s ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(1) }}
              className={`px-3 py-1 rounded-md text-xs capitalize transition-colors ${
                typeFilter === t ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {selected.size > 0 && (
          <button
            onClick={handleBulkDismiss}
            disabled={submitting}
            className="ml-auto px-3 py-1.5 bg-white/5 border border-white/10 text-white/60 rounded-lg text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Dismiss selected ({selected.size})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr className="text-white/40 text-xs uppercase tracking-wider">
              <th className="p-3 text-left w-8">
                <input
                  type="checkbox"
                  checked={selected.size === reports.length && reports.length > 0}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
              <th className="p-3 text-left">Reporter</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Reason</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Date</th>
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
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-white/30">
                  No reports found
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr
                  key={report.id}
                  className="border-b border-white/5 hover:bg-white/3 transition-colors"
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(report.id)}
                      onChange={() => toggleSelect(report.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3">
                    <span className="text-white/70">@{report.reporter.username}</span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[report.type] ?? "bg-white/10 text-white/40"}`}>
                      {report.type}
                    </span>
                  </td>
                  <td className="p-3 max-w-xs">
                    <p className="text-white/70 truncate">{report.reason}</p>
                    {report.description && (
                      <p className="text-white/30 text-xs truncate">{report.description}</p>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[report.status] ?? "bg-white/10 text-white/40"}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="p-3 text-white/40 text-xs whitespace-nowrap">
                    {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setActionModal({ report, mode: "review" }); setSelectedStatus("reviewed"); setActionReason("") }}
                        className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        title="Review"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setActionModal({ report, mode: "action" }); setSelectedAction("warn"); setActionReason("") }}
                        className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-colors"
                        title="Take Action"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await api.reviewReport(report.id, "dismissed")
                            toast.success("Report dismissed")
                            load()
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Failed")
                          }
                        }}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 transition-colors"
                        title="Dismiss"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
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
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} reports)
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

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-white mb-1">
              {actionModal.mode === "review" ? "Review Report" : "Take Action"}
            </h3>
            <p className="text-sm text-white/40 mb-4">
              Report by @{actionModal.report.reporter.username} · {actionModal.report.type} · {actionModal.report.reason}
            </p>

            {actionModal.mode === "review" ? (
              <div className="mb-4">
                <label className="block text-xs text-white/50 mb-2">New Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-xs text-white/50 mb-2">Action</label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="warn">Warn user</option>
                  <option value="remove_content">Remove content</option>
                  <option value="suspend_user">Suspend user</option>
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs text-white/50 mb-2">
                {actionModal.mode === "review" ? "Notes (optional)" : "Reason (required)"}
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
                placeholder={actionModal.mode === "review" ? "Add notes..." : "Explain reason for action..."}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={actionModal.mode === "review" ? handleReview : handleTakeAction}
                disabled={submitting || (actionModal.mode === "action" && !actionReason.trim())}
                className="flex-1 px-4 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
              >
                {submitting ? "Submitting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
