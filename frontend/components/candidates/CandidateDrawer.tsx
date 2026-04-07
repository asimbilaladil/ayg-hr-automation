'use client'

import { X, Phone, MapPin, Briefcase, Mail, Check, XCircle, Calendar, Edit2, Trash2, ChevronDown } from 'lucide-react'
import { Candidate, CandidateStatus } from '@/types'
import { AIScoreBadge } from './AIScoreBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatDateTime } from '@/lib/utils'
import { useUpdateCandidate, useDeleteCandidate } from '@/hooks/useCandidates'
import { useIsAdmin, RoleGuard } from '@/components/shared/RoleGuard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Props = {
  candidate: Candidate | null
  open: boolean
  onClose: () => void
}

const statusOptions: { value: CandidateStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'called', label: 'Called' },
  { value: 'not_found', label: 'Not Found' },
  { value: 'processed_no_resume', label: 'No Resume' },
]

export function CandidateDrawer({ candidate, open, onClose }: Props) {
  const updateCandidate = useUpdateCandidate()
  const deleteCandidate = useDeleteCandidate()
  const isAdmin = useIsAdmin()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!candidate) return null

  const handleStatusChange = async (status: CandidateStatus) => {
    try {
      await updateCandidate.mutateAsync({ id: candidate.id, data: { status } })
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteCandidate.mutateAsync(candidate.id)
      toast.success('Candidate deleted')
      setConfirmDelete(false)
      onClose()
    } catch {
      toast.error('Failed to delete candidate')
    }
  }

  const criteriaMet = candidate.aiCriteriaMet?.split('\n').filter(Boolean) ?? []
  const criteriaMissing = candidate.aiCriteriaMissing?.split('\n').filter(Boolean) ?? []

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl transition-transform duration-300 flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">{candidate.candidateName}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={candidate.status} />
              {candidate.aiRecommendation && (
                <StatusBadge status={candidate.aiRecommendation} />
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Basic info */}
          <div className="p-6 border-b border-slate-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-slate-500">Posting</div>
                  <div className="text-sm font-medium text-slate-800">{candidate.postingName}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-slate-500">Location</div>
                  <div className="text-sm font-medium text-slate-800">{candidate.location}</div>
                </div>
              </div>
              {candidate.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-slate-500">Phone</div>
                    <div className="text-sm font-medium text-slate-800">{candidate.phone}</div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-slate-500">Email ID</div>
                  <code className="text-[11px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {candidate.emailId}
                  </code>
                </div>
              </div>
              {candidate.hiringManager && (
                <div>
                  <div className="text-xs text-slate-500">Hiring Manager</div>
                  <div className="text-sm font-medium text-slate-800">{candidate.hiringManager}</div>
                </div>
              )}
              {candidate.recruiter && (
                <div>
                  <div className="text-xs text-slate-500">Recruiter</div>
                  <div className="text-sm font-medium text-slate-800">{candidate.recruiter}</div>
                </div>
              )}
              {candidate.dateApplied && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-slate-500">Applied</div>
                    <div className="text-sm font-medium text-slate-800">{formatDate(candidate.dateApplied)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Status change */}
            <RoleGuard allowedRoles={['ADMIN', 'HR']}>
              <div className="pt-2">
                <label className="text-xs text-slate-500 mb-1.5 block">Change Status</label>
                <div className="relative">
                  <select
                    value={candidate.status}
                    onChange={(e) => handleStatusChange(e.target.value as CandidateStatus)}
                    className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none"
                  >
                    {statusOptions.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </RoleGuard>
          </div>

          {/* AI Review */}
          {(candidate.aiScore !== undefined || candidate.aiSummary) && (
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">AI Review</h3>
              <div className="flex items-center gap-4 mb-4">
                <AIScoreBadge score={candidate.aiScore} size="lg" />
                <div>
                  <div className="text-xs text-slate-500 mb-1">Score</div>
                  {candidate.aiRecommendation && (
                    <StatusBadge status={candidate.aiRecommendation} />
                  )}
                </div>
                {candidate.reviewedAt && (
                  <div className="ml-auto text-right">
                    <div className="text-xs text-slate-400">Reviewed at</div>
                    <div className="text-xs text-slate-600">{formatDateTime(candidate.reviewedAt)}</div>
                  </div>
                )}
              </div>

              {criteriaMet.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-green-700 mb-2">Criteria Met</div>
                  <ul className="space-y-1">
                    {criteriaMet.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {criteriaMissing.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-red-700 mb-2">Criteria Missing</div>
                  <ul className="space-y-1">
                    {criteriaMissing.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {candidate.aiSummary && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs font-medium text-slate-600 mb-1">Summary</div>
                  <p className="text-xs text-slate-700 leading-relaxed">{candidate.aiSummary}</p>
                </div>
              )}
            </div>
          )}

          {/* Call / Transcript */}
          {(candidate.called || candidate.transcript) && (
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Call Record</h3>
              {candidate.called && (
                <div className="flex items-center gap-2 mb-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700">{candidate.called}</span>
                </div>
              )}
              {candidate.transcript && (
                <div>
                  <div className="text-xs font-medium text-slate-600 mb-1.5">Transcript</div>
                  <div className="bg-slate-900 rounded-lg p-3 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {candidate.transcript}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white">
          <div className="text-xs text-slate-400">
            Created {formatDate(candidate.createdAt)}
          </div>
          <div className="flex items-center gap-2">
            <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'HR']}>
              <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
            </RoleGuard>
            <RoleGuard allowedRoles={['ADMIN']}>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </RoleGuard>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Candidate"
        description={`Are you sure you want to delete ${candidate.candidateName}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deleteCandidate.isPending}
      />
    </>
  )
}
