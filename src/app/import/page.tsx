'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'

import type {
  ChessComPlayer,
  ChessComStats,
  FetchedGame,
  TimeClass,
} from '@/lib/chesscom-api'
import {
  fetchPlayerProfile,
  fetchPlayerStats,
  fetchRecentGames,
  getPlayerRating,
  ChessComApiError,
} from '@/lib/chesscom-api'
import { IMPORTED_GAMES_KEY } from '@/lib/game-analyzer'

// ── Types ────────────────────────────────────────────────────────────────────

type PageState = 'idle' | 'fetching' | 'fetched' | 'error'

type MonthsBack = 1 | 3 | 12

interface FetchedData {
  player: ChessComPlayer
  stats: ChessComStats
  games: FetchedGame[]
  totalAvailable: number
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const router = useRouter()
  const [state, setState] = useState<PageState>('idle')
  const [username, setUsername] = useState('')
  const [timeClass, setTimeClass] = useState<TimeClass>('blitz')
  const [monthsBack, setMonthsBack] = useState<MonthsBack>(1)
  const [error, setError] = useState<string | null>(null)
  const [fetchProgress, setFetchProgress] = useState({ fetched: 0, goal: 20 })
  const [fetchedData, setFetchedData] = useState<FetchedData | null>(null)

  const abortRef = useRef(false)

  const handleImport = useCallback(async () => {
    const trimmed = username.trim()
    if (!trimmed) return

    setState('fetching')
    setError(null)
    setFetchedData(null)
    setFetchProgress({ fetched: 0, goal: 20 })
    abortRef.current = false

    try {
      const [player, stats, games] = await Promise.all([
        fetchPlayerProfile(trimmed),
        fetchPlayerStats(trimmed),
        fetchRecentGames(trimmed, {
          maxGames: 20,
          timeClass,
          monthsBack,
          onProgress: (fetched, goal) => setFetchProgress({ fetched, goal }),
        }),
      ])

      setFetchedData({
        player,
        stats,
        games,
        totalAvailable: games.length,
      })
      setState('fetched')
    } catch (err) {
      const msg =
        err instanceof ChessComApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Unknown error'
      setError(msg)
      setState('error')
    }
  }, [username, timeClass, monthsBack])

  const handleStartTraining = useCallback(() => {
    if (!fetchedData || fetchedData.games.length === 0) return

    // Save games to localStorage for the train page to analyze
    try {
      const toSave = fetchedData.games.map((g) => ({
        parsed: g.parsed,
        chesscomGame: g.chesscomGame,
        username: fetchedData.player.username,
      }))
      localStorage.setItem(IMPORTED_GAMES_KEY, JSON.stringify(toSave))
    } catch (err) {
      console.warn('Failed to save games to localStorage:', err)
    }

    // Navigate to train — analysis happens there
    router.push('/train')
  }, [fetchedData, router])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-950">
      {/* Page header */}
      <div className="border-b border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Import Your Games
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Connect your Chess.com account to generate personalized puzzles from
            your real games.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* ── Step 1: Username + filters ──────────────────────────────────── */}
        <Section title="1. Enter your Chess.com username">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImport()}
              placeholder="e.g. btakashi444"
              disabled={state === 'fetching'}
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none ring-teal-500/40 transition focus:border-teal-500/50 focus:ring-2 disabled:opacity-50"
            />
            <button
              onClick={handleImport}
              disabled={
                !username.trim() ||
                state === 'fetching' ||
                false
              }
              className="flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
            >
              {state === 'fetching' ? (
                <>
                  <Spinner />
                  Fetching…
                </>
              ) : (
                'Import Games'
              )}
            </button>
          </div>

          {/* Filters */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FilterGroup label="Time control">
              {(['blitz', 'rapid', 'bullet', 'daily', 'all'] as TimeClass[]).map(
                (tc) => (
                  <FilterChip
                    key={tc}
                    label={tc === 'all' ? 'All' : capitalize(tc)}
                    active={timeClass === tc}
                    onClick={() => setTimeClass(tc)}
                    disabled={state === 'fetching'}
                  />
                )
              )}
            </FilterGroup>

            <FilterGroup label="Time period">
              {([1, 3, 12] as MonthsBack[]).map((m) => (
                <FilterChip
                  key={m}
                  label={m === 1 ? 'Last month' : m === 3 ? 'Last 3 months' : 'Last year'}
                  active={monthsBack === m}
                  onClick={() => setMonthsBack(m)}
                  disabled={state === 'fetching'}
                />
              ))}
            </FilterGroup>
          </div>

          {/* Fetch progress */}
          {state === 'fetching' && (
            <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                <span>Fetching games from Chess.com…</span>
                <span>{fetchProgress.fetched} / {fetchProgress.goal}</span>
              </div>
              <ProgressBar value={fetchProgress.fetched} max={fetchProgress.goal} />
            </div>
          )}
        </Section>

        {/* ── Error state ─────────────────────────────────────────────────── */}
        {state === 'error' && error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            <strong>Error:</strong> {error}
            <button
              onClick={() => setState('idle')}
              className="ml-3 underline underline-offset-2 hover:text-red-300"
            >
              Try again
            </button>
          </div>
        )}

        {/* ── Step 2: Player profile + game list ──────────────────────────── */}
        {fetchedData && state === 'fetched' && (
          <Section title="2. Your games" className="mt-6">
            <PlayerCard player={fetchedData.player} stats={fetchedData.stats} />

            <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {fetchedData.games.length} games ready
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    {capitalize(timeClass)} ·{' '}
                    {monthsBack === 1
                      ? 'Last month'
                      : monthsBack === 3
                      ? 'Last 3 months'
                      : 'Last year'}
                  </div>
                </div>
                <GameCountBadge count={fetchedData.games.length} />
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-4 text-sm text-slate-500">
                Your games will be analyzed locally using Stockfish — no data
                leaves your browser. Puzzles appear as each game is analyzed.
              </p>
              <button
                onClick={handleStartTraining}
                disabled={fetchedData.games.length === 0}
                className="flex items-center gap-2.5 rounded-xl bg-teal-500 px-6 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-teal-500/20 transition hover:bg-teal-400 disabled:opacity-40 active:scale-95"
              >
                ⚡ Start Training
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={clsx('rounded-xl border border-white/5 bg-white/[0.02] p-6', className)}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </h2>
      {children}
    </div>
  )
}

function FilterGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-slate-600">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'rounded-md px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'bg-teal-500 text-slate-900'
          : 'border border-white/10 text-slate-400 hover:border-white/20 hover:text-white',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {label}
    </button>
  )
}

function ProgressBar({
  value,
  max,
  className,
}: {
  value: number
  max: number
  className?: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-white/5', className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-teal-400',
        className
      )}
    />
  )
}

function PlayerCard({
  player,
  stats,
}: {
  player: ChessComPlayer
  stats: ChessComStats
}) {
  const ratings: Array<{ label: string; value: number | undefined }> = [
    { label: 'Blitz', value: getPlayerRating(stats, 'blitz') },
    { label: 'Rapid', value: getPlayerRating(stats, 'rapid') },
    { label: 'Bullet', value: getPlayerRating(stats, 'bullet') },
    { label: 'Daily', value: getPlayerRating(stats, 'daily') },
  ].filter((r) => r.value !== undefined)

  return (
    <div className="flex items-start gap-4">
      {player.avatar ? (
        // eslint-disable-next-line @next/next-intl/no-raw-text
        <img
          src={player.avatar}
          alt={player.username}
          className="h-12 w-12 rounded-full border border-white/10 object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/10 text-xl">
          ♛
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-base font-bold text-white">{player.username}</div>
        {player.name && (
          <div className="text-xs text-slate-500">{player.name}</div>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {ratings.map(({ label, value }) => (
            <div key={label} className="text-xs">
              <span className="text-slate-600">{label}:</span>{' '}
              <span className="font-semibold text-teal-400">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GameCountBadge({ count }: { count: number }) {
  return (
    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-teal-500/20 bg-teal-500/5 text-xl font-bold text-teal-400">
      {count}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'teal' | 'cyan' | 'red' | 'amber'
}) {
  const colorMap = {
    teal: 'text-teal-400',
    cyan: 'text-cyan-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
  }
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center">
      <div className={clsx('text-3xl font-extrabold tabular-nums', colorMap[color])}>
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-600">{label}</div>
    </div>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
