import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isValid } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | undefined, fmt = 'dd MMM yyyy'): string {
  if (!date) return '—'
  const parsed = parseISO(date)
  return isValid(parsed) ? format(parsed, fmt) : '—'
}

export function formatDateTime(date: string | undefined): string {
  return formatDate(date, 'dd MMM yyyy, HH:mm')
}

export function formatTimeRange(start: string, end: string): string {
  return `${start} – ${end}`
}

export function getAIScoreColor(score: number | undefined): string {
  if (score === undefined) return 'text-gray-400'
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-yellow-600'
  return 'text-red-600'
}

export function getAIScoreBg(score: number | undefined): string {
  if (score === undefined) return 'bg-gray-100 text-gray-500'
  if (score >= 70) return 'bg-green-50 text-green-700 ring-green-200'
  if (score >= 40) return 'bg-yellow-50 text-yellow-700 ring-yellow-200'
  return 'bg-red-50 text-red-700 ring-red-200'
}

export function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h]
      const str = val === null || val === undefined ? '' : String(val)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
