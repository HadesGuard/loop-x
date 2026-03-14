"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  HardDrive,
  Users,
  Video,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { api } from "@/lib/api/api"

interface DashboardStats {
  storage: {
    totalGb: number
    totalBlobs: number
    estimatedCostUsd: number
    expiredVideos: number
  } | null
  reports: {
    total: number
    pending: number
    resolved: number
    dismissed: number
    byType: { video: number; comment: number; user: number }
  } | null
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  href,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
  href?: string
}) {
  const content = (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-white/40">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  )
  if (href) return <Link href={href}>{content}</Link>
  return content
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({ storage: null, reports: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [storageData, reportData] = await Promise.all([
          api.getAdminStorageStats().catch(() => null),
          api.getReportStats().catch(() => null),
        ])

        setStats({
          storage: storageData
            ? {
                totalGb: storageData.summary.totalGb,
                totalBlobs: storageData.summary.totalBlobs,
                estimatedCostUsd: storageData.summary.estimatedCostUsd,
                expiredVideos: storageData.summary.expiredVideos,
              }
            : null,
          reports: reportData
            ? {
                total: reportData.total,
                pending: reportData.byStatus.pending,
                resolved: reportData.byStatus.resolved,
                dismissed: reportData.byStatus.dismissed,
                byType: reportData.byType,
              }
            : null,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load stats")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="text-sm text-white/40 mt-1">Platform overview and key metrics</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Moderation Stats */}
          <section className="mb-6">
            <h3 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">Moderation</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Total Reports"
                value={stats.reports?.total ?? "—"}
                icon={AlertTriangle}
                color="bg-yellow-500/20"
                href="/admin/moderation"
              />
              <StatCard
                label="Pending Review"
                value={stats.reports?.pending ?? "—"}
                sub="Needs attention"
                icon={Clock}
                color="bg-orange-500/20"
                href="/admin/moderation?status=pending"
              />
              <StatCard
                label="Resolved"
                value={stats.reports?.resolved ?? "—"}
                icon={CheckCircle2}
                color="bg-green-500/20"
              />
              <StatCard
                label="Dismissed"
                value={stats.reports?.dismissed ?? "—"}
                icon={XCircle}
                color="bg-white/10"
              />
            </div>
          </section>

          {/* Report type breakdown */}
          {stats.reports && (
            <section className="mb-6">
              <h3 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">Reports by Type</h3>
              <div className="grid grid-cols-3 gap-4">
                <StatCard
                  label="Video Reports"
                  value={stats.reports.byType.video}
                  icon={Video}
                  color="bg-pink-500/20"
                />
                <StatCard
                  label="Comment Reports"
                  value={stats.reports.byType.comment}
                  icon={TrendingUp}
                  color="bg-purple-500/20"
                />
                <StatCard
                  label="User Reports"
                  value={stats.reports.byType.user}
                  icon={Users}
                  color="bg-blue-500/20"
                  href="/admin/users"
                />
              </div>
            </section>
          )}

          {/* Storage Stats */}
          <section className="mb-6">
            <h3 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">Storage (Shelby)</h3>
            {stats.storage ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Total Storage"
                  value={`${stats.storage.totalGb} GB`}
                  icon={HardDrive}
                  color="bg-cyan-500/20"
                />
                <StatCard
                  label="Stored Blobs"
                  value={stats.storage.totalBlobs}
                  sub="Video files on Shelby"
                  icon={Video}
                  color="bg-indigo-500/20"
                />
                <StatCard
                  label="Est. Cost / mo"
                  value={`$${stats.storage.estimatedCostUsd}`}
                  icon={TrendingUp}
                  color="bg-emerald-500/20"
                />
                <StatCard
                  label="Expired Videos"
                  value={stats.storage.expiredVideos}
                  icon={XCircle}
                  color="bg-red-500/20"
                />
              </div>
            ) : (
              <p className="text-sm text-white/30 italic">Storage stats unavailable</p>
            )}
          </section>

          {/* Quick Actions */}
          <section>
            <h3 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">Quick Actions</h3>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/admin/moderation?status=pending"
                className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-lg text-sm hover:bg-orange-500/20 transition-colors"
              >
                Review Pending Reports ({stats.reports?.pending ?? 0})
              </Link>
              <Link
                href="/admin/users"
                className="px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-lg text-sm hover:bg-white/10 transition-colors"
              >
                Manage Users
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
