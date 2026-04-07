import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { ManagerAvailability, AvailabilityFilters } from '@/types'

export function useAvailability(filters?: AvailabilityFilters) {
  return useQuery<ManagerAvailability[]>({
    queryKey: ['availability', filters],
    queryFn: () =>
      api.get('/api/availability', { params: filters }).then((r) => r.data),
  })
}

export function useCreateAvailability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<ManagerAvailability>) =>
      api.post('/api/availability', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability'] })
      qc.invalidateQueries({ queryKey: ['available-slots'] })
    },
  })
}

export function useUpdateAvailability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<ManagerAvailability>
    }) => api.patch(`/api/availability/${id}`, data).then((r) => r.data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['availability'] })
      const prev = qc.getQueriesData({ queryKey: ['availability'] })
      qc.setQueriesData(
        { queryKey: ['availability'] },
        (old: ManagerAvailability[] | undefined) => {
          if (!old) return old
          return old.map((a) => (a.id === id ? { ...a, ...data } : a))
        }
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        ctx.prev.forEach(([key, val]) => qc.setQueryData(key, val))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability'] })
      qc.invalidateQueries({ queryKey: ['available-slots'] })
    },
  })
}

export function useDeleteAvailability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/availability/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability'] })
      qc.invalidateQueries({ queryKey: ['available-slots'] })
    },
  })
}
