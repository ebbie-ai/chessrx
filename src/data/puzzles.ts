import type { Puzzle } from '@/types/puzzle'

/**
 * Sample hardcoded puzzles for demo/development.
 *
 * Each puzzle is a real (or plausible) position extracted from a blitz game.
 * In production these would come from the user's actual game PGNs, parsed
 * server-side and analyzed with Stockfish.
 *
 * FENs are verified to be legal positions.
 * Best moves are in UCI format: e.g. "e2e4", "g1f3", "e7e8q"
 */
export const PUZZLES: Puzzle[] = [
  {
    id: 'p001',
    // Fool's Mate — after 1.f3 e5 2.g4, Black to move Qd8-h4#
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2',
    bestMove: 'd8h4',
    explanation:
      "Your opponent opened with f3 and g4 — a catastrophic error. The queen slides from d8 to h4, delivering checkmate along the e1-h4 diagonal. The king has no escape: e2 is blocked by the pawn, f2 is covered by the queen, and there's nothing to block with.",
    pattern: 'Checkmate — Fool\'s Mate',
    difficulty: 'easy',
    opponent: 'GrandmasterFish',
    date: 'Jan 14, 2026',
  },
  {
    id: 'p002',
    // Scholar's Mate — White to move, Qxf7#
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    bestMove: 'h5f7',
    explanation:
      "Scholar's Mate! The queen on h5 swoops to f7 — checkmate. The bishop on c4 covers the diagonal, the queen covers ranks and files. The black queen on d8 blocks the king's only escape, and every other square is controlled. Game over in four moves.",
    pattern: "Checkmate — Scholar's Mate",
    difficulty: 'easy',
    opponent: 'BeginnerBot3000',
    date: 'Jan 18, 2026',
  },
  {
    id: 'p003',
    // Royal fork: Nb5-c7+ forks Ke8 and Ra8
    fen: 'r3k2r/ppp2ppp/3p4/1N6/8/8/PPP2PPP/R3K2R w KQkq - 0 1',
    bestMove: 'b5c7',
    explanation:
      "The knight leaps to c7, simultaneously checking the king and attacking the rook on a8. The king must flee — then you snap off the rook for free. This Royal Fork pattern exploits the knight's unique L-shaped reach. Your opponent walked right into it by leaving the king and rook on the same knight-fork trajectory.",
    pattern: 'Royal Fork',
    difficulty: 'medium',
    opponent: 'PositionalPete',
    date: 'Feb 1, 2026',
  },
  {
    id: 'p004',
    // Back-rank mate: Rd1-d8#. King on g8 is sealed by its own pawns on f7/g7/h7.
    // Verified: after Rd8+, all king escape squares (f8, h8) are covered by the rook;
    // f7, g7, h7 are occupied by Black's own pawns. Checkmate.
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    bestMove: 'd1d8',
    explanation:
      "The rook slides all the way to d8 — checkmate. Black's king looks safe behind its pawn wall, but that wall becomes a prison: f7, g7, and h7 seal off every escape, and the rook commands the entire back rank. One clean move ends the game. This is the most common endgame blunder at every club level — never leave your back rank unguarded.",
    pattern: 'Back Rank Mate',
    difficulty: 'medium',
    opponent: 'TacticalTomas',
    date: 'Feb 5, 2026',
  },
  {
    id: 'p005',
    // Smothered mate combination: Qd5xg8+! Rxg8, Nh6-f7#
    // White queen on d5 sacrifices itself to g8 (diagonal d5-e6-f7-g8, all clear).
    // Black must recapture: Rxg8. Then Nf7# — the knight delivers checkmate from f7,
    // attacking h8, while Black's own rook on g8 and pawns on g7/h7 seal every exit.
    fen: '6rk/6pp/7N/3Q4/8/8/6PP/6K1 w - - 0 1',
    bestMove: 'd5g8',
    explanation:
      "A shocking queen sacrifice unlocks a smothered mate! Qxg8+! forces the rook to recapture — there's no choice. Now the knight leaps to f7, delivering checkmate. The black king is completely smothered: the rook it just moved to g8, the pawns on g7 and h7, and the knight on f7 leave it not a single square. Spotting that the king can be smothered requires visualizing two moves ahead and trusting the sacrifice.",
    pattern: 'Smothered Mate',
    difficulty: 'hard',
    opponent: 'DeepBlueJr',
    date: 'Feb 10, 2026',
  },
]

export function getPuzzle(id: string): Puzzle | undefined {
  return PUZZLES.find((p) => p.id === id)
}

export function getNextPuzzle(currentId: string): Puzzle {
  const idx = PUZZLES.findIndex((p) => p.id === currentId)
  const next = PUZZLES[(idx + 1) % PUZZLES.length]
  if (!next) throw new Error('Puzzle list is empty')
  return next
}
