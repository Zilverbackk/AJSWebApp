import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AJS Judo Club',
  description: 'Club administration and athlete management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
