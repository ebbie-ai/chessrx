import { describe, it, expect } from 'vitest'
import {
  parseClockTime,
  parsePgnHeaders,
  extractClockTimes,
  parsePgn,
  formatPgnDate,
} from '@/lib/pgn-parser'

// ── Sample PGN for testing ────────────────────────────────────────────────────

const SAMPLE_PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.02.15"]
[Round "-"]
[White "testplayer"]
[Black "opponent123"]
[Result "1-0"]
[WhiteElo "1500"]
[BlackElo "1450"]
[TimeControl "300+0"]
[ECO "C50"]
[ECOUrl "https://www.chess.com/openings/Italian-Game"]
[Opening "Italian Game"]
[Termination "testplayer won by checkmate"]

1. e4 {[%clk 0:05:00]} 1... e5 {[%clk 0:05:00]} 2. Nf3 {[%clk 0:04:58]} 2... Nc6 {[%clk 0:04:59]} 3. Bc4 {[%clk 0:04:56]} 3... Bc5 {[%clk 0:04:57]} 4. O-O {[%clk 0:04:53]} 4... Nf6 {[%clk 0:04:54]} 1-0`

// ── parseClockTime ───────────────────────────────────────────────────────────

describe('parseClockTime', () => {
  it('parses H:MM:SS format', () => {
    expect(parseClockTime('0:05:00')).toBe(300)
    expect(parseClockTime('1:00:00')).toBe(3600)
    expect(parseClockTime('0:04:58')).toBe(298)
    expect(parseClockTime('0:00:30')).toBe(30)
    expect(parseClockTime('0:00:05')).toBe(5)
  })

  it('parses MM:SS format', () => {
    expect(parseClockTime('5:00')).toBe(300)
    expect(parseClockTime('4:58')).toBe(298)
    expect(parseClockTime('0:30')).toBe(30)
  })

  it('handles zero time', () => {
    expect(parseClockTime('0:00:00')).toBe(0)
    expect(parseClockTime('0:00')).toBe(0)
  })
})

// ── parsePgnHeaders ──────────────────────────────────────────────────────────

describe('parsePgnHeaders', () => {
  it('extracts all standard headers', () => {
    const headers = parsePgnHeaders(SAMPLE_PGN)
    expect(headers.Event).toBe('Live Chess')
    expect(headers.Site).toBe('Chess.com')
    expect(headers.Date).toBe('2026.02.15')
    expect(headers.White).toBe('testplayer')
    expect(headers.Black).toBe('opponent123')
    expect(headers.Result).toBe('1-0')
    expect(headers.WhiteElo).toBe('1500')
    expect(headers.BlackElo).toBe('1450')
    expect(headers.TimeControl).toBe('300+0')
    expect(headers.ECO).toBe('C50')
    expect(headers.Opening).toBe('Italian Game')
    expect(headers.Termination).toBe('testplayer won by checkmate')
  })

  it('returns empty object for empty PGN', () => {
    const headers = parsePgnHeaders('')
    expect(Object.keys(headers)).toHaveLength(0)
  })

  it('handles headers with special characters in values', () => {
    const pgn = `[Event "Game vs O'Brien"]\n[White "player1"]`
    const headers = parsePgnHeaders(pgn)
    expect(headers.White).toBe('player1')
  })
})

// ── extractClockTimes ────────────────────────────────────────────────────────

describe('extractClockTimes', () => {
  it('extracts clock times in move order', () => {
    const clocks = extractClockTimes(SAMPLE_PGN)
    // 8 moves → 8 clock annotations
    expect(clocks).toHaveLength(8)
    expect(clocks[0]).toBe(300) // 0:05:00
    expect(clocks[1]).toBe(300) // 0:05:00
    expect(clocks[2]).toBe(298) // 0:04:58
    expect(clocks[3]).toBe(299) // 0:04:59
    expect(clocks[4]).toBe(296) // 0:04:56
    expect(clocks[5]).toBe(297) // 0:04:57
    expect(clocks[6]).toBe(293) // 0:04:53
    expect(clocks[7]).toBe(294) // 0:04:54
  })

  it('returns empty array when no clock annotations', () => {
    const pgn = `[White "a"]\n1. e4 e5 2. Nf3 Nc6 *`
    expect(extractClockTimes(pgn)).toHaveLength(0)
  })
})

// ── parsePgn ─────────────────────────────────────────────────────────────────

describe('parsePgn', () => {
  it('parses a valid PGN into a structured game', () => {
    const game = parsePgn(SAMPLE_PGN)
    expect(game).not.toBeNull()
    if (!game) return

    expect(game.white).toBe('testplayer')
    expect(game.black).toBe('opponent123')
    expect(game.whiteElo).toBe(1500)
    expect(game.blackElo).toBe(1450)
    expect(game.result).toBe('1-0')
    expect(game.opening).toBe('Italian Game')
    expect(game.timeControl).toBe('300+0')
    expect(game.date).toBe('2026.02.15')
  })

  it('returns the correct number of moves', () => {
    const game = parsePgn(SAMPLE_PGN)
    expect(game).not.toBeNull()
    // 4 full moves = 8 half-moves
    expect(game!.moves).toHaveLength(8)
  })

  it('each move has the correct structure', () => {
    const game = parsePgn(SAMPLE_PGN)
    if (!game) throw new Error('parsePgn returned null')

    for (const move of game.moves) {
      expect(move.san).toBeTruthy()
      expect(move.uci).toMatch(/^[a-h][1-8][a-h][1-8][qrbnQRBN]?$/)
      expect(move.fen).toBeTruthy()
      expect(move.fenBefore).toBeTruthy()
      expect(move.moveNumber).toBeGreaterThan(0)
      expect(['white', 'black']).toContain(move.side)
    }
  })

  it('assigns correct sides to moves', () => {
    const game = parsePgn(SAMPLE_PGN)
    if (!game) throw new Error('parsePgn returned null')

    expect(game.moves[0]?.side).toBe('white') // 1. e4
    expect(game.moves[1]?.side).toBe('black') // 1... e5
    expect(game.moves[2]?.side).toBe('white') // 2. Nf3
    expect(game.moves[3]?.side).toBe('black') // 2... Nc6
  })

  it('assigns correct move numbers', () => {
    const game = parsePgn(SAMPLE_PGN)
    if (!game) throw new Error('parsePgn returned null')

    expect(game.moves[0]?.moveNumber).toBe(1)
    expect(game.moves[1]?.moveNumber).toBe(1)
    expect(game.moves[2]?.moveNumber).toBe(2)
    expect(game.moves[3]?.moveNumber).toBe(2)
    expect(game.moves[4]?.moveNumber).toBe(3)
  })

  it('extracts clock times for each move', () => {
    const game = parsePgn(SAMPLE_PGN)
    if (!game) throw new Error('parsePgn returned null')

    expect(game.moves[0]?.clockAfter).toBe(300) // 0:05:00 after 1.e4
    expect(game.moves[2]?.clockAfter).toBe(298) // 0:04:58 after 2.Nf3
  })

  it('calculates time spent per move', () => {
    const game = parsePgn(SAMPLE_PGN)
    if (!game) throw new Error('parsePgn returned null')

    // Move 0: first move, no previous clock — no timeSpent
    expect(game.moves[0]?.timeSpent).toBeUndefined()
    // Move 2 (2.Nf3): clockBefore=300 (clocks[1]=0:05:00), clockAfter=298 (0:04:58) → 2s spent
    expect(game.moves[2]?.timeSpent).toBe(2)
    // Move 3 (2...Nc6): clockBefore=clocks[2]=298, clockAfter=299
    // Player gained time (e.g. increment); timeSpent = max(0, 298-299) = 0
    expect(game.moves[3]?.timeSpent).toBe(0)
  })

  it('FEN before first move is the starting position', () => {
    const game = parsePgn(SAMPLE_PGN)
    if (!game) throw new Error('parsePgn returned null')

    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    expect(game.moves[0]?.fenBefore).toBe(startFen)
  })

  it('returns null for invalid PGN', () => {
    expect(parsePgn('this is not pgn')).toBeNull()
    expect(parsePgn('')).toBeNull()
  })

  it('first move UCI is e2e4', () => {
    const game = parsePgn(SAMPLE_PGN)
    if (!game) throw new Error('parsePgn returned null')
    expect(game.moves[0]?.uci).toBe('e2e4')
  })
})

// ── formatPgnDate ─────────────────────────────────────────────────────────────

describe('formatPgnDate', () => {
  it('formats a PGN date string correctly', () => {
    const formatted = formatPgnDate('2026.02.15')
    expect(formatted).toBe('Feb 15, 2026')
  })

  it('returns the raw string for unrecognized formats', () => {
    expect(formatPgnDate('??')).toBe('??')
  })
})
