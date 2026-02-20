import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'
import { PUZZLES } from '@/data/puzzles'

describe('PUZZLES data integrity', () => {
  it('has at least one puzzle', () => {
    expect(PUZZLES.length).toBeGreaterThan(0)
  })

  it('every puzzle has required fields', () => {
    for (const puzzle of PUZZLES) {
      expect(puzzle.id, `puzzle ${puzzle.id} is missing id`).toBeTruthy()
      expect(puzzle.fen, `puzzle ${puzzle.id} is missing fen`).toBeTruthy()
      expect(puzzle.bestMove, `puzzle ${puzzle.id} is missing bestMove`).toBeTruthy()
      expect(puzzle.explanation, `puzzle ${puzzle.id} is missing explanation`).toBeTruthy()
      expect(puzzle.pattern, `puzzle ${puzzle.id} is missing pattern`).toBeTruthy()
      expect(puzzle.difficulty, `puzzle ${puzzle.id} is missing difficulty`).toMatch(/^(easy|medium|hard)$/)
      expect(puzzle.opponent, `puzzle ${puzzle.id} is missing opponent`).toBeTruthy()
      expect(puzzle.date, `puzzle ${puzzle.id} is missing date`).toBeTruthy()
    }
  })

  it('all puzzle IDs are unique', () => {
    const ids = PUZZLES.map((p) => p.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it.each(PUZZLES)('puzzle $id has a valid FEN', ({ id, fen }) => {
    expect(() => new Chess(fen), `puzzle ${id} has invalid FEN: ${fen}`).not.toThrow()
  })

  it.each(PUZZLES)('puzzle $id bestMove ($bestMove) is legal in the position', ({ id, fen, bestMove }) => {
    const chess = new Chess(fen)

    // Parse UCI move (e.g. "e2e4", "e7e8q")
    const from = bestMove.slice(0, 2)
    const to = bestMove.slice(2, 4)
    const promotion = bestMove[4] ?? undefined

    const move = chess.move({
      from,
      to,
      promotion,
    })

    expect(move, `puzzle ${id}: bestMove "${bestMove}" is not a legal move in position ${fen}`).not.toBeNull()
  })

  it.each(PUZZLES)('puzzle $id: active side matches FEN side to move', ({ id, fen, bestMove }) => {
    const chess = new Chess(fen)
    // The move must be for the side that's currently moving
    const from = bestMove.slice(0, 2)
    const piece = chess.get(from as Parameters<typeof chess.get>[0])
    expect(piece, `puzzle ${id}: no piece on "from" square ${from}`).not.toBeNull()
    expect(
      piece?.color,
      `puzzle ${id}: piece color doesn't match side to move`
    ).toBe(chess.turn())
  })
})
