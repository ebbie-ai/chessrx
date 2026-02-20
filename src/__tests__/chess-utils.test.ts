import { describe, it, expect } from 'vitest'
import {
  parseUciMove,
  toUci,
  shouldFlipBoard,
  sideToMove,
  evalToPercent,
} from '@/lib/chess-utils'

// FEN fixtures
const WHITE_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
const BLACK_TO_MOVE = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('parseUciMove', () => {
  it('parses a simple pawn move', () => {
    expect(parseUciMove('e2e4')).toEqual({ from: 'e2', to: 'e4', promotion: undefined })
  })

  it('parses a knight move', () => {
    expect(parseUciMove('g1f3')).toEqual({ from: 'g1', to: 'f3', promotion: undefined })
  })

  it('parses a promotion move (queen)', () => {
    expect(parseUciMove('e7e8q')).toEqual({ from: 'e7', to: 'e8', promotion: 'q' })
  })

  it('parses a promotion move (knight)', () => {
    expect(parseUciMove('a7a8n')).toEqual({ from: 'a7', to: 'a8', promotion: 'n' })
  })

  it('parses a capture move', () => {
    expect(parseUciMove('d5e6')).toEqual({ from: 'd5', to: 'e6', promotion: undefined })
  })

  it('parses back-rank captures', () => {
    expect(parseUciMove('h5f7')).toEqual({ from: 'h5', to: 'f7', promotion: undefined })
  })
})

describe('toUci', () => {
  it('converts simple move to UCI', () => {
    expect(toUci('e2', 'e4')).toBe('e2e4')
  })

  it('converts promotion move to UCI', () => {
    expect(toUci('e7', 'e8', 'q')).toBe('e7e8q')
  })

  it('omits promotion when undefined', () => {
    expect(toUci('g1', 'f3', undefined)).toBe('g1f3')
  })

  it('round-trips with parseUciMove', () => {
    const uci = 'e7e8q'
    const { from, to, promotion } = parseUciMove(uci)
    expect(toUci(from, to, promotion)).toBe(uci)
  })

  it('round-trips a plain move', () => {
    const uci = 'g1f3'
    const { from, to, promotion } = parseUciMove(uci)
    expect(toUci(from, to, promotion)).toBe(uci)
  })
})

describe('sideToMove', () => {
  it('returns "w" for white to move', () => {
    expect(sideToMove(START_FEN)).toBe('w')
  })

  it('returns "b" for black to move', () => {
    expect(sideToMove(BLACK_TO_MOVE)).toBe('b')
  })

  it('handles the Fool\'s Mate FEN (black to move)', () => {
    const fen = 'rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR b KQkq - 1 3'
    expect(sideToMove(fen)).toBe('b')
  })
})

describe('shouldFlipBoard', () => {
  it('returns false for white to move (no flip needed)', () => {
    expect(shouldFlipBoard(START_FEN)).toBe(false)
  })

  it('returns true for black to move (flip to show black perspective)', () => {
    expect(shouldFlipBoard(WHITE_TO_MOVE)).toBe(true)
  })

  it('returns true for black-to-move Fool\'s Mate position', () => {
    const fen = 'rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR b KQkq - 1 3'
    expect(shouldFlipBoard(fen)).toBe(true)
  })

  it('returns false for white-to-move Scholar\'s Mate position', () => {
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4'
    expect(shouldFlipBoard(fen)).toBe(false)
  })
})

describe('evalToPercent', () => {
  it('returns 50 for equal position (0 centipawns)', () => {
    expect(evalToPercent(0)).toBe(50)
  })

  it('returns > 50 for white advantage', () => {
    expect(evalToPercent(100)).toBeGreaterThan(50)
    expect(evalToPercent(500)).toBeGreaterThan(50)
  })

  it('returns < 50 for black advantage', () => {
    expect(evalToPercent(-100)).toBeLessThan(50)
    expect(evalToPercent(-500)).toBeLessThan(50)
  })

  it('clamps extreme values to a reasonable range', () => {
    const high = evalToPercent(10000)
    const low = evalToPercent(-10000)
    expect(high).toBeGreaterThan(90)
    expect(high).toBeLessThanOrEqual(100)
    expect(low).toBeLessThan(10)
    expect(low).toBeGreaterThanOrEqual(0)
  })

  it('is symmetric around 50%', () => {
    const plus = evalToPercent(300)
    const minus = evalToPercent(-300)
    expect(plus + minus).toBeCloseTo(100, 5)
  })
})
