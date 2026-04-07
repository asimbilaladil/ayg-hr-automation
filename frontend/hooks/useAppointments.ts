import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Appointment, AppointmentFilters, PaginatedResponse, TimeSlot } from '@/types'

export function useAppointments(filters: AppointmentFilters) {
  return useQuery<PaginatedResponse<Appointment>>({
    queryKey: ['appointments', filters],
    queryFn: () =>
      api.get('/api/appointments', { params: filters }).then((r) => r.data),
  })
}

export function useAvailableSlots(params: {
  date: string
  location?: string
}) {
  return useQuery<TimeSlot[]>({
    queryKey: ['available-slots', params],
    queryFn: () =>
      api.get('/api/availability/slots', { params }).then((r) => r.data),
    enabled: !!params.date,
  })
}

export function useCreateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Appointment>) =>
      api.post('/api/appointments', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['available-slots'] })
    },
  })
}

export function useUpdateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Appointment> }) =>
      api.patch(`/api/appointments/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

export function useCancelAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/appointments/${id}`, { active: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useAppointmentLocations() {
  return useQuery<string[]>({
    queryKey: ['appointment-locations'],
    queryFn: () => api.get('/api/appointments/meta/locations').then((r) => r.data),
  })
}

export function useAppointmentManagers() {
  return useQuery<string[]>({
    queryKey: ['appointment-managers'],
    queryFn: () => api.get('/api/appointments/meta/managers').then((r) => r.data),
  })
}
