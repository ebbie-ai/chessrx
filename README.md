# ChessRx — AI Chess Coaching

> Train on puzzles from your own games. Fix the mistakes that actually cost you.

ChessRx is a personalized chess coaching app that generates puzzles from a player's own game history, analyzes them with Stockfish, and delivers targeted training with positive reinforcement.

**Status:** Early scaffold / working demo. Sample puzzles hardcoded; full game-import pipeline TBD.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Landing page:** `http://localhost:3000/`
- **Training page:** `http://localhost:3000/train`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 |
| Chess board | react-chessboard |
| Chess logic | chess.js v1 |
| Engine | Stockfish 10 (via CDN blob worker) |
| Animations | Tailwind keyframes + CSS transitions |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout (header, metadata)
│   ├── globals.css         # Tailwind base + custom utilities
│   ├── page.tsx            # Landing page
│   └── train/
│       └── page.tsx        # Puzzle training page
├── components/
│   ├── Header.tsx          # Fixed top navigation
│   ├── EvalBar.tsx         # Stockfish evaluation bar
│   ├── PuzzleBoard.tsx     # Main board + interaction logic
│   └── PuzzleReveal.tsx    # Post-solve reveal panel
├── data/
│   └── puzzles.ts          # Sample hardcoded puzzles (5)
├── hooks/
│   └── useStockfish.ts     # Stockfish Web Worker hook
├── lib/
│   └── chess-utils.ts      # UCI parsing, eval display helpers
└── types/
    └── puzzle.ts           # Shared TypeScript types
```

---

## Puzzle Flow

1. Board loads with a FEN position from `src/data/puzzles.ts`
2. Stockfish begins analyzing in a background Web Worker
3. User makes a move (drag or click-to-move)
4. If the move matches `bestMove` (UCI):
   - Green highlight + "Correct!" / "✦ Brilliant! First try."
   - Reveal panel slides in with explanation, pattern tag, game context
5. If the move is wrong:
   - Red highlight + shake animation + "Not quite — try again"
   - Position resets automatically after 900ms
6. "Next Puzzle" advances to the next in the list (wraps around)

---

## Stockfish Integration

The `useStockfish` hook fetches `stockfish.js` from jsDelivr CDN and creates a
Blob-URL Worker to avoid CORS restrictions. UCI protocol is used to:

- Set position with `position fen <FEN>`
- Start analysis with `go depth 16`
- Parse `info depth N score cp M` lines for the eval bar
- Parse `bestmove` for the engine's recommendation

The eval bar uses a sigmoid-like function to map centipawn scores to a 0–100%
bar position so differences near equality are visible.

> **Note:** The COEP/COOP headers in `next.config.js` are required for
> `SharedArrayBuffer` used by some WASM engines. If you switch to Stockfish
> NNUE WASM, keep these headers.

---

## Sample Puzzles

| # | Pattern | Difficulty | Best Move |
|---|---------|-----------|-----------|
| 1 | Fool's Mate (Qxf2#) | Easy | h4f2 |
| 2 | Scholar's Mate (Qxf7#) | Easy | h5f7 |
| 3 | Royal Fork (Nc7+) | Medium | b5c7 |
| 4 | Back Rank Mate (Qe8#) | Medium | e2e8 |
| 5 | Hanging Piece (Nxd4) | Hard | f3d4 |

All FENs verified as legal chess positions. Best moves validated against chess.js.

---

## Adding Real Puzzles

Edit `src/data/puzzles.ts` and add entries to `PUZZLES`:

```typescript
{
  id: 'p006',
  fen: '<FEN string>',
  bestMove: '<UCI move e.g. e2e4>',
  explanation: 'Why this is the best move...',
  pattern: 'Double Check',
  difficulty: 'hard',
  opponent: 'OpponentName',
  date: 'Mar 1, 2026',
}
```

Puzzle FENs and best moves can be sourced from Lichess puzzles API or generated
by running Stockfish on a PGN file.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |

---

## Roadmap

- [ ] Chess.com / Lichess game import via API
- [ ] Stockfish position analysis pipeline (batch PGN → puzzles)
- [ ] User accounts + puzzle history
- [ ] Pattern clustering (pin, fork, back-rank, etc.)
- [ ] Adaptive difficulty based on session performance
- [ ] Time-pressure mode (clock training)
- [ ] Opening repertoire gap detection
- [ ] Mobile app (React Native)

---

## Design Notes

- **Dark theme:** `slate-950` background, `slate-100` text
- **Accent:** Teal (`#00C9A7`) for correct/brilliant moves; cyan for hover states
- **Board colors:** Classic Lichess brown (`#B58863` / `#F0D9B5`)
- **Feedback:** Green (#22C55E) = correct, Red (#EF4444) = incorrect, Teal = brilliant
- **Typography:** Inter (system font fallback)
- **Responsive:** Board resizes via ResizeObserver; sidebar stacks on mobile

---

## License

MIT — use freely, attribution appreciated.
