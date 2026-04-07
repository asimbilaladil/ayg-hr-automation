'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, XCircle, Phone, MapPin, Briefcase, Mail, Calendar } from 'lucide-react'
import { useCandidate } from '@/hooks/useCandidates'
import { AIScoreBadge } from '@/components/candidates/AIScoreBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatDateTime } from '@/lib/utils'

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: candidate, isLoading } = useCandidate(id)

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-48" />
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 rounded" style={{ width: `${50 + i * 8}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <h2 className="text-lg font-semibold text-slate-700">Candidate not found</h2>
        <p className="text-slate-400 text-sm mt-1">The candidate you're looking for doesn't exist.</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    )
  }

  const criteriaMet = candidate.aiCriteriaMet?.split('\n').filter(Boolean) ?? []
  const criteriaMissing = candidate.aiCriteriaMissing?.split('\n').filter(Boolean) ?? []

  return (
    <div className="max-w-3xl space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to candidates
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{candidate.candidateName}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusBadge status={candidate.status} />
              {candidate.aiRecommendation && <StatusBadge status={candidate.aiRecommendation} />}
            </div>
          </div>
          {candidate.aiScore !== undefined && (
            <AIScoreBadge score={candidate.aiScore} size="lg" />
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoItem icon={<Briefcase className="w-4 h-4" />} label="Posting" value={candidate.postingName} />
          <InfoItem icon={<MapPin className="w-4 h-4" />} label="Location" value={candidate.location} />
          {candidate.phone && <InfoItem icon={<Phone className="w-4 h-4" />} label="Phone" value={candidate.phone} />}
          {candidate.dateApplied && (
            <InfoItem icon={<Calendar className="w-4 h-4" />} label="Applied" value={formatDate(candidate.dateApplied)} />
          )}
          <InfoItem
            icon={<Mail className="w-4 h-4" />}
            label="Email ID"
            value={<code className="text-[11px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{candidate.emailId}</code>}
          />
          {candidate.hiringManager && <InfoItem label="Hiring Manager" value={candidate.hiringManager} />}
          {candidate.recruiter && <InfoItem label="Recruiter" value={candidate.recruiter} />}
        </div>
      </div>

      {/* AI Review */}
      {(candidate.aiSummary || candidate.aiScore !== undefined) && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">AI Review</h2>
          {candidate.reviewedAt && (
            <p className="text-xs text-slate-400 mb-4">Reviewed {formatDateTime(candidate.reviewedAt)}</p>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {criteriaMet.length > 0 && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-2">✓ Criteria Met</div>
                <ul className="space-y-1.5">
                  {criteriaMet.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {criteriaMissing.length > 0 && (
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-xs font-semibold text-red-800 uppercase tracking-wide mb-2">✗ Criteria Missing</div>
                <ul className="space-y-1.5">
                  {criteriaMissing.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {candidate.aiSummary && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Summary</div>
              <p className="text-sm text-slate-700 leading-relaxed">{candidate.aiSummary}</p>
            </div>
          )}
        </div>
      )}

      {/* Transcript */}
      {candidate.transcript && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Call Transcript</h2>
          {candidate.called && (
            <p className="text-sm text-slate-500 mb-3">Called: {candidate.called}</p>
          )}
          <div className="bg-slate-900 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
              {candidate.transcript}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({
  label,
  value,
  icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
        {icon && <span className="text-slate-300">{icon}</span>}
        {label}
      </div>
      <div className="text-sm font-medium text-slate-800">{value}</div>
    </div>
  )
}
