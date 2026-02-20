export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Puzzle {
  id: string
  /** FEN string for the starting position */
  fen: string
  /** Best move in UCI format (e.g. "e2e4", "g1f3", "e7e8q") */
  bestMove: string
  /** Human-readable explanation shown after solving */
  explanation: string
  /** Tactical pattern label */
  pattern: string
  /** Difficulty rating */
  difficulty: Difficulty
  /** Opponent's display name */
  opponent: string
  /** Date of the game (display string) */
  date: string
  // ── Extended fields for imported puzzles (all optional) ──────────────────
  /** The move the player actually played (UCI format) */
  playerMove?: string
  /** Opponent's rating */
  opponentRating?: number
  /** Time control string (e.g. "300+0") */
  timeControl?: string
  /** Which side the player played */
  playedAs?: 'white' | 'black'
  /** Eval drop that caused this puzzle (positive = bad for the player) */
  evalDelta?: number
  /** Eval before the player's move */
  evalBefore?: number
  /** Eval after the player's move */
  evalAfter?: number
  /** Opening name (from ECO headers) */
  opening?: string
}

export type PuzzleStatus = 'idle' | 'incorrect' | 'correct' | 'revealed'

export interface MoveAttempt {
  from: string
  to: string
  promotion?: string
  uci: string
  correct: boolean
  timestamp: number
}
