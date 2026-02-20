/**
 * Tactical pattern detection using chess.js
 *
 * Analyzes a position + best move to identify tactical motifs
 * (fork, pin, hanging piece, etc.) and generate accurate explanations.
 */

import { Chess } from 'chess.js'
import type { Square, PieceSymbol, Color } from 'chess.js'
import { parseUciMove } from './chess-utils'

const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
}

function pieceName(p: PieceSymbol): string {
  return PIECE_NAMES[p] ?? p
}

function squareName(sq: string): string {
  return sq // e.g. "e4" — already human-readable
}

/** Get all squares attacked by a piece on the given square */
function getAttackedSquares(game: Chess, square: Square): Square[] {
  const moves = game.moves({ square, verbose: true })
  // Include captures and non-captures — all squares the piece attacks
  return moves.map((m) => m.to as Square)
}

/** Get all opponent pieces attacked by a piece on the given square */
function getAttackedPieces(
  game: Chess,
  square: Square,
  opponentColor: Color
): Array<{ square: Square; type: PieceSymbol }> {
  const attacked: Array<{ square: Square; type: PieceSymbol }> = []
  const moves = game.moves({ square, verbose: true })

  for (const move of moves) {
    const target = game.get(move.to as Square)
    if (target && target.color === opponentColor) {
      attacked.push({ square: move.to as Square, type: target.type })
    }
  }

  // Also check squares the piece defends/attacks even without a capture move
  // by looking at the raw board
  return attacked
}

/** Check if a piece is undefended (no same-color piece protecting it) */
function isUndefended(game: Chess, square: Square, color: Color): boolean {
  const piece = game.get(square)
  if (!piece) return true

  // To check if `color` defends `square`, we need to see if any piece of
  // `color` can capture on that square. chess.js only generates moves for
  // the side to move, so we create a position where it's `color`'s turn.
  const fenParts = game.fen().split(' ')
  fenParts[1] = color // set side to move to the defending color
  // Clear en passant to avoid issues
  fenParts[3] = '-'

  try {
    const testGame = new Chess(fenParts.join(' '))
    const board = testGame.board()
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r]?.[c]
        if (!p || p.color !== color || p.square === square) continue
        const moves = testGame.moves({ square: p.square as Square, verbose: true })
        if (moves.some((m) => m.to === square)) return false
      }
    }
  } catch {
    // If FEN manipulation fails, assume defended (safer)
    return false
  }

  return true
}

export interface TacticalAnalysis {
  /** Primary tactical theme */
  theme: string
  /** Human-readable explanation */
  explanation: string
  /** Pieces involved */
  pieces: string[]
}

/**
 * Detect tactical patterns in a position given the best move.
 */
export function detectTactics(
  fen: string,
  bestMoveUci: string,
  playerMoveUci?: string,
  evalBefore?: number,
  evalAfter?: number,
): TacticalAnalysis {
  const game = new Chess(fen)
  const { from, to, promotion } = parseUciMove(bestMoveUci)
  const movingPiece = game.get(from)
  if (!movingPiece) {
    return { theme: 'unknown', explanation: 'Find the best move in this position.', pieces: [] }
  }

  const activeColor = game.turn()
  const opponentColor: Color = activeColor === 'w' ? 'b' : 'w'
  const activeSide = activeColor === 'w' ? 'White' : 'Black'
  const movingPieceName = pieceName(movingPiece.type)

  // Check if the best move is a capture
  const targetPiece = game.get(to)
  const isCapture = !!targetPiece && targetPiece.color === opponentColor

  // Play the best move to analyze the resulting position
  let afterGame: Chess
  try {
    afterGame = new Chess(fen)
    afterGame.move({ from, to, promotion: promotion ?? undefined })
  } catch {
    return { theme: 'tactic', explanation: `Moving the ${movingPieceName} from ${squareName(from)} to ${squareName(to)} is the strongest continuation.`, pieces: [movingPieceName] }
  }

  const results: string[] = []
  const themes: string[] = []
  const piecesInvolved: string[] = [movingPieceName]

  // === Check for checkmate ===
  if (afterGame.isCheckmate()) {
    return {
      theme: 'checkmate',
      explanation: `${activeSide}'s ${movingPieceName} delivers checkmate from ${squareName(to)}!`,
      pieces: [movingPieceName, 'king'],
    }
  }

  // === Check for check ===
  const givesCheck = afterGame.inCheck()

  // === Capture analysis ===
  if (isCapture && targetPiece) {
    const capturedName = pieceName(targetPiece.type)
    piecesInvolved.push(capturedName)

    if (PIECE_VALUES[targetPiece.type] > PIECE_VALUES[movingPiece.type]) {
      themes.push('winning capture')
      results.push(
        `the ${movingPieceName} on ${squareName(from)} captures the more valuable ${capturedName} on ${squareName(to)}`
      )
    } else if (isUndefended(game, to, opponentColor)) {
      themes.push('hanging piece')
      results.push(
        `the ${capturedName} on ${squareName(to)} is undefended — the ${movingPieceName} wins it for free`
      )
    } else {
      themes.push('capture')
      results.push(
        `the ${movingPieceName} captures the ${capturedName} on ${squareName(to)}`
      )
    }
  }

  // === Fork detection ===
  // After the move, check if the moved piece attacks 2+ valuable opponent pieces
  const attackedAfterMove = getAttackedPieces(afterGame, to, opponentColor)
  const valuableAttacked = attackedAfterMove.filter(
    (a) => PIECE_VALUES[a.type] >= 3 || a.type === 'k'
  )
  if (valuableAttacked.length >= 2) {
    const targetNames = valuableAttacked.map(
      (a) => `${pieceName(a.type)} on ${squareName(a.square)}`
    )
    themes.push('fork')
    piecesInvolved.push(...valuableAttacked.map((a) => pieceName(a.type)))
    results.push(
      `the ${movingPieceName} on ${squareName(to)} forks the ${targetNames.join(' and ')}`
    )
  }

  // === Check + attack (royal fork / check-win) ===
  if (givesCheck && !themes.includes('fork')) {
    const nonKingAttacked = attackedAfterMove.filter(
      (a) => a.type !== 'k' && PIECE_VALUES[a.type] >= 3
    )
    if (nonKingAttacked.length > 0) {
      const targetName = pieceName(nonKingAttacked[0]!.type)
      themes.push('check and win')
      piecesInvolved.push(targetName)
      results.push(
        `the ${movingPieceName} gives check from ${squareName(to)} while attacking the ${targetName} on ${squareName(nonKingAttacked[0]!.square)}`
      )
    }
  }

  // === Simple check without other tactics ===
  if (givesCheck && themes.length === 0) {
    themes.push('check')
    results.push(
      `the ${movingPieceName} gives check from ${squareName(to)}, forcing the opponent to respond`
    )
  }

  // === Promotion ===
  if (promotion) {
    themes.push('promotion')
    results.push(
      `the pawn promotes to a ${pieceName(promotion as PieceSymbol)} on ${squareName(to)}`
    )
  }

  // === Build explanation ===
  let explanation: string

  if (results.length > 0) {
    explanation = `Here, ${results.join('. Also, ')}.`
    // Capitalize first letter after "Here, "
    explanation = explanation.replace(/Here, t/, 'Here, t')
  } else {
    // Generic positional explanation
    if (isCapture && targetPiece) {
      explanation = `Capturing the ${pieceName(targetPiece.type)} on ${squareName(to)} with the ${movingPieceName} is the strongest move here.`
    } else {
      explanation = `The key move is ${movingPieceName} to ${squareName(to)} — this strengthens your position and creates problems for your opponent.`
    }
    themes.push('positional')
  }

  // Add eval context for debugging (shown from solver's perspective)
  // evalBefore/evalAfter are normalized to White's perspective by the analyzer.
  // Flip for Black puzzles so the solver sees positive = good for them.
  if (evalBefore !== undefined && evalAfter !== undefined) {
    const flip = activeColor === 'b' ? -1 : 1
    const ebPlayer = evalBefore * flip
    const eaPlayer = evalAfter * flip

    const fmtEval = (v: number): string => {
      if (v >= 90) return 'Mate'
      if (v <= -90) return '-Mate'
      return `${v > 0 ? '+' : ''}${v.toFixed(1)}`
    }

    // Don't show misleading swings involving mate sentinels
    if (Math.abs(ebPlayer) >= 90 && Math.abs(eaPlayer) < 90) {
      explanation += ` (you had a forced mate but played a move worth ${fmtEval(eaPlayer)})`
    } else if (Math.abs(ebPlayer) < 90 || Math.abs(eaPlayer) < 90) {
      const delta = Math.abs(eaPlayer - ebPlayer)
      explanation += ` (eval: ${fmtEval(ebPlayer)} → ${fmtEval(eaPlayer)}, ${delta.toFixed(1)} pawn swing)`
    }
  }

  return {
    theme: themes[0] ?? 'tactic',
    explanation,
    pieces: [...new Set(piecesInvolved)],
  }
}
