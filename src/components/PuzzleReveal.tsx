'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import type { Puzzle } from '@/types/puzzle'
import { DIFFICULTY_STYLES } from '@/lib/chess-utils'

interface PuzzleRevealProps {
  puzzle: Puzzle
  wasCorrect: boolean
  attemptCount: number
  onNext: () => void
  isLastPuzzle?: boolean
  className?: string
}

export function PuzzleReveal({
  puzzle,
  wasCorrect,
  attemptCount,
  onNext,
  isLastPuzzle,
  className,
}: PuzzleRevealProps) {
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)
  const [explanationLoading, setExplanationLoading] = useState(false)

  // Fetch AI explanation on mount
  useEffect(() => {
    // Only fetch for imported puzzles that have the extended fields
    if (!puzzle.playerMove) return

    setExplanationLoading(true)
    fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fen: puzzle.fen,
        bestMove: puzzle.bestMove,
        playerMove: puzzle.playerMove,
        evalBefore: puzzle.evalBefore ?? 0,
        evalAfter: puzzle.evalAfter ?? 0,
        side: puzzle.fen.includes(' b ') ? 'black' : 'white',
        moveNumber: 0,
        opponent: puzzle.opponent ?? 'opponent',
        pattern: puzzle.pattern ?? 'mistake',
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.explanation) setAiExplanation(data.explanation)
      })
      .catch(() => { /* fall back to template explanation */ })
      .finally(() => setExplanationLoading(false))
  }, [puzzle])

  const diff = DIFFICULTY_STYLES[puzzle.difficulty]

  const resultLabel = wasCorrect
    ? attemptCount === 1
      ? '✦ Brilliant'
      : 'Correct'
    : 'Revealed'

  const resultColor = wasCorrect
    ? attemptCount === 1
      ? 'text-teal-400'
      : 'text-emerald-400'
    : 'text-slate-400'

  const resultBg = wasCorrect
    ? attemptCount === 1
      ? 'border-teal-500/30 bg-teal-500/5'
      : 'border-emerald-500/30 bg-emerald-500/5'
    : 'border-slate-600/30 bg-slate-800/40'

  return (
    <div
      className={clsx(
        'animate-slide-up rounded-xl border p-5',
        resultBg,
        className
      )}
    >
      {/* Result header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className={clsx('text-xl font-bold', resultColor)}>
            {resultLabel}
          </div>
          {wasCorrect && attemptCount === 1 && (
            <div className="mt-0.5 text-xs text-teal-500/70">
              First try — no hesitation
            </div>
          )}
        </div>

        {/* Difficulty badge */}
        <span
          className={clsx(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
            diff.bg,
            diff.text,
            diff.border
          )}
        >
          {diff.label}
        </span>
      </div>

      {/* Game context */}
      <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <svg
            className="h-3 w-3 opacity-60"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM0 8a8 8 0 1116 0A8 8 0 010 8z" />
            <path d="M7.5 4a.5.5 0 01.5.5V8h2.5a.5.5 0 010 1H7.5A.5.5 0 017 8.5v-4a.5.5 0 01.5-.5z" />
          </svg>
          {puzzle.date}
        </span>
        <span className="text-slate-700">·</span>
        <span>
          vs{' '}
          <span className="font-medium text-slate-400">{puzzle.opponent}</span>
        </span>
      </div>

      {/* Pattern tag */}
      <div className="mb-3">
        <span className="inline-flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 text-[11px] font-mono font-medium uppercase tracking-widest text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
          {puzzle.pattern}
        </span>
      </div>

      {/* Explanation */}
      <div className="mb-5">
        {explanationLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="h-3 w-3 animate-spin rounded-full border border-white/10 border-t-teal-400" />
            Analyzing position…
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-slate-300">
            {aiExplanation ?? puzzle.explanation}
          </p>
        )}
      </div>

      {/* Attempts */}
      {attemptCount > 1 && (
        <div className="mb-4 text-xs text-slate-600">
          {attemptCount - (wasCorrect ? 1 : 0)} incorrect attempt
          {attemptCount > 2 ? 's' : ''}
        </div>
      )}

      {/* Next button */}
      {isLastPuzzle ? (
        <div className="flex flex-col gap-2">
          <div className="rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3 text-center text-sm text-slate-500">
            🎉 You&apos;ve completed all available puzzles!
          </div>
          <a
            href="/import"
            className="group flex w-full items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-3 text-sm font-semibold text-white transition-all duration-150 hover:bg-slate-600 active:scale-95"
          >
            Import More Games
          </a>
        </div>
      ) : (
        <button
          onClick={onNext}
          className="group flex w-full items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-3 text-sm font-semibold text-white transition-all duration-150 hover:bg-slate-600 active:scale-95"
        >
          Next Puzzle
          <svg
            className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
