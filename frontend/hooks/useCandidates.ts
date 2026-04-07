import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Candidate, CandidateFilters, PaginatedResponse, DashboardStats } from '@/types'

export function useCandidates(filters: CandidateFilters) {
  return useQuery<PaginatedResponse<Candidate>>({
    queryKey: ['candidates', filters],
    queryFn: () =>
      api.get('/api/candidates', { params: filters }).then((r) => r.data),
  })
}

export function useCandidate(id: string) {
  return useQuery<Candidate>({
    queryKey: ['candidate', id],
    queryFn: () => api.get(`/api/candidates/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/api/dashboard/stats').then((r) => r.data),
  })
}

export function useCreateCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Candidate>) =>
      api.post('/api/candidates', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidates'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useUpdateCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Candidate> }) =>
      api.patch(`/api/candidates/${id}`, data).then((r) => r.data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['candidates'] })
      const prev = qc.getQueriesData({ queryKey: ['candidates'] })
      qc.setQueriesData(
        { queryKey: ['candidates'] },
        (old: PaginatedResponse<Candidate> | undefined) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.map((c) => (c.id === id ? { ...c, ...data } : c)),
          }
        }
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        ctx.prev.forEach(([key, val]) => qc.setQueryData(key, val))
      }
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['candidates'] })
      qc.invalidateQueries({ queryKey: ['candidate', id] })
    },
  })
}

export function useDeleteCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/candidates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidates'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useBulkDeleteCandidates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.post('/api/candidates/bulk-delete', { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidates'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useCandidateLocations() {
  return useQuery<string[]>({
    queryKey: ['candidate-locations'],
    queryFn: () => api.get('/api/candidates/meta/locations').then((r) => r.data),
  })
}

export function useCandidatePostings() {
  return useQuery<string[]>({
    queryKey: ['candidate-postings'],
    queryFn: () => api.get('/api/candidates/meta/postings').then((r) => r.data),
  })
}
