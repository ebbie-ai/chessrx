'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { PUZZLES } from '@/data/puzzles'
import { IMPORTED_PUZZLES_KEY } from '@/lib/game-analyzer'
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
  // Try to load imported puzzles from localStorage on mount
  const [puzzles, setPuzzles] = useState<Puzzle[]>(PUZZLES)
  const [hasImported, setHasImported] = useState(false)
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle>(() => {
    const first = PUZZLES[0]
    if (!first) throw new Error('No puzzles available')
    return first
  })
  const [solvedCount, setSolvedCount] = useState(0)
  const [sessionHistory, setSessionHistory] = useState<
    Array<{ id: string; correct: boolean }>
  >([])

  // Load imported puzzles from localStorage and poll for new ones (streaming UX)
  useEffect(() => {
    function loadFromStorage() {
      try {
        const raw = localStorage.getItem(IMPORTED_PUZZLES_KEY)
        if (raw) {
          const imported = JSON.parse(raw) as Puzzle[]
          if (Array.isArray(imported) && imported.length > 0) {
            setPuzzles((prev) => {
              // Only update if count changed (new puzzles arrived)
              if (prev.length === imported.length && prev[0]?.id === imported[0]?.id) return prev
              return imported
            })
            setHasImported(true)
            // Set first puzzle only on initial load
            setCurrentPuzzle((prev) => {
              if (prev.id.startsWith('imported_')) return prev // already on imported puzzle
              const first = imported[0]
              return first ?? prev
            })
          }
        }
      } catch {
        // localStorage unavailable or corrupt
      }
    }

    loadFromStorage()
    // Poll every 2s for new puzzles arriving from ongoing analysis
    const interval = setInterval(loadFromStorage, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleSolve = useCallback(() => {
    setSolvedCount((c) => c + 1)
    setSessionHistory((h) => [...h, { id: currentPuzzle.id, correct: true }])
  }, [currentPuzzle.id])

  const isLastPuzzle = (() => {
    const list = hasImported ? puzzles : PUZZLES
    const idx = list.findIndex((p) => p.id === currentPuzzle.id)
    return list.length <= 1 || idx === list.length - 1
  })()

  const handleNext = useCallback(() => {
    setCurrentPuzzle((prev) => {
      const list = hasImported ? puzzles : PUZZLES
      const idx = list.findIndex((p) => p.id === prev.id)
      const nextIdx = idx === -1 ? 0 : (idx + 1) % list.length
      const next = list[nextIdx]
      if (!next || next.id === prev.id) return prev // no next available
      return next
    })
  }, [hasImported, puzzles])

  const totalPuzzles = puzzles.length
  const puzzleIndex = puzzles.findIndex((p) => p.id === currentPuzzle.id)

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-950">
      {/* Page header */}
      <div className="border-b border-white/5 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-white">Puzzle Training</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {hasImported ? (
                <>
                  <span className="text-teal-400">Your imported puzzles</span>
                  {' · '}
                  {puzzleIndex + 1} of {totalPuzzles}
                </>
              ) : (
                <>
                  {puzzleIndex + 1} of {totalPuzzles} sample puzzles
                  {' · '}
                  <Link href="/import" className="text-teal-400 hover:underline">
                    Import your games
                  </Link>
                </>
              )}
            </p>
          </div>

          {/* Session stats */}
          <div className="flex items-center gap-4">
            <SessionStat label="Solved" value={solvedCount} color="teal" />
            <div className="hidden h-6 w-px bg-white/5 sm:block" />
            <SessionStat label="Remaining" value={totalPuzzles - puzzleIndex - 1} color="slate" />
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
          {puzzles.map((p, i) => {
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
          isLastPuzzle={isLastPuzzle}
        />

        {/* Tips footer */}
        <div className="mt-12 border-t border-white/5 pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Tip icon="🖱️" text="Drag or click to move pieces" />
            <Tip icon="↺" text="Wrong moves reset automatically — keep trying" />
            <Tip icon="⚡" text="Stockfish analyzes the position in real time" />
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
      <div className="text-[10px] uppercase tracking-widest text-slate-600">{label}</div>
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
