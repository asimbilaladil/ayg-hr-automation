'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { Trash2, Eye, MoreHorizontal } from 'lucide-react'
import { Candidate } from '@/types'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { AIScoreBadge } from './AIScoreBadge'
import { formatDate } from '@/lib/utils'
import { useIsAdmin } from '@/components/shared/RoleGuard'
import { useState } from 'react'

type Props = {
  data: Candidate[]
  isLoading?: boolean
  onRowClick: (candidate: Candidate) => void
  onDelete: (id: string) => void
  rowSelection: Record<string, boolean>
  onRowSelectionChange: (s: Record<string, boolean>) => void
}

export function CandidatesTable({
  data,
  isLoading,
  onRowClick,
  onDelete,
  rowSelection,
  onRowSelectionChange,
}: Props) {
  const isAdmin = useIsAdmin()

  const columns: ColumnDef<Candidate, unknown>[] = [
    // Checkbox
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      enableSorting: false,
      size: 40,
    },
    {
      accessorKey: 'candidateName',
      header: 'Candidate',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-slate-900 text-sm">{row.original.candidateName}</div>
          {row.original.phone && (
            <div className="text-xs text-slate-400">{row.original.phone}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'postingName',
      header: 'Posting',
      cell: ({ getValue }) => (
        <span className="text-sm text-slate-700">{getValue() as string}</span>
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
      accessorKey: 'aiScore',
      header: 'AI Score',
      cell: ({ getValue }) => <AIScoreBadge score={getValue() as number | undefined} />,
      enableSorting: true,
    },
    {
      accessorKey: 'aiRecommendation',
      header: 'AI Rec.',
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined
        return v ? <StatusBadge status={v} /> : <span className="text-slate-400 text-xs">—</span>
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
    },
    {
      accessorKey: 'dateApplied',
      header: 'Applied',
      cell: ({ getValue }) => (
        <span className="text-xs text-slate-500">{formatDate(getValue() as string)}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'hiringManager',
      header: 'Manager',
      cell: ({ getValue }) => (
        <span className="text-sm text-slate-600">{(getValue() as string) ?? '—'}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onRowClick(row.original)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button
              onClick={() => onDelete(row.original.id)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
      enableSorting: false,
      size: 80,
    },
  ]

  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      onRowClick={onRowClick}
      rowSelection={rowSelection}
      onRowSelectionChange={onRowSelectionChange}
      emptyState={
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <span className="text-2xl">👤</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">No candidates found</p>
            <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters or add a new candidate</p>
          </div>
        </div>
      }
    />
  )
}
