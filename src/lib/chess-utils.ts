import type { Square } from 'chess.js'
import type { Difficulty } from '@/types/puzzle'

/**
 * Convert a UCI move string (e.g. "e2e4", "e7e8q") into chess.js move components.
 */
export function parseUciMove(uci: string): {
  from: Square
  to: Square
  promotion?: string
} {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci[4] || undefined,
  }
}

/**
 * Convert a chess.js move object's from/to/promotion into UCI string.
 */
export function toUci(from: string, to: string, promotion?: string): string {
  return `${from}${to}${promotion ?? ''}`
}

/**
 * Get the side to move from a FEN string ('w' | 'b').
 */
export function sideToMove(fen: string): 'w' | 'b' {
  return fen.split(' ')[1] as 'w' | 'b'
}

/**
 * Returns true if the board should be flipped (i.e. Black to move in a puzzle
 * means we show Black's perspective so the active pieces are at the bottom).
 */
export function shouldFlipBoard(fen: string): boolean {
  return sideToMove(fen) === 'b'
}

/**
 * Clamp a centipawn evaluation to a displayable range and return a
 * percentage from 0 to 100 representing White's advantage (50 = equal).
 */
export function evalToPercent(cp: number): number {
  // Sigmoid-like mapping: cp=0 → 50%, cp=±500 → ~85%/15%
  const clamped = Math.max(-1000, Math.min(1000, cp))
  return 50 + (50 * Math.tanh(clamped / 300))
}

export type DifficultyColor = {
  bg: string
  text: string
  border: string
  label: string
}

export const DIFFICULTY_STYLES: Record<Difficulty, DifficultyColor> = {
  easy: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    label: 'Easy',
  },
  medium: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    label: 'Medium',
  },
  hard: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    label: 'Hard',
  },
}
