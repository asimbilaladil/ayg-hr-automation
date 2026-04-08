import type { Metadata } from 'next'
import { SessionProvider } from 'next-auth/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/queryClient'
import './globals.css'

export const metadata: Metadata = {
  title: 'TalentFlow — HR Recruitment',
  description: 'Internal HR Recruitment Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            <Toaster richColors position="top-right" />
          </QueryClientProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
