# ChessRx — Product Requirements Spec

**Domain:** Core Product  
**Version:** 0.1 (MVP)  
**Status:** Active  
**Last Updated:** February 2026  

---

## Product Vision

**One-Liner:** AI chess coaching that learns from your games — not someone else's.

**Core Hypothesis:** Personalized training generated from a player's actual games produces better improvement than generic puzzle training.

**The Gap:** No existing tool connects game analysis → recurring pattern detection → personalized training in one product. Chess.com/Lichess analyze games but offer generic training. Aimchess filters existing puzzles. ChessRx generates training positions *from the user's own game history*.

---

## User Personas

### Persona 1 — The Frustrated Intermediate (Primary)

**Rating range:** 1000–1800  
**Quote:** *"I've been 1250 for eight months. I do puzzles every day. Nothing changes."*

- Adult, 30s–50s, plays 3–10 games/week online
- Has limited time (20–45 min/day)
- Pays for software if value is clear ($10–15/mo friction-free)
- **Job to be done:** "Tell me exactly what's holding me back, then make me fix it"

### Persona 2 — The Ambitious Beginner (Secondary)

**Rating range:** 600–1000  
**Quote:** *"I'm improving fast but I don't know what to focus on."*

- Adult learner, 6–18 months into chess
- Still making fundamental blunders
- Needs encouragement as much as analysis
- **Job to be done:** "Help me stop making the same dumb mistakes"

### Persona 3 — The Parent/Coach (Tertiary, v2)

- Parent of a scholastic chess player (age 8–16)
- Not a strong player themselves
- **Job to be done:** "Give my kid structured homework without needing a real coach"
- **Note:** Not a build target for MVP — shapes simplicity decisions

---

## Feature Requirements

### Feature 1: Authentication & User Accounts

**Status:** Required for MVP

#### Requirement: Email + Password Sign-Up
The system MUST support email and password registration.

#### Requirement: Google OAuth
The system MUST support one-click Google OAuth sign-up via Clerk.

#### Requirement: User Profile
The system MUST store: display name, self-reported rating, platform preference (Chess.com / Lichess).

#### Requirement: Access Tiers
The system MUST enforce free vs. paid tier access controls.

#### Scenario: New user signs up
- GIVEN a visitor on the landing page
- WHEN they click "Get Started" and complete sign-up
- THEN an account is created and they proceed to game import onboarding

---

### Feature 2: Game Import

**Status:** Required for MVP

#### Requirement: Chess.com Integration
The system MUST import games from Chess.com using the public API (username-based, no OAuth required).

#### Requirement: Lichess Integration
The system MUST import games from Lichess using username-based API download.

#### Requirement: Manual PGN Upload
The system MUST accept drag-and-drop or pasted multi-game PGN files.

#### Requirement: Import Filtering
The system MUST filter by time control (exclude bullet) and support configurable import counts (20, 50, 100 games).

#### Requirement: Deduplication
The system MUST deduplicate games by hashing date/opponent/moves to prevent double-import.

#### Scenario: User imports games from Chess.com
- GIVEN a user with a Chess.com account who provides their username
- WHEN they click "Find My Games"
- THEN the system fetches their last N games and shows a preview of the 3 most recent
- AND the full import proceeds in the background with a progress indicator

---

### Feature 3: Game Analysis (Stockfish WASM)

**Status:** Required for MVP

#### Requirement: Client-Side Analysis
The system MUST run Stockfish WASM analysis client-side (in a Web Worker) to avoid server compute costs.

#### Requirement: Analysis Depth
The system SHALL analyze at depth 18–20 ply — sufficient for 800–1800 rated players.

#### Requirement: Mistake Classification
The system MUST classify each move as: Blunder (≥2.0 pawn loss), Mistake (1.0–2.0), Inaccuracy (0.3–1.0), Good, or Best.

#### Requirement: Game Phase Detection
The system MUST tag each position with its game phase: opening (moves 1–15), middlegame (16–35), endgame (35+).

#### Requirement: Persistent Storage
The system MUST store analysis results in the database so games are never re-analyzed.

#### Requirement: Performance
The system SHOULD analyze 50 games in under 5 minutes in a modern browser.

#### Scenario: First import analysis
- GIVEN a user who has just imported 50 games
- WHEN Stockfish analysis begins
- THEN a progress indicator shows game count incrementing
- AND on completion, the user sees "Found N critical moments across your last 50 games"

---

### Feature 4: Weakness Pattern Detection

**Status:** Required for MVP — Core Differentiator

#### Requirement: Cross-Game Aggregation
The system MUST aggregate mistakes and blunders across all analyzed games (not just within a single game).

#### Requirement: Weakness Taxonomy
The system MUST classify mistakes into the defined taxonomy:
- **Tactical:** hanging_piece, missed_fork, missed_pin, missed_skewer, back_rank_weakness, missed_checkmate, calculation_error
- **Positional:** weak_square_creation, bad_bishop, passive_piece, wrong_piece_trade, pawn_structure_damage, piece_coordination
- **Endgame:** king_activity, pawn_promotion_race, rook_passivity, opposition_error
- **Opening:** development_lag, center_neglect, premature_attack
- **Time Management:** time_trouble_blunder, slow_opening, clock_pressure_pattern
- **Calculation:** one_move_blunder, shallow_calculation, tactical_pattern_blind

#### Requirement: Weakness Scoring
The system MUST compute weakness scores (0–100, higher = more problematic) per category, weighted by severity and recency.

#### Requirement: Top 3 Active Weaknesses
The system MUST surface the top 3 active weaknesses and NOT overwhelm users with more than 3 simultaneous focus areas.

#### Requirement: Trend Tracking
The system MUST track weakness scores over time and display trend direction (improving / worsening).

#### Scenario: Weakness radar on first analysis
- GIVEN a user whose 50 games have been analyzed
- WHEN the analysis pipeline completes
- THEN an animated radar chart fills in showing 5–6 weakness categories
- AND the top 3 weaknesses are displayed with labels, scores, and 1–2 sentence coaching notes

---

### Feature 5: Personalized Training Positions

**Status:** Required for MVP — Core Value Proposition

#### Requirement: From-User-Games Only
The system MUST generate training positions from the user's actual game history, not from a generic puzzle database.

#### Requirement: Two Position Types
The system MUST generate:
1. **Mistake positions** — positions where the user made a blunder or mistake (the training core)
2. **Best Move positions** — positions where the user found a strong move (positive reinforcement)

#### Requirement: Position Validity
The system MUST verify every training position FEN is legal using chess.js before storing it.

#### Requirement: Single Best Move
The system MUST only use positions where there is a single clear best move (eval gap ≥1.5 pawns for mistakes, ≥1.0 pawn for best moves).

#### Requirement: Difficulty Classification
The system MUST classify difficulty based on **mistake type**, not puzzle complexity:
- **Easy** — Blunders: obvious mistakes, one-move oversights (in hindsight)
- **Medium** — Critical moments: right move was findable but user chose wrong
- **Hard** — Positions requiring deep calculation or non-obvious strategic ideas

#### Requirement: No Upfront Context
The system MUST present every puzzle cold (board + whose turn it is) with NO difficulty label, NO game context, and NO hint about what type of position it is. All context is revealed AFTER the attempt.

#### Scenario: User solves a training position
- GIVEN a training position is displayed
- WHEN the user plays a move on the interactive board
- THEN if correct, a subtle confirmation appears (no full reveal yet)
- AND if incorrect, the correct move is shown with an arrow
- THEN the difficulty label reveals: "Easy | You missed this" or "⭐ Highlight Reel | You played this brilliantly"
- THEN game attribution shows: "vs. [Opponent] on [Date]"
- THEN the plain-language explanation is displayed

---

### Feature 6: Plain-Language Explanations (LLM-Powered)

**Status:** Required for MVP

#### Requirement: Per-Move Explanations
The system MUST generate 2–4 sentence plain-English explanations for each critical mistake.

#### Requirement: Coaching Tone
Explanations MUST be direct and coach-like, using no jargon or explaining any jargon used. Engine-speak is prohibited.

#### Requirement: Diagnosis Over Chess
For Easy (blunder) positions with time pressure context: explanations MUST lead with the real diagnosis (e.g., "This isn't a tactics problem — it's a clock management problem.") before explaining the chess.

#### Requirement: Explanation Caching
The system MUST cache explanations per (FEN + played_move + best_move) tuple so the same position is never re-explained for different users.

#### Requirement: LLM Model
The system SHALL use Claude Haiku for move explanations (fast, cost-effective). Claude Sonnet MAY be used for weekly coaching notes.

#### Scenario: Explanation generation
- GIVEN a training position where the user has attempted the move
- WHEN the reveal step occurs
- THEN a cached or freshly generated 2–4 sentence explanation is displayed
- AND the explanation references the specific pattern detected ("This is a classic knight outpost...")

---

### Feature 7: Daily Study Plan

**Status:** Required for MVP (paid tier)

#### Requirement: Session Target
The system MUST generate daily sessions targeting 20–25 minutes with 8–12 positions.

#### Requirement: Session Composition
The system SHALL include per session:
- ~3 Easy (blunders to confront)
- ~4–5 Medium (critical moments — training sweet spot)
- ~1 Hard (deeper calculation)
- ~1–2 Best Move ⭐ (positive reinforcement)

#### Requirement: Weakness Weighting
The system MUST weight position selection toward the user's top active weaknesses.

#### Requirement: Spaced Repetition (Lite)
The system MUST NOT re-serve positions marked as mastered in the same day and SHOULD apply recency logic (don't show recently-shown positions immediately).

#### Requirement: Progress Indicator
The system MUST show a progress indicator during the session: "Position 3 of 10 · Est. 8 min remaining".

#### Requirement: Daily Reset
The daily plan MUST reset at midnight in the user's local timezone.

#### Scenario: User starts their daily session
- GIVEN it is a new day and the user has a weakness profile
- WHEN they click "Start Today's Session" on the dashboard
- THEN a session of 8–12 positions is generated, weighted to their top weakness
- AND a progress indicator is shown
- AND on completion, a session summary shows accuracy, streak update, and weakness trend

---

### Feature 8: Progress Tracking

**Status:** Required for MVP

#### Requirement: Weakness Dashboard
The system MUST display a radar/spider chart with 5–6 weakness category scores, updated after each game import+analysis batch.

#### Requirement: Session History
The system MUST show a list of completed sessions with date, duration, positions attempted, and accuracy.

#### Requirement: Streak Counter
The system MUST track and display consecutive days with completed study sessions.

#### Requirement: Improvement Indicators
The system MUST show trend arrows (up/down) on weakness scores vs. 2 weeks prior.

#### Scenario: User checks their progress
- GIVEN a user who has completed 10 sessions over 2 weeks
- WHEN they view the progress page
- THEN they see a radar chart showing improvement trend
- AND streak count and recent session list
- AND "Hanging pieces: improved 15 points this week" type summary

---

### Feature 9: Freemium Access Control

**Status:** Required for MVP

| Feature | Free | Paid ($9.99/mo or $99/yr) |
|---|---|---|
| Game import | Last 10 games | Last 200 games |
| Analysis | 3 games/week | Unlimited |
| Training positions/day | 2 | Unlimited |
| LLM explanations | First mistake per game | All mistakes |
| Daily study plan | — | ✓ |
| Progress tracking | Last 7 days | Full history |
| Multi-game pattern detection | — | ✓ |

#### Requirement: Free Trial
The system MUST offer a 7-day free trial of the paid tier. No credit card required to start the trial.

---

## Non-Functional Requirements

### Performance

#### Requirement: Dashboard Load Time
The dashboard MUST load in under 2 seconds (p90).

#### Requirement: Board Interaction Latency
Chess board piece drag/click interactions MUST feel instantaneous (< 16ms response).

#### Requirement: Stockfish Analysis Speed
Client-side Stockfish WASM MUST analyze 50 games in under 5 minutes in a modern desktop browser.

### Accessibility

#### Requirement: WCAG 2.1 AA
The application MUST meet WCAG 2.1 Level AA standards.

#### Requirement: Keyboard Navigation
All training session interactions MUST be operable via keyboard.

#### Requirement: Screen Reader Support
Board positions and move results MUST have appropriate ARIA labels for screen reader users.

### Mobile Responsiveness

#### Requirement: Mobile Training Sessions
Training sessions MUST be fully functional on mobile devices (phones ≥ 375px wide).

#### Requirement: Board Scaling
The chess board MUST scale to 100% viewport width on mobile with no horizontal scrolling.

#### Requirement: Touch Targets
All interactive elements MUST have minimum 44×44px touch targets on mobile.

#### Requirement: Mobile-First Features
Game review and full analysis views MAY be desktop-only in MVP; training sessions MUST work on mobile.

### Security & Privacy

#### Requirement: No PGN Leakage
Raw game PGN data MUST NOT be exposed in public API responses or client-side bundle.

#### Requirement: Auth Tokens
Authentication tokens MUST use short-lived JWTs with refresh rotation.

#### Requirement: Rate Limiting
LLM explanation API calls MUST be rate-limited per user to control costs (free tier: 10/day, paid: 100/day).

---

## Out of Scope (MVP)

The following are explicitly excluded from v1:

- Opening repertoire builder
- Endgame tablebase training
- Social features (friends, leaderboards)
- Native mobile apps (iOS/Android)
- Real-time game analysis during play
- Automatic Chess.com rating sync
- Email/push notifications
- Multi-language support
- Video content
- Coach marketplace

---

*This spec follows the [OpenSpec](https://github.com/Fission-AI/OpenSpec) format — requirements expressed as MUST/SHALL/SHOULD, scenarios in GIVEN/WHEN/THEN.*
