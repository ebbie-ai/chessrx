# Use Client-Side Stockfish WASM for Chess Analysis

**Status:** accepted  
**Date:** 2026-02-20

## Context and Problem Statement

ChessRx needs to run Stockfish analysis on imported games to identify blunders, mistakes, and inaccuracies. Analysis runs on potentially 50–200 games per user. The key question is: should analysis run on the server (predictable, controlled, costly) or the client (free, parallel, relies on user hardware)?

## Considered Options

* Client-side Stockfish WASM (via Web Worker, runs in browser)
* Server-side Stockfish in Node.js (Vercel Functions or dedicated compute)
* Third-party analysis API (e.g., Lichess analysis, chess.com analysis endpoint)
* Cloud GPU (overkill for Stockfish — it's CPU-bound)

## Decision Outcome

Chosen option: **Client-side Stockfish WASM**, because it costs $0 in compute, runs in parallel with UI work via Web Workers, and is sufficiently fast at depth 18 for the 800–1800 rating range we target. Loading Stockfish WASM as a Blob URL in a Web Worker avoids CORS restrictions and keeps the main thread unblocked.

Analysis results are persisted to the database immediately so games are never re-analyzed, making the one-time client-side cost acceptable.

### Consequences

* Good, because compute cost is $0 — no server infrastructure needed for analysis
* Good, because analysis runs while the user is actively using the app (background Web Worker)
* Good, because results are stored permanently after first analysis — no repeat cost
* Good, because depth 18 is well-suited to identify blunders and mistakes at 800–1800 level
* Good, because client parallelism scales naturally — powerful hardware analyzes faster
* Bad, because analysis speed varies by device — mobile analysis of 50 games may take 15+ minutes
* Bad, because Stockfish WASM binary is ~6MB — adds to initial page load if not code-split
* Bad, because analysis requires an active browser session — no background server-side analysis
* Bad, because very deep analysis (depth 22+) is impractically slow client-side for full games
* Mitigation: lazy-load Stockfish only on the import/analysis page; add server-side option in v1.5 for mobile users
