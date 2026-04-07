'use client'

import { useState } from 'react'
import { Plus, CalendarDays, List } from 'lucide-react'
import { format, parseISO, startOfMonth, getDaysInMonth, getDay } from 'date-fns'
import { useAppointments, useCancelAppointment } from '@/hooks/useAppointments'
import { AppointmentsTable } from '@/components/appointments/AppointmentsTable'
import { AppointmentFilters } from '@/components/appointments/AppointmentFilters'
import { BookAppointmentModal } from '@/components/appointments/BookAppointmentModal'
import { Pagination } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Appointment, AppointmentFilters as FilterType } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const DEFAULT_FILTERS: FilterType = { page: 1, limit: 20 }

export default function AppointmentsPage() {
  const [filters, setFilters] = useState<FilterType>(DEFAULT_FILTERS)
  const [bookModalOpen, setBookModalOpen] = useState(false)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table')

  const { data, isLoading } = useAppointments(filters)
  const cancelAppointment = useCancelAppointment()

  const appointments = data?.data ?? []
  const total = data?.total ?? 0

  const handleCancel = async () => {
    if (!cancelId) return
    try {
      await cancelAppointment.mutateAsync(cancelId)
      toast.success('Appointment cancelled')
      setCancelId(null)
    } catch {
      toast.error('Failed to cancel appointment')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{total.toLocaleString()} appointments</div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <List className="w-3.5 h-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Calendar
            </button>
          </div>

          <button
            onClick={() => setBookModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Book Appointment
          </button>
        </div>
      </div>

      <AppointmentFilters
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(DEFAULT_FILTERS)}
      />

      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <AppointmentsTable
            data={appointments}
            isLoading={isLoading}
            onCancel={(id) => setCancelId(id)}
            onEdit={(a) => setEditAppointment(a)}
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
      ) : (
        <AppointmentCalendar appointments={appointments} isLoading={isLoading} />
      )}

      <BookAppointmentModal open={bookModalOpen} onOpenChange={setBookModalOpen} />

      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={(o) => !o && setCancelId(null)}
        title="Cancel Appointment"
        description="Are you sure you want to cancel this appointment?"
        confirmLabel="Cancel Appointment"
        onConfirm={handleCancel}
        isLoading={cancelAppointment.isPending}
      />
    </div>
  )
}

function AppointmentCalendar({
  appointments,
  isLoading,
}: {
  appointments: Appointment[]
  isLoading?: boolean
}) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getDay(startOfMonth(currentDate))

  const apptByDay: Record<number, Appointment[]> = {}
  appointments.forEach((a) => {
    try {
      const d = parseISO(a.interviewDate)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate()
        if (!apptByDay[day]) apptByDay[day] = []
        apptByDay[day].push(a)
      }
    } catch {}
  })

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            ←
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
        {dayNames.map((d) => (
          <div key={d} className="bg-slate-50 text-center text-xs font-semibold text-slate-500 py-2">
            {d}
          </div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-white min-h-[80px]" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dayAppts = apptByDay[day] ?? []
          const isToday =
            new Date().getDate() === day &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year

          return (
            <div
              key={day}
              className={cn(
                'bg-white min-h-[80px] p-1.5',
                isToday && 'bg-blue-50/40'
              )}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1',
                  isToday ? 'bg-blue-600 text-white' : 'text-slate-600'
                )}
              >
                {day}
              </div>
              <div className="space-y-0.5">
                {dayAppts.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded truncate"
                    title={`${a.candidateName} - ${a.startTime}`}
                  >
                    {a.startTime} {a.candidateName.split(' ')[0]}
                  </div>
                ))}
                {dayAppts.length > 3 && (
                  <div className="text-[10px] text-slate-400 pl-1">+{dayAppts.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
