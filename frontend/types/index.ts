export type Role = 'ADMIN' | 'MANAGER' | 'HR'

export type CandidateStatus = 'pending' | 'reviewed' | 'called' | 'not_found' | 'processed_no_resume'

export type AIRecommendation = 'ACCEPT' | 'MAYBE' | 'REJECT'

export type Candidate = {
  id: string
  postingName: string
  location: string
  candidateName: string
  phone?: string
  dateApplied?: string
  hiringManager?: string
  recruiter?: string
  status: CandidateStatus
  receivedAt?: string
  emailId: string
  aiScore?: number
  aiRecommendation?: AIRecommendation
  aiCriteriaMet?: string
  aiCriteriaMissing?: string
  aiSummary?: string
  reviewedAt?: string
  called?: string
  transcript?: string
  createdAt: string
  updatedAt: string
}

export type Appointment = {
  id: string
  location: string
  managerName?: string
  managerEmail?: string
  candidateName: string
  jobRole?: string
  interviewDate: string
  day?: string
  startTime: string
  endTime: string
  slotDuration: string
  active: boolean
  createdAt: string
}

export type ManagerAvailability = {
  id: string
  location: string
  managerName: string
  managerEmail: string
  dayOfWeek: string
  startTime: string
  endTime: string
  slotDuration: string
  active: boolean
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  limit: number
}

export type DashboardStats = {
  totalCandidates: number
  pendingReview: number
  accepted: number
  appointmentsThisWeek: number
  candidatesByStatus: { status: string; count: number }[]
  aiRecommendationBreakdown: { recommendation: string; count: number }[]
  candidatesByLocation: { location: string; count: number }[]
  recentCandidates: Candidate[]
}

export type CandidateFilters = {
  search?: string
  status?: CandidateStatus | ''
  aiRecommendation?: AIRecommendation | ''
  location?: string
  postingName?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type AppointmentFilters = {
  date?: string
  dateFrom?: string
  dateTo?: string
  location?: string
  managerName?: string
  page?: number
  limit?: number
}

export type AvailabilityFilters = {
  location?: string
  managerName?: string
  active?: boolean
}

export type TimeSlot = {
  startTime: string
  endTime: string
  managerName: string
  managerEmail: string
  location: string
}
