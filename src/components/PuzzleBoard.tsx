'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { Piece } from 'react-chessboard/dist/chessboard/types'
import { clsx } from 'clsx'

import type { Puzzle, PuzzleStatus } from '@/types/puzzle'
import {
  parseUciMove,
  shouldFlipBoard,
  toUci,
} from '@/lib/chess-utils'
import { EvalBar } from '@/components/EvalBar'
import { PuzzleReveal } from '@/components/PuzzleReveal'
import { useStockfish } from '@/hooks/useStockfish'

interface PuzzleBoardProps {
  puzzle: Puzzle
  onSolve: () => void
  onNext: () => void
}

const BOARD_MAX = 720

export function PuzzleBoard({ puzzle, onSolve, onNext }: PuzzleBoardProps) {
  const [game, setGame] = useState(() => new Chess(puzzle.fen))
  const [status, setStatus] = useState<PuzzleStatus>('idle')
  const [attemptCount, setAttemptCount] = useState(0)
  const [boardShake, setBoardShake] = useState(false)
  const [highlightSquares, setHighlightSquares] = useState<
    Record<string, Record<string, string>>
  >({})
  const [optionSquares, setOptionSquares] = useState<
    Record<string, Record<string, string>>
  >({})
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [boardWidth, setBoardWidth] = useState(BOARD_MAX)
  const boardContainerRef = useRef<HTMLDivElement>(null)
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stockfish = useStockfish()
  const flipped = useMemo(() => shouldFlipBoard(puzzle.fen), [puzzle.fen])

  // Responsive board sizing
  useEffect(() => {
    function handleResize() {
      if (boardContainerRef.current) {
        const w = boardContainerRef.current.offsetWidth
        setBoardWidth(Math.min(w, BOARD_MAX))
      }
    }
    handleResize()
    const ro = new ResizeObserver(handleResize)
    if (boardContainerRef.current) ro.observe(boardContainerRef.current)
    return () => ro.disconnect()
  }, [])

  // Reset state when puzzle changes
  useEffect(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current)
    setGame(new Chess(puzzle.fen))
    setStatus('idle')
    setAttemptCount(0)
    setBoardShake(false)
    setHighlightSquares({})
    setOptionSquares({})
    setSelectedSquare(null)
  }, [puzzle.id, puzzle.fen])

  // Kick off Stockfish analysis when ready or puzzle changes
  useEffect(() => {
    if (stockfish.isReady) {
      stockfish.analyze(puzzle.fen, 16)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockfish.isReady, puzzle.id])

  const triggerShake = useCallback(() => {
    setBoardShake(true)
    shakeTimerRef.current = setTimeout(() => setBoardShake(false), 500)
  }, [])

  const clearHighlights = useCallback(() => {
    setHighlightSquares({})
    setOptionSquares({})
    setSelectedSquare(null)
  }, [])

  const showMoveHighlights = useCallback(
    (from: Square, to: Square, correct: boolean) => {
      const col = correct ? 'rgba(34,197,94' : 'rgba(239,68,68'
      setHighlightSquares({
        [from]: { background: `${col},0.35)` },
        [to]: { background: `${col},0.55)` },
      })
    },
    []
  )

  const attemptMove = useCallback(
    (from: Square, to: Square, promotion?: string): boolean => {
      if (status === 'correct' || status === 'revealed') return false

      const gameCopy = new Chess(game.fen())
      let move
      try {
        move = gameCopy.move({ from, to, promotion: promotion ?? 'q' })
      } catch {
        return false // illegal
      }
      if (!move) return false

      const uci = toUci(from, to, move.promotion)
      const isCorrect = uci === puzzle.bestMove

      setAttemptCount((c) => c + 1)
      setGame(gameCopy)
      showMoveHighlights(from, to, isCorrect)
      setOptionSquares({})
      setSelectedSquare(null)

      if (isCorrect) {
        setStatus('correct')
        stockfish.stop()
        onSolve()
      } else {
        setStatus('incorrect')
        triggerShake()
        // Revert after a moment so the user can try again
        retryTimerRef.current = setTimeout(() => {
          setGame(new Chess(puzzle.fen))
          setHighlightSquares({})
          setStatus('idle')
        }, 900)
      }

      return isCorrect
    },
    [status, game, puzzle, onSolve, stockfish, triggerShake, showMoveHighlights]
  )

  // Show legal moves for a selected piece
  const showLegalMoves = useCallback(
    (square: Square) => {
      const moves = game.moves({ square, verbose: true })
      if (!moves.length) return

      const highlights: Record<string, Record<string, string>> = {
        [square]: { background: 'rgba(0,201,167,0.25)' },
      }
      moves.forEach((m) => {
        const isCapture = !!game.get(m.to as Square)
        highlights[m.to] = {
          background: isCapture
            ? 'radial-gradient(circle, rgba(0,201,167,.9) 55%, transparent 55%)'
            : 'radial-gradient(circle, rgba(0,201,167,.4) 28%, transparent 28%)',
          borderRadius: '50%',
        }
      })
      setOptionSquares(highlights)
      setSelectedSquare(square)
    },
    [game]
  )

  // ─── Board event handlers ──────────────────────────────────────────────────

  function onSquareClick(square: Square) {
    if (status === 'correct' || status === 'revealed') return

    if (selectedSquare) {
      // Already have a piece selected → try to move
      const moved = attemptMove(selectedSquare, square)
      if (!moved) {
        // If they clicked a different friendly piece, re-select
        const piece = game.get(square)
        if (piece && piece.color === game.turn()) {
          showLegalMoves(square)
          return
        }
        // Clicked elsewhere — deselect
        clearHighlights()
      }
      return
    }

    // Nothing selected — try to select
    const piece = game.get(square)
    if (!piece || piece.color !== game.turn()) return
    showLegalMoves(square)
  }

  function onPieceDrop(
    sourceSquare: Square,
    targetSquare: Square,
    piece: Piece
  ): boolean {
    if (status === 'correct' || status === 'revealed') return false
    clearHighlights()

    // Auto-queen for pawn promotion
    const isPromotion =
      piece[1] === 'P' &&
      ((piece[0] === 'w' && targetSquare[1] === '8') ||
        (piece[0] === 'b' && targetSquare[1] === '1'))

    return attemptMove(sourceSquare, targetSquare, isPromotion ? 'q' : undefined)
  }

  function onPieceClick(piece: Piece, square: Square) {
    if (status === 'correct' || status === 'revealed') return
    if (piece[0] !== (game.turn() === 'w' ? 'w' : 'b')) return
    onSquareClick(square)
  }

  function handleReveal() {
    setStatus('revealed')
    const { from, to } = parseUciMove(puzzle.bestMove)
    setHighlightSquares({
      [from]: { background: 'rgba(0,201,167,0.35)' },
      [to]: { background: 'rgba(0,201,167,0.55)' },
    })
    setOptionSquares({})
    setSelectedSquare(null)
  }

  const isResolved = status === 'correct' || status === 'revealed'

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
      {/* ── Board column ─────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col items-center">
        {/* Turn indicator + reveal link */}
        <div className="mb-3 flex w-full items-center justify-between px-1">
          <TurnBadge turn={game.turn()} />
          {!isResolved && (
            <button
              onClick={handleReveal}
              className="text-xs text-slate-700 underline underline-offset-2 transition-colors hover:text-slate-400"
            >
              Show answer
            </button>
          )}
        </div>

        {/* Board + eval bar */}
        <div className={clsx('flex w-full items-stretch gap-2', boardShake && 'animate-shake')}>
          <EvalBar
            evaluation={stockfish.evaluation}
            isAnalyzing={stockfish.isAnalyzing}
            flipped={flipped}
          />

          <div ref={boardContainerRef} className="min-w-0 flex-1">
            <Chessboard
              id="puzzle-board"
              position={game.fen()}
              boardWidth={boardWidth}
              boardOrientation={flipped ? 'black' : 'white'}
              onSquareClick={onSquareClick}
              onPieceDrop={onPieceDrop}
              onPieceClick={onPieceClick}
              arePiecesDraggable={!isResolved}
              customSquareStyles={{ ...highlightSquares, ...optionSquares }}
              customBoardStyle={{
                borderRadius: '10px',
                boxShadow:
                  status === 'correct'
                    ? '0 0 0 3px rgba(34,197,94,0.5), 0 24px 64px -12px rgba(0,0,0,0.7)'
                    : '0 24px 64px -12px rgba(0,0,0,0.7)',
              }}
              customLightSquareStyle={{ backgroundColor: '#F0D9B5' }}
              customDarkSquareStyle={{ backgroundColor: '#B58863' }}
            />
          </div>
        </div>

        {/* Feedback pill */}
        <div className="mt-3 flex h-9 w-full items-center justify-center">
          <FeedbackPill status={status} firstTry={attemptCount === 1} />
        </div>
      </div>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <div className="w-full lg:w-72 xl:w-80">
        {isResolved ? (
          <PuzzleReveal
            puzzle={puzzle}
            wasCorrect={status === 'correct'}
            attemptCount={attemptCount}
            onNext={onNext}
          />
        ) : (
          <PuzzleInfoPanel
            puzzle={puzzle}
            attemptCount={attemptCount}
            evalDisplay={
              stockfish.evaluation !== null
                ? stockfish.evaluation > 0
                  ? `+${stockfish.evaluation.toFixed(1)}`
                  : stockfish.evaluation.toFixed(1)
                : null
            }
          />
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function TurnBadge({ turn }: { turn: 'w' | 'b' }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={clsx(
          'inline-block h-3 w-3 rounded-full border-2',
          turn === 'w'
            ? 'border-slate-400 bg-white'
            : 'border-slate-600 bg-slate-900'
        )}
      />
      <span className="font-medium text-slate-300">
        {turn === 'w' ? 'White' : 'Black'}
      </span>
      <span className="text-slate-600">to move</span>
    </div>
  )
}

function FeedbackPill({
  status,
  firstTry,
}: {
  status: PuzzleStatus
  firstTry: boolean
}) {
  if (status === 'incorrect') {
    return (
      <div className="animate-fade-in flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-1.5 text-sm font-medium text-red-400">
        <span aria-hidden>✗</span> Not quite — try again
      </div>
    )
  }
  if (status === 'correct') {
    return (
      <div
        className={clsx(
          'animate-pop-in flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold',
          firstTry
            ? 'bg-teal-500/10 text-teal-300'
            : 'bg-emerald-500/10 text-emerald-400'
        )}
      >
        <span aria-hidden>✓</span>
        {firstTry ? '✦ Brilliant! First try.' : 'Correct!'}
      </div>
    )
  }
  if (status === 'revealed') {
    return (
      <div className="animate-fade-in flex items-center gap-2 rounded-full bg-slate-700/50 px-4 py-1.5 text-sm font-medium text-slate-400">
        <span aria-hidden>↑</span> Answer revealed
      </div>
    )
  }
  return null
}

function PuzzleInfoPanel({
  puzzle,
  attemptCount,
  evalDisplay,
}: {
  puzzle: Puzzle
  attemptCount: number
  evalDisplay: string | null
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-900/60 p-5">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-300">Your Puzzle</h3>
      </div>

      {/* Instruction */}
      <div className="mb-5 rounded-lg border border-white/5 bg-white/[0.03] p-3.5 text-sm leading-relaxed text-slate-500">
        Find the best move for{' '}
        <strong className="font-semibold text-slate-300">
          {puzzle.fen.includes(' b ') ? 'Black' : 'White'}
        </strong>
        .{' '}
        <span className="text-slate-600">
          Drag a piece or click to select, then click a destination.
        </span>
      </div>

      {/* Stockfish eval — fine to show (it's about the position, not who you played) */}
      {evalDisplay && (
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-slate-600">Stockfish eval</span>
          <span
            className={clsx(
              'font-mono text-sm font-bold',
              parseFloat(evalDisplay) > 0 ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {evalDisplay}
          </span>
        </div>
      )}

      {/* Attempt counter */}
      {attemptCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-700">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500/60" />
          {attemptCount} incorrect attempt{attemptCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
