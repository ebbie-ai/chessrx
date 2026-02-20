import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/Header'

export const metadata: Metadata = {
  title: {
    default: 'ChessRx — AI Chess Coaching',
    template: '%s | ChessRx',
  },
  description:
    'AI chess coaching that learns from your actual games. Personalized puzzles from your mistakes, not someone else\'s.',
  keywords: ['chess', 'chess coaching', 'chess puzzles', 'chess training', 'AI chess'],
  openGraph: {
    title: 'ChessRx — AI Chess Coaching',
    description: 'Train on puzzles from your own games. Fix the mistakes that actually cost you.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-slate-950 antialiased">
        <Header />
        <main className="pt-14">{children}</main>
      </body>
    </html>
  )
}
