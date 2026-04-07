'use client'

import Link from 'next/link'
import {
  Users, Clock, CheckCircle, CalendarDays,
  ArrowRight, TrendingUp,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useDashboardStats } from '@/hooks/useCandidates'
import { AIScoreBadge } from '@/components/candidates/AIScoreBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import { Candidate } from '@/types'

const PIE_COLORS = {
  ACCEPT: '#22c55e',
  MAYBE: '#eab308',
  REJECT: '#ef4444',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#94a3b8',
  reviewed: '#3b82f6',
  called: '#a855f7',
  not_found: '#6b7280',
  processed_no_resume: '#f97316',
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats()

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Candidates"
          value={stats?.totalCandidates}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          isLoading={isLoading}
        />
        <StatCard
          label="Pending Review"
          value={stats?.pendingReview}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
          isLoading={isLoading}
        />
        <StatCard
          label="Accepted"
          value={stats?.accepted}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          isLoading={isLoading}
        />
        <StatCard
          label="Appointments This Week"
          value={stats?.appointmentsThisWeek}
          icon={<CalendarDays className="w-5 h-5" />}
          color="purple"
          isLoading={isLoading}
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Candidates by status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Candidates by Status</h3>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.candidatesByStatus ?? []} barSize={28}>
                <XAxis dataKey="status" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {(stats?.candidatesByStatus ?? []).map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] ?? '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* AI Recommendation breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">AI Recommendations</h3>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats?.aiRecommendationBreakdown ?? []}
                  dataKey="count"
                  nameKey="recommendation"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ recommendation, percent }) =>
                    `${recommendation} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {(stats?.aiRecommendationBreakdown ?? []).map((entry, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[entry.recommendation as keyof typeof PIE_COLORS] ?? '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Candidates by location */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">By Location</h3>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={stats?.candidatesByLocation ?? []}
                layout="vertical"
                barSize={16}
                margin={{ left: 8 }}
              >
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="location" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent candidates + Quick actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent candidates table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Recent Candidates</h3>
            <Link
              href="/candidates"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-4">
                    <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                    <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse ml-auto" />
                  </div>
                ))
              : (stats?.recentCandidates ?? []).map((c: Candidate) => (
                  <Link
                    key={c.id}
                    href={`/candidates/${c.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{c.candidateName}</div>
                      <div className="text-xs text-slate-400 truncate">{c.postingName}</div>
                    </div>
                    <StatusBadge status={c.status} />
                    <AIScoreBadge score={c.aiScore} />
                    <div className="text-xs text-slate-400 w-20 text-right">{formatDate(c.createdAt)}</div>
                  </Link>
                ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <QuickAction
              href="/candidates?status=pending"
              icon="⏳"
              label="View Pending Candidates"
              description={`${stats?.pendingReview ?? 0} awaiting review`}
            />
            <QuickAction
              href="/appointments?date=today"
              icon="📅"
              label="Today's Appointments"
              description="View today's schedule"
            />
            <QuickAction
              href="/candidates?aiRecommendation=ACCEPT"
              icon="✅"
              label="Accepted Candidates"
              description={`${stats?.accepted ?? 0} candidates`}
            />
            <QuickAction
              href="/availability"
              icon="🕐"
              label="Manage Availability"
              description="Update time slots"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  color,
  isLoading,
}: {
  label: string
  value?: number
  icon: React.ReactNode
  color: 'blue' | 'amber' | 'green' | 'purple'
  isLoading?: boolean
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-7 w-16 bg-slate-100 rounded animate-pulse" />
          <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <div className="text-2xl font-bold text-slate-900">{value?.toLocaleString() ?? '—'}</div>
          <div className="text-xs text-slate-500 mt-0.5">{label}</div>
        </>
      )}
    </div>
  )
}

function QuickAction({
  href,
  icon,
  label,
  description,
}: {
  href: string
  icon: string
  label: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
    >
      <span className="text-xl w-8 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
          {label}
        </div>
        <div className="text-xs text-slate-400">{description}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
    </Link>
  )
}

function ChartSkeleton() {
  return (
    <div className="h-[200px] flex items-end gap-2 px-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-slate-100 rounded-t animate-pulse"
          style={{ height: `${30 + Math.random() * 60}%` }}
        />
      ))}
    </div>
  )
}
