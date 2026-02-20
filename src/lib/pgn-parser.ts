import { Chess } from 'chess.js'

// ── Types ───────────────────────────────────────────────────────────────────

export interface PgnHeaders {
  Event?: string
  Site?: string
  Date?: string
  White?: string
  Black?: string
  Result?: string
  WhiteElo?: string
  BlackElo?: string
  TimeControl?: string
  ECO?: string
  ECOUrl?: string
  Opening?: string
  Termination?: string
  [key: string]: string | undefined
}

export interface ParsedMove {
  /** Standard algebraic notation */
  san: string
  /** UCI format (e.g. "e2e4", "e7e8q") */
  uci: string
  /** FEN string AFTER this move */
  fen: string
  /** FEN string BEFORE this move */
  fenBefore: string
  /** Full move number (1-based) */
  moveNumber: number
  /** Which side made this move */
  side: 'white' | 'black'
  /** Seconds remaining on the clock after this move (from {[%clk]} annotation) */
  clockAfter?: number
  /** Seconds spent on this move */
  timeSpent?: number
}

export interface ParsedGame {
  headers: PgnHeaders
  moves: ParsedMove[]
  white: string
  black: string
  whiteElo?: number
  blackElo?: number
  result: string
  opening?: string
  timeControl?: string
  /** Raw date string from PGN (e.g. "2026.02.20") */
  date?: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse a clock annotation like "0:05:00" or "4:59" into seconds.
 */
export function parseClockTime(clk: string): number {
  const parts = clk.trim().split(':').map(Number)
  if (parts.length === 3) {
    const h = parts[0] ?? 0
    const m = parts[1] ?? 0
    const s = parts[2] ?? 0
    return h * 3600 + m * 60 + s
  }
  if (parts.length === 2) {
    const m = parts[0] ?? 0
    const s = parts[1] ?? 0
    return m * 60 + s
  }
  return 0
}

/**
 * Parse PGN tag headers into a plain object.
 */
export function parsePgnHeaders(pgn: string): PgnHeaders {
  const headers: PgnHeaders = {}
  const re = /\[(\w+)\s+"([^"]*)"\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(pgn)) !== null) {
    const key = m[1]
    const val = m[2]
    if (key !== undefined && val !== undefined) {
      headers[key] = val
    }
  }
  return headers
}

/**
 * Extract all {[%clk H:MM:SS]} clock times from a PGN string, in move order.
 */
export function extractClockTimes(pgn: string): number[] {
  const times: number[] = []
  const re = /\[%clk\s+(\d+:\d+(?::\d+)?)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(pgn)) !== null) {
    const t = m[1]
    if (t !== undefined) times.push(parseClockTime(t))
  }
  return times
}

/**
 * Parse a full PGN string and return structured game data.
 * Returns null if the PGN cannot be parsed.
 */
export function parsePgn(pgn: string): ParsedGame | null {
  try {
    const headers = parsePgnHeaders(pgn)
    const clocks = extractClockTimes(pgn)

    const chess = new Chess()
    chess.loadPgn(pgn)
    const history = chess.history({ verbose: true })

    if (history.length === 0) return null

    // Replay from the start so we can capture FEN before/after each move
    const replay = new Chess()
    const moves: ParsedMove[] = []

    for (let i = 0; i < history.length; i++) {
      const move = history[i]
      if (!move) continue

      const fenBefore = replay.fen()

      replay.move({ from: move.from, to: move.to, promotion: move.promotion })

      const fenAfter = replay.fen()
      const uci = `${move.from}${move.to}${move.promotion ?? ''}`

      const clockAfter = clocks[i]
      const clockBefore = i > 0 ? clocks[i - 1] : undefined
      const timeSpent =
        clockBefore !== undefined && clockAfter !== undefined
          ? Math.max(0, clockBefore - clockAfter)
          : undefined

      moves.push({
        san: move.san,
        uci,
        fen: fenAfter,
        fenBefore,
        moveNumber: Math.floor(i / 2) + 1,
        side: i % 2 === 0 ? 'white' : 'black',
        clockAfter,
        timeSpent,
      })
    }

    return {
      headers,
      moves,
      white: headers.White ?? 'Unknown',
      black: headers.Black ?? 'Unknown',
      whiteElo: headers.WhiteElo ? parseInt(headers.WhiteElo) : undefined,
      blackElo: headers.BlackElo ? parseInt(headers.BlackElo) : undefined,
      result: headers.Result ?? '*',
      opening: headers.Opening,
      timeControl: headers.TimeControl,
      date: headers.Date,
    }
  } catch (err) {
    console.warn('[parsePgn] Failed to parse PGN:', err)
    return null
  }
}

/**
 * Format a PGN date string ("2026.02.20") as a human-readable string ("Feb 20, 2026").
 */
export function formatPgnDate(pgnDate: string): string {
  const [year, month, day] = pgnDate.split('.').map(Number)
  if (!year || !month || !day) return pgnDate
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
