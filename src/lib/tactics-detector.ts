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
  // Check if any piece of the same color can move to this square
  const allMoves = game.moves({ verbose: true })
  // We need to check if any piece of `color` defends this square
  // This is tricky — let's use a simpler approach:
  // Remove the piece, place an opponent piece, see if any same-color piece can capture
  const fen = game.fen()
  const testGame = new Chess(fen)
  const piece = testGame.get(square)
  if (!piece) return true

  // Check all same-color pieces for moves that could capture on this square
  const board = testGame.board()
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r]?.[c]
      if (!p || p.color !== color || p.square === square) continue
      const moves = testGame.moves({ square: p.square as Square, verbose: true })
      if (moves.some((m) => m.to === square)) return false
    }
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
  if (evalBefore !== undefined && evalAfter !== undefined) {
    const flip = activeColor === 'b' ? -1 : 1
    const eb = evalBefore * flip
    const ea = evalAfter * flip
    const delta = Math.abs(ea - eb)
    explanation += ` (eval: ${eb > 0 ? '+' : ''}${eb.toFixed(1)} → ${ea > 0 ? '+' : ''}${ea.toFixed(1)}, ${delta.toFixed(1)} pawn swing)`
  }

  return {
    theme: themes[0] ?? 'tactic',
    explanation,
    pieces: [...new Set(piecesInvolved)],
  }
}
