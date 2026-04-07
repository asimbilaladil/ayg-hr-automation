'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCreateCandidate } from '@/hooks/useCandidates'
import { toast } from 'sonner'

const schema = z.object({
  candidateName: z.string().min(1, 'Name is required'),
  postingName: z.string().min(1, 'Posting is required'),
  location: z.string().min(1, 'Location is required'),
  phone: z.string().optional(),
  dateApplied: z.string().optional(),
  hiringManager: z.string().optional(),
  recruiter: z.string().optional(),
  emailId: z.string().min(1, 'Email ID is required'),
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddCandidateModal({ open, onOpenChange }: Props) {
  const createCandidate = useCreateCandidate()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    try {
      await createCandidate.mutateAsync({ ...data, status: 'pending' })
      toast.success('Candidate added successfully')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to add candidate')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Candidate</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Candidate Name *" error={errors.candidateName?.message}>
              <input {...register('candidateName')} className={inputCls(!!errors.candidateName)} placeholder="Jane Smith" />
            </Field>
            <Field label="Posting Name *" error={errors.postingName?.message}>
              <input {...register('postingName')} className={inputCls(!!errors.postingName)} placeholder="Software Engineer" />
            </Field>
            <Field label="Location *" error={errors.location?.message}>
              <input {...register('location')} className={inputCls(!!errors.location)} placeholder="New York" />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <input {...register('phone')} className={inputCls(!!errors.phone)} placeholder="+1 234 567 8900" />
            </Field>
            <Field label="Email ID (Gmail msg ID) *" error={errors.emailId?.message} className="col-span-2">
              <input {...register('emailId')} className={inputCls(!!errors.emailId)} placeholder="19c8cd9c4505a04f" />
            </Field>
            <Field label="Date Applied" error={errors.dateApplied?.message}>
              <input type="date" {...register('dateApplied')} className={inputCls(!!errors.dateApplied)} />
            </Field>
            <Field label="Hiring Manager" error={errors.hiringManager?.message}>
              <input {...register('hiringManager')} className={inputCls(!!errors.hiringManager)} placeholder="John Doe" />
            </Field>
            <Field label="Recruiter" error={errors.recruiter?.message}>
              <input {...register('recruiter')} className={inputCls(!!errors.recruiter)} placeholder="Alice Brown" />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { reset(); onOpenChange(false) }}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCandidate.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {createCandidate.isPending ? 'Adding...' : 'Add Candidate'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function inputCls(hasError: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 ${
    hasError ? 'border-red-400 bg-red-50' : 'border-slate-200'
  }`
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
