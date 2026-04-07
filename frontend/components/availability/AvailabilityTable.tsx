'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { Edit2, Trash2 } from 'lucide-react'
import { ManagerAvailability } from '@/types'
import { DataTable } from '@/components/shared/DataTable'
import { useUpdateAvailability } from '@/hooks/useAvailability'
import { RoleGuard } from '@/components/shared/RoleGuard'
import { formatTimeRange } from '@/lib/utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Props = {
  data: ManagerAvailability[]
  isLoading?: boolean
  onEdit: (record: ManagerAvailability) => void
  onDelete: (id: string) => void
}

function ActiveToggle({ record }: { record: ManagerAvailability }) {
  const update = useUpdateAvailability()

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await update.mutateAsync({ id: record.id, data: { active: !record.active } })
      toast.success(`Availability ${record.active ? 'deactivated' : 'activated'}`)
    } catch {
      toast.error('Failed to update')
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={update.isPending}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50',
        record.active ? 'bg-blue-500' : 'bg-slate-200'
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow',
          record.active ? 'translate-x-4.5' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

export function AvailabilityTable({ data, isLoading, onEdit, onDelete }: Props) {
  const columns: ColumnDef<ManagerAvailability, unknown>[] = [
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ getValue }) => (
        <span className="text-sm text-slate-700">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'managerName',
      header: 'Manager',
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium text-slate-900">{row.original.managerName}</div>
          <div className="text-xs text-slate-400">{row.original.managerEmail}</div>
        </div>
      ),
    },
    {
      accessorKey: 'dayOfWeek',
      header: 'Day',
      cell: ({ getValue }) => (
        <span className="text-sm text-slate-700">{getValue() as string}</span>
      ),
    },
    {
      id: 'hours',
      header: 'Hours',
      cell: ({ row }) => (
        <span className="text-sm font-mono text-slate-700">
          {formatTimeRange(row.original.startTime, row.original.endTime)}
        </span>
      ),
    },
    {
      accessorKey: 'slotDuration',
      header: 'Slot',
      cell: ({ getValue }) => (
        <span className="text-sm text-slate-600">{getValue() as string} min</span>
      ),
    },
    {
      accessorKey: 'active',
      header: 'Active',
      cell: ({ row }) => (
        <RoleGuard allowedRoles={['ADMIN', 'MANAGER']} fallback={
          <span className={cn('text-xs', row.original.active ? 'text-green-600' : 'text-slate-400')}>
            {row.original.active ? 'Yes' : 'No'}
          </span>
        }>
          <ActiveToggle record={row.original} />
        </RoleGuard>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
            <button
              onClick={() => onEdit(row.original)}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </RoleGuard>
          <RoleGuard allowedRoles={['ADMIN']}>
            <button
              onClick={() => onDelete(row.original.id)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </RoleGuard>
        </div>
      ),
      enableSorting: false,
    },
  ]

  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      emptyState={
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="text-4xl">🕐</div>
          <div>
            <p className="text-sm font-medium text-slate-700">No availability slots</p>
            <p className="text-xs text-slate-400 mt-0.5">Add manager availability to start booking appointments</p>
          </div>
        </div>
      }
    />
  )
}
