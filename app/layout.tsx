import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Social Craps — Crapless Craps Table',
  description: 'Live multiplayer crapless craps by MonkeyTilt',
}

import AuthWrapper from './components/AuthWrapper'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthWrapper>
          {children}
        </AuthWrapper>
      </body>
    </html>
  )
}
