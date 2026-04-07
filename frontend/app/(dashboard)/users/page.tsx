'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Trash2, Shield } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import api from '@/lib/api'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RoleGuard } from '@/components/shared/RoleGuard'
import { type ColumnDef } from '@tanstack/react-table'
import { formatDate } from '@/lib/utils'

type User = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'MANAGER' | 'HR'
  createdAt: string
  active: boolean
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'HR']),
})

type FormValues = z.infer<typeof schema>

function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/api/users').then((r) => r.data),
  })
}

function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FormValues) => api.post('/api/users', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-50 text-red-700 ring-red-200',
  MANAGER: 'bg-blue-50 text-blue-700 ring-blue-200',
  HR: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

export default function UsersPage() {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: users = [], isLoading } = useUsers()
  const createUser = useCreateUser()
  const deleteUser = useDeleteUser()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'HR' },
  })

  const onSubmit = async (data: FormValues) => {
    try {
      await createUser.mutateAsync(data)
      toast.success('User created successfully')
      reset()
      setAddModalOpen(false)
    } catch {
      toast.error('Failed to create user')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteUser.mutateAsync(deleteId)
      toast.success('User deleted')
      setDeleteId(null)
    } catch {
      toast.error('Failed to delete user')
    }
  }

  const columns: ColumnDef<User, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-slate-900 text-sm">{row.original.name}</div>
          <div className="text-xs text-slate-400">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ getValue }) => {
        const role = getValue() as string
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${roleColors[role] ?? 'bg-gray-100 text-gray-600'}`}>
            {role}
          </span>
        )
      },
    },
    {
      accessorKey: 'active',
      header: 'Status',
      cell: ({ getValue }) => (
        <StatusBadge status={(getValue() as boolean) ? 'active' : 'inactive'} />
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => (
        <span className="text-xs text-slate-500">{formatDate(getValue() as string)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteId(row.original.id) }}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ]

  return (
    <RoleGuard
      allowedRoles={['ADMIN']}
      fallback={
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Shield className="w-12 h-12 text-slate-300 mb-3" />
          <h2 className="text-lg font-semibold text-slate-700">Access Restricted</h2>
          <p className="text-slate-400 text-sm mt-1">Only Admins can manage users.</p>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{users.length} users</p>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <DataTable
            data={users}
            columns={columns}
            isLoading={isLoading}
            emptyState={
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="text-4xl">👤</div>
                <p className="text-sm font-medium text-slate-700">No users yet</p>
              </div>
            }
          />
        </div>

        {/* Add user modal */}
        <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <Field label="Name *" error={errors.name?.message}>
                <input {...register('name')} className={inputCls(!!errors.name)} placeholder="Jane Smith" />
              </Field>
              <Field label="Email *" error={errors.email?.message}>
                <input type="email" {...register('email')} className={inputCls(!!errors.email)} placeholder="jane@company.com" />
              </Field>
              <Field label="Password *" error={errors.password?.message}>
                <input type="password" {...register('password')} className={inputCls(!!errors.password)} placeholder="min 8 characters" />
              </Field>
              <Field label="Role *" error={errors.role?.message}>
                <select {...register('role')} className={inputCls(!!errors.role)}>
                  <option value="HR">HR</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { reset(); setAddModalOpen(false) }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUser.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
                >
                  {createUser.isPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={(o) => !o && setDeleteId(null)}
          title="Delete User"
          description="Are you sure you want to delete this user? They will lose all access immediately."
          confirmLabel="Delete User"
          onConfirm={handleDelete}
          isLoading={deleteUser.isPending}
        />
      </div>
    </RoleGuard>
  )
}

function inputCls(hasError: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white ${
    hasError ? 'border-red-400 bg-red-50' : 'border-slate-200'
  }`
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
