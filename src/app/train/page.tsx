'use client'

import dynamic from 'next/dynamic'
import { useCallback, useState } from 'react'

import { PUZZLES, getNextPuzzle } from '@/data/puzzles'
import type { Puzzle } from '@/types/puzzle'

// Dynamically import PuzzleBoard (no SSR) — required for chess.js & react-chessboard
const PuzzleBoard = dynamic(
  () => import('@/components/PuzzleBoard').then((m) => m.PuzzleBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[560px] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-teal-400" />
          <p className="text-sm text-slate-500">Loading board…</p>
        </div>
      </div>
    ),
  }
)

export default function TrainPage() {
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle>(() => {
    const first = PUZZLES[0]
    if (!first) throw new Error('No puzzles available')
    return first
  })
  const [solvedCount, setSolvedCount] = useState(0)
  const [sessionHistory, setSessionHistory] = useState<
    Array<{ id: string; correct: boolean }>
  >([])

  const handleSolve = useCallback(() => {
    setSolvedCount((c) => c + 1)
    setSessionHistory((h) => [
      ...h,
      { id: currentPuzzle.id, correct: true },
    ])
  }, [currentPuzzle.id])

  const handleNext = useCallback(() => {
    setCurrentPuzzle((p) => getNextPuzzle(p.id))
  }, [])

  const totalPuzzles = PUZZLES.length
  const puzzleIndex = PUZZLES.findIndex((p) => p.id === currentPuzzle.id)

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-950">
      {/* Page header */}
      <div className="border-b border-white/5 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-white">Puzzle Training</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {puzzleIndex + 1} of {totalPuzzles} puzzles in this session
            </p>
          </div>

          {/* Session stats */}
          <div className="flex items-center gap-4">
            <SessionStat label="Solved" value={solvedCount} color="teal" />
            <div className="hidden h-6 w-px bg-white/5 sm:block" />
            <SessionStat
              label="Remaining"
              value={totalPuzzles - puzzleIndex - (solvedCount > 0 ? 0 : 0)}
              color="slate"
            />
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 w-full bg-slate-900">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-700"
            style={{
              width: `${((puzzleIndex + 1) / totalPuzzles) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Puzzle navigation breadcrumb */}
        <div className="mb-6 flex items-center gap-1.5">
          {PUZZLES.map((p, i) => {
            const isActive = p.id === currentPuzzle.id
            const isSolved = sessionHistory.some((h) => h.id === p.id && h.correct)
            const isPast = i < puzzleIndex

            return (
              <button
                key={p.id}
                onClick={() => setCurrentPuzzle(p)}
                className={`relative h-2 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'w-8 bg-teal-400'
                    : isSolved
                    ? 'w-2 bg-emerald-500'
                    : isPast
                    ? 'w-2 bg-slate-700'
                    : 'w-2 bg-slate-800 hover:bg-slate-700'
                }`}
                title={`Puzzle ${i + 1}: ${p.difficulty}`}
              />
            )
          })}
        </div>

        {/* Board */}
        <PuzzleBoard
          key={currentPuzzle.id}
          puzzle={currentPuzzle}
          onSolve={handleSolve}
          onNext={handleNext}
        />

        {/* Tips footer */}
        <div className="mt-12 border-t border-white/5 pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Tip
              icon="🖱️"
              text="Drag or click to move pieces"
            />
            <Tip
              icon="↺"
              text="Wrong moves reset automatically — keep trying"
            />
            <Tip
              icon="⚡"
              text="Stockfish analyzes the position in real time"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function SessionStat({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'teal' | 'slate'
}) {
  return (
    <div className="text-center">
      <div
        className={`text-xl font-bold tabular-nums ${
          color === 'teal' ? 'text-teal-400' : 'text-white'
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-slate-600">
        {label}
      </div>
    </div>
  )
}

function Tip({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5 text-xs text-slate-600">
      <span className="mt-px text-base leading-none">{icon}</span>
      <span className="leading-relaxed">{text}</span>
    </div>
  )
}
