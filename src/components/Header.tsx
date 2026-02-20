'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

export function Header() {
  const pathname = usePathname()

  const navLinks = [
    { href: '/import', label: 'Import Games' },
    { href: '/train', label: 'Train' },
    { href: '/dashboard', label: 'Dashboard', disabled: true },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5"
        >
          {/* Chess king icon */}
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 text-base font-black text-slate-900 shadow-lg shadow-teal-500/20 transition-all duration-200 group-hover:shadow-teal-500/40">
            ♛
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            Chess<span className="text-teal-400">Rx</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label, disabled }) =>
            disabled ? (
              <span
                key={href}
                className="hidden cursor-not-allowed px-3 py-1.5 text-sm text-slate-600 sm:inline-block"
                title="Coming soon"
              >
                {label}
              </span>
            ) : (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150',
                  pathname === href
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                )}
              >
                {label}
              </Link>
            )
          )}

          {/* CTA */}
          <Link
            href="/train"
            className="ml-2 hidden rounded-md bg-teal-500 px-3.5 py-1.5 text-sm font-semibold text-slate-900 transition-all duration-150 hover:bg-teal-400 active:scale-95 sm:inline-block"
          >
            Start Training
          </Link>
        </nav>
      </div>
    </header>
  )
}
