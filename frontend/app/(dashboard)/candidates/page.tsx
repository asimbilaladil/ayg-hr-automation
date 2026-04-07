'use client'

import { useState } from 'react'
import { Plus, Download, Trash2 } from 'lucide-react'
import { useCandidates, useDeleteCandidate, useBulkDeleteCandidates } from '@/hooks/useCandidates'
import { CandidatesTable } from '@/components/candidates/CandidatesTable'
import { CandidateFilters } from '@/components/candidates/CandidateFilters'
import { CandidateDrawer } from '@/components/candidates/CandidateDrawer'
import { AddCandidateModal } from '@/components/candidates/AddCandidateModal'
import { Pagination } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RoleGuard, useIsAdmin } from '@/components/shared/RoleGuard'
import { Candidate, CandidateFilters as FilterType } from '@/types'
import { downloadCSV } from '@/lib/utils'
import { toast } from 'sonner'

const DEFAULT_FILTERS: FilterType = {
  page: 1,
  limit: 20,
  search: '',
  status: '',
  aiRecommendation: '',
  location: '',
  postingName: '',
}

export default function CandidatesPage() {
  const [filters, setFilters] = useState<FilterType>(DEFAULT_FILTERS)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const isAdmin = useIsAdmin()
  const { data, isLoading } = useCandidates(filters)
  const deleteCandidate = useDeleteCandidate()
  const bulkDelete = useBulkDeleteCandidates()

  const candidates = data?.data ?? []
  const total = data?.total ?? 0

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k])
  const selectedCount = selectedIds.length

  const handleRowClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate)
    setDrawerOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteCandidate.mutateAsync(deleteId)
      toast.success('Candidate deleted')
      setDeleteId(null)
    } catch {
      toast.error('Failed to delete candidate')
    }
  }

  const handleBulkDelete = async () => {
    try {
      await bulkDelete.mutateAsync(selectedIds)
      toast.success(`${selectedCount} candidates deleted`)
      setRowSelection({})
      setBulkDeleteOpen(false)
    } catch {
      toast.error('Bulk delete failed')
    }
  }

  const handleExport = () => {
    downloadCSV(
      candidates.map((c) => ({
        Name: c.candidateName,
        Posting: c.postingName,
        Location: c.location,
        Phone: c.phone ?? '',
        Status: c.status,
        'AI Score': c.aiScore ?? '',
        'AI Recommendation': c.aiRecommendation ?? '',
        'Date Applied': c.dateApplied ?? '',
        'Hiring Manager': c.hiringManager ?? '',
        Recruiter: c.recruiter ?? '',
      })),
      'candidates-export'
    )
    toast.success('CSV exported')
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm text-slate-500">
            {total.toLocaleString()} candidates total
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && isAdmin && (
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete {selectedCount} selected
            </button>
          )}
          <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </RoleGuard>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Candidate
          </button>
        </div>
      </div>

      {/* Filters */}
      <CandidateFilters
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <CandidatesTable
          data={candidates}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          onDelete={(id) => setDeleteId(id)}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
        />
        {total > 0 && (
          <Pagination
            page={filters.page ?? 1}
            total={total}
            limit={filters.limit ?? 20}
            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
          />
        )}
      </div>

      {/* Drawer */}
      <CandidateDrawer
        candidate={selectedCandidate}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Add modal */}
      <AddCandidateModal open={addModalOpen} onOpenChange={setAddModalOpen} />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Candidate"
        description="Are you sure you want to delete this candidate? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deleteCandidate.isPending}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedCount} Candidates`}
        description={`This will permanently delete ${selectedCount} candidates. This action cannot be undone.`}
        confirmLabel={`Delete ${selectedCount}`}
        onConfirm={handleBulkDelete}
        isLoading={bulkDelete.isPending}
      />
    </div>
  )
}
