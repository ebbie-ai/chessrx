# Puzzle Difficulty Based on Mistake Type, Not Puzzle Complexity

**Status:** accepted  
**Date:** 2026-02-20

## Context and Problem Statement

Traditional puzzle apps (Chess Tempo, Lichess Puzzles, Chess.com Puzzles) assign difficulty ratings based on puzzle complexity — how hard the position is to solve objectively. A hanging piece = Easy. A 5-move combination = Hard.

ChessRx generates training positions from the user's actual games. This creates a fundamental question: how should difficulty be assigned when a position is drawn from a user's blunder? A hanging piece that the user missed is objectively "Easy" to solve in hindsight, but the training purpose is different from a generic puzzle.

## Considered Options

* Difficulty based on objective puzzle complexity (standard approach)
* Difficulty based on mistake type / how the mistake occurred in context
* No difficulty labels (show all puzzles without categorization)
* Player-set difficulty (user self-rates each puzzle)

## Decision Outcome

Chosen option: **Difficulty based on mistake type**, because it better reflects the training purpose of each position. A blundered hanging piece is labeled "Easy" — not because it's trivial to solve in hindsight, but because the training goal is to confront the mistake and identify the real reason it happened (tactics gap? clock pressure? fatigue?). The difficulty label is a diagnostic, not a complexity signal.

**Framework:**

| Difficulty | What It Represents |
|---|---|
| **Easy** | Blunders — obvious mistakes, one-move hangs, simple tactics missed. The puzzle is simple to solve in hindsight. The value is confronting that it was missed and identifying *why* (often not a chess issue at all — see time pressure). |
| **Medium** | Critical moments — the right move was findable under normal conditions, but the user chose wrong. The training sweet spot. |
| **Hard** | Positions requiring deeper calculation, non-obvious positional ideas, or strategic complexity beyond the user's current pattern library. |

**Critical rule:** Difficulty labels are hidden until AFTER the user attempts the position.

### Consequences

* Good, because "Easy" blunders surface the most revealing data — what you miss matters more than what's objectively hard
* Good, because time-pressure blunders are correctly labeled Easy with a diagnosis note ("This isn't a tactics problem — it's a clock management problem")
* Good, because the hidden-until-reveal mechanism prevents anchoring bias during training
* Good, because the framework naturally produces a useful mix: Easy positions are fast morale-builders and diagnostic moments; Medium is the training core; Hard builds ceiling
* Bad, because "Easy" can feel counterintuitive to users ("if it's Easy, why am I practicing it?") — requires clear UX explanation in the reveal step
* Bad, because difficulty assignment requires contextual awareness of why a mistake happened (time pressure, game phase, opponent rating) — more complex classification logic than simple puzzle rating
