'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAvailability, useDeleteAvailability } from '@/hooks/useAvailability'
import { AvailabilityTable } from '@/components/availability/AvailabilityTable'
import { AvailabilityModal } from '@/components/availability/AvailabilityModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { RoleGuard } from '@/components/shared/RoleGuard'
import { ManagerAvailability } from '@/types'
import { toast } from 'sonner'

export default function AvailabilityPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<ManagerAvailability | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data = [], isLoading } = useAvailability()
  const deleteAvailability = useDeleteAvailability()

  const handleEdit = (record: ManagerAvailability) => {
    setEditRecord(record)
    setModalOpen(true)
  }

  const handleModalClose = (open: boolean) => {
    setModalOpen(open)
    if (!open) setEditRecord(null)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteAvailability.mutateAsync(deleteId)
      toast.success('Availability deleted')
      setDeleteId(null)
    } catch {
      toast.error('Failed to delete availability')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{data.length} availability slots</p>
        <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Availability
          </button>
        </RoleGuard>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <AvailabilityTable
          data={data}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteId(id)}
        />
      </div>

      <AvailabilityModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        editRecord={editRecord}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Availability"
        description="Are you sure you want to delete this availability slot? Existing appointments will not be affected."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deleteAvailability.isPending}
      />
    </div>
  )
}
