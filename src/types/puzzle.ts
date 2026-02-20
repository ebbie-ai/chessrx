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
  /** Opponent's display name (mock game context) */
  opponent: string
  /** Date of the game (display string) */
  date: string
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
