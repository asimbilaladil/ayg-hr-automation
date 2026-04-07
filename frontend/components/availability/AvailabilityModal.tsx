'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCreateAvailability, useUpdateAvailability } from '@/hooks/useAvailability'
import { ManagerAvailability } from '@/types'
import { toast } from 'sonner'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const schema = z
  .object({
    location: z.string().min(1, 'Location is required'),
    managerName: z.string().min(1, 'Manager name is required'),
    managerEmail: z.string().email('Invalid email'),
    dayOfWeek: z.string().min(1, 'Day is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    slotDuration: z.string().default('20'),
    active: z.boolean().default(true),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  })

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editRecord?: ManagerAvailability | null
}

export function AvailabilityModal({ open, onOpenChange, editRecord }: Props) {
  const create = useCreateAvailability()
  const update = useUpdateAvailability()
  const isEdit = !!editRecord

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { active: true, slotDuration: '20' },
  })

  useEffect(() => {
    if (editRecord) {
      reset(editRecord)
    } else {
      reset({ active: true, slotDuration: '20' })
    }
  }, [editRecord, reset])

  const onSubmit = async (data: FormValues) => {
    try {
      if (isEdit && editRecord) {
        await update.mutateAsync({ id: editRecord.id, data })
        toast.success('Availability updated')
      } else {
        await create.mutateAsync(data)
        toast.success('Availability added')
      }
      onOpenChange(false)
    } catch {
      toast.error(`Failed to ${isEdit ? 'update' : 'add'} availability`)
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Availability' : 'Add Availability'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Location *" error={errors.location?.message}>
              <input {...register('location')} className={inputCls(!!errors.location)} placeholder="New York" />
            </Field>
            <Field label="Manager Name *" error={errors.managerName?.message}>
              <input {...register('managerName')} className={inputCls(!!errors.managerName)} placeholder="John Doe" />
            </Field>
            <Field label="Manager Email *" error={errors.managerEmail?.message} className="col-span-2">
              <input type="email" {...register('managerEmail')} className={inputCls(!!errors.managerEmail)} placeholder="john@company.com" />
            </Field>
            <Field label="Day of Week *" error={errors.dayOfWeek?.message}>
              <select {...register('dayOfWeek')} className={inputCls(!!errors.dayOfWeek)}>
                <option value="">Select day</option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Slot Duration" error={errors.slotDuration?.message}>
              <select {...register('slotDuration')} className={inputCls(!!errors.slotDuration)}>
                <option value="15">15 min</option>
                <option value="20">20 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
              </select>
            </Field>
            <Field label="Start Time *" error={errors.startTime?.message}>
              <input type="time" {...register('startTime')} className={inputCls(!!errors.startTime)} />
            </Field>
            <Field label="End Time *" error={errors.endTime?.message}>
              <input type="time" {...register('endTime')} className={inputCls(!!errors.endTime)} />
            </Field>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              {...register('active')}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="active" className="text-sm text-slate-700">Active</label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {isPending ? 'Saving...' : isEdit ? 'Update' : 'Add Availability'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function inputCls(hasError: boolean) {
  return `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white ${
    hasError ? 'border-red-400 bg-red-50' : 'border-slate-200'
  }`
}

function Field({
  label, error, children, className,
}: {
  label: string; error?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
