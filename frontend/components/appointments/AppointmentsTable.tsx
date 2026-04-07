'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { XCircle, Edit2 } from 'lucide-react'
import { Appointment } from '@/types'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatTimeRange } from '@/lib/utils'
import { RoleGuard } from '@/components/shared/RoleGuard'
import { format, parseISO } from 'date-fns'

type Props = {
  data: Appointment[]
  isLoading?: boolean
  onCancel: (id: string) => void
  onEdit: (appointment: Appointment) => void
}

export function AppointmentsTable({ data, isLoading, onCancel, onEdit }: Props) {
  const columns: ColumnDef<Appointment, unknown>[] = [
    {
      accessorKey: 'candidateName',
      header: 'Candidate',
      cell: ({ getValue }) => (
        <span className="font-medium text-slate-900 text-sm">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'jobRole',
      header: 'Job Role',
      cell: ({ getValue }) => (
        <span className="text-sm text-slate-700">{(getValue() as string) ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ getValue }) => (
        <span className="text-sm text-slate-600">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'interviewDate',
      header: 'Date',
      cell: ({ getValue }) => {
        const d = getValue() as string
        try {
          return (
            <span className="text-sm text-slate-700">
              {format(parseISO(d), 'EEE, dd MMM yyyy')}
            </span>
          )
        } catch {
          return <span className="text-sm text-slate-700">{d}</span>
        }
      },
      enableSorting: true,
    },
    {
      id: 'time',
      header: 'Time',
      cell: ({ row }) => (
        <span className="text-sm font-mono text-slate-700">
          {formatTimeRange(row.original.startTime, row.original.endTime)}
        </span>
      ),
    },
    {
      id: 'manager',
      header: 'Manager',
      cell: ({ row }) => (
        <div>
          <div className="text-sm text-slate-800">{row.original.managerName ?? '—'}</div>
          {row.original.managerEmail && (
            <div className="text-xs text-slate-400">{row.original.managerEmail}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'active',
      header: 'Status',
      cell: ({ getValue }) => (
        <StatusBadge status={(getValue() as boolean) ? 'active' : 'inactive'} />
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
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            {row.original.active && (
              <button
                onClick={() => onCancel(row.original.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Cancel"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
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
          <div className="text-4xl">📅</div>
          <div>
            <p className="text-sm font-medium text-slate-700">No appointments found</p>
            <p className="text-xs text-slate-400 mt-0.5">Book an appointment to get started</p>
          </div>
        </div>
      }
    />
  )
}
