'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAvailableSlots, useCreateAppointment } from '@/hooks/useAppointments'
import { useAppointmentLocations } from '@/hooks/useAppointments'
import { TimeSlot } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const schema = z.object({
  candidateName: z.string().min(1, 'Candidate name is required'),
  jobRole: z.string().min(1, 'Job role is required'),
  location: z.string().min(1, 'Location is required'),
  interviewDate: z.string().min(1, 'Date is required'),
})

type FormValues = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BookAppointmentModal({ open, onOpenChange }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const createAppointment = useCreateAppointment()
  const { data: locations = [] } = useAppointmentLocations()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const watchDate = watch('interviewDate')
  const watchLocation = watch('location')

  const { data: slots = [], isLoading: slotsLoading } = useAvailableSlots({
    date: watchDate,
    location: watchLocation || undefined,
  })

  const onSubmit = async (data: FormValues) => {
    if (!selectedSlot) {
      toast.error('Please select a time slot')
      return
    }
    try {
      await createAppointment.mutateAsync({
        ...data,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        managerName: selectedSlot.managerName,
        managerEmail: selectedSlot.managerEmail,
        slotDuration: '20',
        active: true,
      })
      toast.success('Appointment booked successfully')
      reset()
      setSelectedSlot(null)
      onOpenChange(false)
    } catch {
      toast.error('Failed to book appointment')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Book Appointment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Candidate Name *" error={errors.candidateName?.message} className="col-span-2">
              <input {...register('candidateName')} className={inputCls(!!errors.candidateName)} placeholder="Jane Smith" />
            </Field>
            <Field label="Job Role *" error={errors.jobRole?.message}>
              <input {...register('jobRole')} className={inputCls(!!errors.jobRole)} placeholder="Software Engineer" />
            </Field>
            <Field label="Location *" error={errors.location?.message}>
              <select {...register('location')} className={inputCls(!!errors.location)}>
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </Field>
            <Field label="Interview Date *" error={errors.interviewDate?.message} className="col-span-2">
              <input type="date" {...register('interviewDate')} className={inputCls(!!errors.interviewDate)} />
            </Field>
          </div>

          {/* Time slot picker */}
          {watchDate && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Select Time Slot *</label>
              {slotsLoading ? (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-lg">
                  <Clock className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No slots available for this date</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {slots.map((slot, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        'px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center',
                        selectedSlot?.startTime === slot.startTime && selectedSlot?.managerEmail === slot.managerEmail
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/40'
                      )}
                    >
                      <div>{slot.startTime} – {slot.endTime}</div>
                      <div className="text-slate-400 truncate">{slot.managerName.split(' ')[0]}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedSlot && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-800">
              <strong>Selected:</strong> {selectedSlot.startTime}–{selectedSlot.endTime} with {selectedSlot.managerName}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { reset(); setSelectedSlot(null); onOpenChange(false) }}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAppointment.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {createAppointment.isPending ? 'Booking...' : 'Book Appointment'}
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
