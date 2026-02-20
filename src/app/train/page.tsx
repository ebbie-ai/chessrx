'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import { PUZZLES } from '@/data/puzzles'
import {
  analyzeGames,
  criticalPositionToPuzzle,
  IMPORTED_GAMES_KEY,
  IMPORTED_PUZZLES_KEY,
  saveImportedPuzzles,
  type AnalysisProgress,
  type GameToAnalyze,
} from '@/lib/game-analyzer'
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

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const analysisStartedRef = useRef(false)
  const puzzleCounterRef = useRef(0)

  // On mount: check for unanalyzed games in localStorage, run analysis
  useEffect(() => {
    // First check if we already have puzzles from a previous session
    try {
      const existingPuzzles = localStorage.getItem(IMPORTED_PUZZLES_KEY)
      if (existingPuzzles) {
        const parsed = JSON.parse(existingPuzzles) as Puzzle[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPuzzles(parsed)
          setHasImported(true)
          const first = parsed[0]
          if (first) setCurrentPuzzle(first)
        }
      }
    } catch { /* ignore */ }

    // Then check for games to analyze
    try {
      const gamesRaw = localStorage.getItem(IMPORTED_GAMES_KEY)
      if (!gamesRaw || analysisStartedRef.current) return
      const games = JSON.parse(gamesRaw) as GameToAnalyze[]
      if (!Array.isArray(games) || games.length === 0) return

      // Clear the games key so we don't re-analyze on next mount
      localStorage.removeItem(IMPORTED_GAMES_KEY)
      // Clear any stale puzzles from previous analysis
      localStorage.removeItem(IMPORTED_PUZZLES_KEY)
      analysisStartedRef.current = true

      // Shuffle games for variety
      for (let i = games.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = games[i]!
        games[i] = games[j]!
        games[j] = tmp
      }

      setIsAnalyzing(true)
      setPuzzles([]) // reset to empty — will fill as analysis streams
      setHasImported(true)

      analyzeGames(games, {
        depth: 12,
        evalThreshold: 1.0,
        skipOpeningMoves: 8,
        onProgress: (progress) => setAnalysisProgress(progress),
        onPuzzleFound: (pos) => {
          const puzzle = criticalPositionToPuzzle(pos, puzzleCounterRef.current++)
          setPuzzles((prev) => {
            const updated = [...prev, puzzle]
            saveImportedPuzzles(updated)
            return updated
          })
          // Auto-set first puzzle when it arrives
          setCurrentPuzzle((prev) => {
            if (prev.id.startsWith('imported_')) return prev
            return puzzle
          })
        },
      }).then(() => {
        setIsAnalyzing(false)
        setAnalysisComplete(true)
        // Final shuffle
        setPuzzles((prev) => {
          const shuffled = [...prev]
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            const tmp = shuffled[i]!
            shuffled[i] = shuffled[j]!
            shuffled[j] = tmp
          }
          saveImportedPuzzles(shuffled)
          return shuffled
        })
      }).catch((err) => {
        console.error('Analysis failed:', err)
        setIsAnalyzing(false)
      })
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSolve = useCallback(() => {
    setSolvedCount((c) => c + 1)
    setSessionHistory((h) => [...h, { id: currentPuzzle.id, correct: true }])
  }, [currentPuzzle.id])

  const isLastPuzzle = (() => {
    const list = hasImported ? puzzles : PUZZLES
    const idx = list.findIndex((p) => p.id === currentPuzzle.id)
    return !isAnalyzing && (list.length <= 1 || idx === list.length - 1)
  })()

  const handleNext = useCallback(() => {
    setCurrentPuzzle((prev) => {
      const list = hasImported ? puzzles : PUZZLES
      const idx = list.findIndex((p) => p.id === prev.id)
      const nextIdx = idx === -1 ? 0 : (idx + 1) % list.length
      const next = list[nextIdx]
      if (!next || next.id === prev.id) return prev
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
              {isAnalyzing ? (
                <>
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-teal-400 mr-1.5" />
                  <span className="text-teal-400">Analyzing your games…</span>
                  {totalPuzzles > 0 && <> · {totalPuzzles} puzzle{totalPuzzles > 1 ? 's' : ''} so far</>}
                </>
              ) : hasImported ? (
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
        {/* Analysis progress banner */}
        {isAnalyzing && (
          <div className="mb-6 rounded-lg border border-teal-500/20 bg-teal-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-teal-400" />
              <span className="text-sm font-medium text-slate-300">
                {analysisProgress?.status ?? 'Initializing Stockfish…'}
              </span>
            </div>
            {analysisProgress && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, ((analysisProgress.gameIndex + 1) / analysisProgress.totalGames) * 100)}%`,
                  }}
                />
              </div>
            )}
            {totalPuzzles === 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Your first puzzle will appear momentarily…
              </p>
            )}
          </div>
        )}

        {/* Waiting for first puzzle */}
        {hasImported && totalPuzzles === 0 && isAnalyzing && (
          <div className="flex h-[560px] w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-teal-400" />
              <p className="text-sm text-slate-500">Analyzing your games…</p>
              <p className="text-xs text-slate-600">First puzzle coming soon</p>
            </div>
          </div>
        )}

        {/* Puzzle navigation breadcrumb + board (only when puzzles exist) */}
        {totalPuzzles > 0 && (
          <>
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
          </>
        )}

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
