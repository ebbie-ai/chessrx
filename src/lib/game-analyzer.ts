/**
 * game-analyzer.ts
 *
 * Browser-only module: creates a Stockfish Web Worker and analyzes chess
 * positions from imported games to find blunders and missed tactics.
 *
 * Only import this from 'use client' components.
 */

import type { ParsedGame } from './pgn-parser'
import { detectTactics } from './tactics-detector'
import type { ChessComGame } from './chesscom-api'
import type { Puzzle, Difficulty } from '@/types/puzzle'
import { formatPgnDate } from './pgn-parser'

const STOCKFISH_PATH = '/stockfish/stockfish-lite-single.js'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PositionEval {
  fen: string
  /** Evaluation in pawns from White's perspective */
  evaluation: number
  /** Best move in UCI format */
  bestMove: string
  depth: number
}

export interface CriticalPosition {
  fen: string
  bestMove: string
  playerMove: string
  evalBefore: number
  evalAfter: number
  /** Positive = bad for the active side (how many pawns they lost) */
  evalDelta: number
  moveNumber: number
  side: 'white' | 'black'
  clockTime?: number
  difficulty: Difficulty
  pattern: string
  // Game context
  opponent: string
  opponentRating?: number
  date: string
  timeControl?: string
  playedAs: 'white' | 'black'
  opening?: string
  explanation: string
}

export interface AnalysisProgress {
  gameIndex: number
  totalGames: number
  positionIndex: number
  totalPositions: number
  status: string
}

export interface AnalysisResult {
  criticalPositions: CriticalPosition[]
  bestMovesFound: CriticalPosition[]
  totalGamesAnalyzed: number
  blunders: number
  mistakes: number
}

export interface GameToAnalyze {
  parsed: ParsedGame
  chesscomGame: ChessComGame
  username: string
}

export interface AnalyzerOptions {
  /** Stockfish analysis depth (default 12) */
  depth?: number
  /** Eval drop (pawns) needed to flag a move (default 1.0) */
  evalThreshold?: number
  /** Skip the first N moves of each game (opening theory) */
  skipOpeningMoves?: number
  /** Progress callback */
  onProgress?: (progress: AnalysisProgress) => void
  /** Called when a game yields its best puzzle (for streaming UX) */
  onPuzzleFound?: (puzzle: CriticalPosition) => void
}

// ── Stockfish worker manager ─────────────────────────────────────────────────

class StockfishManager {
  private worker: Worker | null = null
  private ready = false

  async initialize(): Promise<void> {
    this.worker = new Worker(STOCKFISH_PATH)

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Stockfish init timeout')), 30_000)

      const handler = (e: MessageEvent<string>) => {
        if (e.data === 'readyok') {
          clearTimeout(timeout)
          this.worker!.removeEventListener('message', handler)
          this.ready = true
          resolve()
        }
      }
      this.worker!.addEventListener('message', handler)

      this.worker!.postMessage('uci')
      this.worker!.postMessage('setoption name Threads value 1')
      this.worker!.postMessage('setoption name Hash value 16')
      this.worker!.postMessage('isready')
    })
  }

  analyzePosition(fen: string, depth: number): Promise<PositionEval> {
    return new Promise((resolve, reject) => {
      if (!this.worker || !this.ready) {
        reject(new Error('Stockfish not initialized'))
        return
      }

      let evaluation = 0
      let bestMove = ''

      const timeout = setTimeout(() => {
        this.worker?.removeEventListener('message', handler)
        reject(new Error(`Analysis timeout for FEN: ${fen}`))
      }, 30_000)

      const handler = (e: MessageEvent<string>) => {
        const line = e.data
        if (!line) return

        if (line.startsWith('info') && line.includes('score')) {
          // Centipawn score
          const cpMatch = line.match(/\bscore cp (-?\d+)/)
          if (cpMatch?.[1] !== undefined) {
            evaluation = parseInt(cpMatch[1]) / 100
          }
          // Mate score
          const mateMatch = line.match(/\bscore mate (-?\d+)/)
          if (mateMatch?.[1] !== undefined) {
            evaluation = parseInt(mateMatch[1]) > 0 ? 99 : -99
          }
          // Best move from pv line
          const pvMatch = line.match(/\bpv (\w+)/)
          if (pvMatch?.[1] !== undefined) {
            bestMove = pvMatch[1]
          }
        }

        if (line.startsWith('bestmove')) {
          clearTimeout(timeout)
          this.worker!.removeEventListener('message', handler)
          const bm = line.split(' ')[1]
          if (bm !== undefined && bm !== '(none)') bestMove = bm
          resolve({ fen, evaluation, bestMove, depth })
        }
      }

      this.worker.addEventListener('message', handler)
      this.worker.postMessage('stop')
      this.worker.postMessage('ucinewgame')
      this.worker.postMessage(`position fen ${fen}`)
      this.worker.postMessage(`go depth ${depth}`)
    })
  }

  terminate(): void {
    this.worker?.terminate()
    this.worker = null
    this.ready = false
  }
}

// ── Classification helpers ───────────────────────────────────────────────────

/**
 * Compute eval delta from the active player's perspective.
 * Returns a positive number when the player's move was a mistake.
 */
function evalDeltaForSide(
  evalBefore: number,
  evalAfter: number,
  side: 'white' | 'black'
): number {
  // Eval is always from White's perspective.
  // If White blunders: eval drops → evalBefore - evalAfter > 0
  // If Black blunders: eval rises → evalAfter - evalBefore > 0
  return side === 'white' ? evalBefore - evalAfter : evalAfter - evalBefore
}

function classifyDifficulty(evalDelta: number, clockTime: number | undefined): Difficulty {
  if (evalDelta >= 3.0) return 'easy' // obvious blunder
  if (evalDelta >= 2.0 || (clockTime !== undefined && clockTime < 10)) return 'medium'
  return 'hard'
}

function classifyPattern(
  evalDelta: number,
  clockTime: number | undefined
): string {
  if (clockTime !== undefined && clockTime < 30) return 'Time Pressure Blunder'
  if (evalDelta >= 3.0) return 'Hanging Piece'
  if (evalDelta >= 2.0) return 'Missed Tactic'
  return 'Positional Error'
}

function generateExplanation(
  evalDelta: number,
  evalBefore: number,
  evalAfter: number,
  side: 'white' | 'black',
  moveNumber: number,
  clockTime: number | undefined,
  opponent: string
): string {
  const who = side === 'white' ? 'White' : 'Black'
  const sign = (v: number) => (v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1))
  let text = `On move ${moveNumber} vs ${opponent}, ${who} made an error costing ~${evalDelta.toFixed(1)} pawns`
  text += ` (eval shifted from ${sign(evalBefore)} to ${sign(evalAfter)}).`
  if (clockTime !== undefined && clockTime < 30) {
    text += ` Only ${clockTime}s on the clock — time pressure likely played a role.`
  }
  text += ' Find the best move that keeps the advantage.'
  return text
}

// ── Main analysis function ───────────────────────────────────────────────────

export async function analyzeGames(
  games: GameToAnalyze[],
  options: AnalyzerOptions = {}
): Promise<AnalysisResult> {
  const {
    depth = 12,
    evalThreshold = 1.0,
    skipOpeningMoves = 8,
    onProgress,
    onPuzzleFound,
  } = options

  const stockfish = new StockfishManager()
  await stockfish.initialize()

  const criticalPositions: CriticalPosition[] = []
  const bestMovesFound: CriticalPosition[] = []
  let blunders = 0
  let mistakes = 0

  try {
    for (let gi = 0; gi < games.length; gi++) {
      const gameData = games[gi]
      if (!gameData) continue

      const { parsed, chesscomGame, username } = gameData
      const playedAs =
        chesscomGame.white.username.toLowerCase() === username.toLowerCase()
          ? ('white' as const)
          : ('black' as const)

      const opponent =
        playedAs === 'white' ? chesscomGame.black.username : chesscomGame.white.username
      const opponentRating =
        playedAs === 'white' ? chesscomGame.black.rating : chesscomGame.white.rating

      const moves = parsed.moves
      // Collect all FENs in the game (before each move)
      // moves[i].fenBefore is the position before move i
      // moves[i].fen is the position after move i

      // Only evaluate positions starting after the opening
      const startIdx = skipOpeningMoves * 2 // each full move = 2 half-moves

      // Analyze each position in sequence
      // We'll cache evals: key = fen, value = PositionEval
      const evalCache = new Map<string, PositionEval>()

      const analyzeOrCache = async (fen: string): Promise<PositionEval> => {
        const cached = evalCache.get(fen)
        if (cached) return cached
        const result = await stockfish.analyzePosition(fen, depth)
        evalCache.set(fen, result)
        return result
      }

      for (let mi = startIdx; mi < moves.length; mi++) {
        const move = moves[mi]
        if (!move) continue

        // Only flag moves by the player we're analyzing
        if (move.side !== playedAs) continue

        // Skip if game is already heavily decided at this point
        // (to avoid flagging moves in won/lost positions)
        const cached = evalCache.get(move.fenBefore)
        if (cached && Math.abs(cached.evaluation) > 7) continue

        onProgress?.({
          gameIndex: gi,
          totalGames: games.length,
          positionIndex: mi,
          totalPositions: moves.length,
          status: `Game ${gi + 1}/${games.length} · move ${move.moveNumber}`,
        })

        // Run sequentially — single Stockfish worker can't handle parallel requests
        const eb = await analyzeOrCache(move.fenBefore)
        const ea = await analyzeOrCache(move.fen)

        const delta = evalDeltaForSide(eb.evaluation, ea.evaluation, move.side)

        if (delta >= evalThreshold) {
          const difficulty = classifyDifficulty(delta, move.clockAfter)
          const pattern = classifyPattern(delta, move.clockAfter)
          const dateStr = parsed.date ? formatPgnDate(parsed.date) : ''
          // Use tactical pattern detection for explanation
          const tactics = detectTactics(
            move.fenBefore,
            eb.bestMove,
            move.uci,
            eb.evaluation,
            ea.evaluation,
          )
          const explanation = tactics.explanation

          const critical: CriticalPosition = {
            fen: move.fenBefore,
            bestMove: eb.bestMove,
            playerMove: move.uci,
            evalBefore: eb.evaluation,
            evalAfter: ea.evaluation,
            evalDelta: delta,
            moveNumber: move.moveNumber,
            side: move.side,
            clockTime: move.clockAfter,
            difficulty,
            pattern: tactics.theme !== 'unknown' && tactics.theme !== 'positional' ? tactics.theme : pattern,
            opponent,
            opponentRating,
            date: dateStr,
            timeControl: parsed.timeControl,
            playedAs,
            opening: parsed.opening,
            explanation,
          }

          criticalPositions.push(critical)
          if (delta >= 2.0) blunders++
          else mistakes++
        } else if (delta <= -0.3 && eb.bestMove === move.uci && Math.abs(eb.evaluation) > 0.5) {
          // Player found the engine's best move in a complex position
          const dateStr = parsed.date ? formatPgnDate(parsed.date) : ''
          bestMovesFound.push({
            fen: move.fenBefore,
            bestMove: eb.bestMove,
            playerMove: move.uci,
            evalBefore: eb.evaluation,
            evalAfter: ea.evaluation,
            evalDelta: delta,
            moveNumber: move.moveNumber,
            side: move.side,
            clockTime: move.clockAfter,
            difficulty: 'hard',
            pattern: 'Best Move Found',
            opponent,
            opponentRating,
            date: dateStr,
            timeControl: parsed.timeControl,
            playedAs,
            opening: parsed.opening,
            explanation: `Excellent! On move ${move.moveNumber} you found the engine's top choice, maintaining a ${Math.abs(ea.evaluation).toFixed(1)}-pawn advantage.`,
          })
        }
      }

      // After analyzing all moves in this game, emit the best puzzle found
      if (onPuzzleFound) {
        const gameKey = `${opponent}_${parsed.date ? formatPgnDate(parsed.date) : ''}_${playedAs}`
        const gamePuzzles = criticalPositions.filter(
          (p) => `${p.opponent}_${p.date}_${p.playedAs}` === gameKey
        )
        if (gamePuzzles.length > 0) {
          const best = gamePuzzles.reduce((a, b) => (b.evalDelta > a.evalDelta ? b : a))
          onPuzzleFound(best)
        }
      }
    }
  } finally {
    stockfish.terminate()
  }

  return {
    criticalPositions,
    bestMovesFound,
    totalGamesAnalyzed: games.length,
    blunders,
    mistakes,
  }
}

// ── Puzzle conversion ────────────────────────────────────────────────────────

/**
 * Convert a CriticalPosition into a Puzzle that the training page can use.
 */
export function criticalPositionToPuzzle(pos: CriticalPosition, index: number): Puzzle {
  return {
    id: `imported_${index}_${Date.now()}`,
    fen: pos.fen,
    bestMove: pos.bestMove,
    explanation: pos.explanation,
    pattern: pos.pattern,
    difficulty: pos.difficulty,
    opponent: pos.opponent,
    date: pos.date,
    // Extended fields
    playerMove: pos.playerMove,
    opponentRating: pos.opponentRating,
    timeControl: pos.timeControl,
    playedAs: pos.playedAs,
    evalDelta: pos.evalDelta,
    evalBefore: pos.evalBefore,
    evalAfter: pos.evalAfter,
    opening: pos.opening,
  }
}

/** localStorage key for persisting imported puzzles. */
export const IMPORTED_PUZZLES_KEY = 'chessrx_imported_puzzles'

/** localStorage key for persisting fetched games (pre-analysis). */
export const IMPORTED_GAMES_KEY = 'chessrx_imported_games'

/** Save puzzles to localStorage. */
export function saveImportedPuzzles(puzzles: Puzzle[]): void {
  try {
    localStorage.setItem(IMPORTED_PUZZLES_KEY, JSON.stringify(puzzles))
  } catch (err) {
    console.warn('[saveImportedPuzzles] Failed to save to localStorage:', err)
  }
}

/** Load puzzles from localStorage. Returns null if none saved. */
export function loadImportedPuzzles(): Puzzle[] | null {
  try {
    const raw = localStorage.getItem(IMPORTED_PUZZLES_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Puzzle[]
  } catch {
    return null
  }
}
