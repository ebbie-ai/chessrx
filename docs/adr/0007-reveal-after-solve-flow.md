# Reveal-After-Solve: No Context Shown Before Puzzle Attempt

**Status:** accepted  
**Date:** 2026-02-20

## Context and Problem Statement

When presenting a training position to the user, there is a choice about how much context to show upfront. Options range from full context before the attempt (game attribution, difficulty label, what type of mistake it was) to zero context (cold board presentation). Most chess training apps show some level of context — puzzle ratings, theme tags, or difficulty labels — before the user attempts the position.

ChessRx's training positions come from the user's own games, which creates both an opportunity (the game context is personally meaningful) and a risk (showing context before the solve acts as a hint, reducing training value).

## Considered Options

* Show full context before the attempt (game attribution, difficulty label, pattern tag)
* Show difficulty label only before the attempt (like Chess.com puzzle difficulty)
* Show no context before the attempt — full reveal after the user's move
* Show a hint button (user can request context at a cost)

## Decision Outcome

Chosen option: **No context before the attempt (full reveal after)**, because upfront labels remove the training value of the position. Knowing "This is an Easy hanging piece" changes how you look at the board. Knowing "This came from a game where you blundered" changes your mindset. The training only works if the position is encountered as a genuine chess problem — exactly as it occurred during the game.

This is what we call **the Trojan Horse principle**: the board position looks like just a chess puzzle, but after the solve, it reveals itself as a personalized coaching moment from the user's own game history.

**The 7-step reveal-after-solve flow:**
1. **PRESENT** — Board displayed, "White to move." No other context. Optional hint button available.
2. **SOLVE** — User plays a move. No context yet.
3. **REVEAL** — Difficulty tag + result ("Easy | You missed this" / "⭐ Highlight Reel | You played this brilliantly")
4. **GAME ATTRIBUTION** — "vs. [Opponent] on [Date]" — linked to the full game
5. **EXPLANATION** — Plain-language coaching note, including real diagnosis for blunders
6. **PATTERN LINK** — "You've missed this in 4 of your last 20 games" — connects to broader history
7. **NEXT** — Session progress update, advance to next position

### Consequences

* Good, because cold presentation preserves genuine training value — no anchoring bias
* Good, because the reveal step carries emotional weight that wouldn't exist with upfront labeling ("Easy? I missed *that*?")
* Good, because "⭐ Highlight Reel" reveals feel genuinely celebratory — user didn't know they were being tested on their best moves
* Good, because hiding the type prevents the user from pattern-matching ("oh it's a Medium, must be a fork") instead of solving
* Good, because the reveal flow is a product differentiator — no other chess training app does this
* Bad, because users unfamiliar with the flow may be confused by the cold presentation initially — requires clear UX onboarding
* Bad, because "Best Move" positions (positive reinforcement) may feel like a setup or trick — requires careful reveal copy
* Bad, because the hint mechanism (optional) needs careful design to avoid becoming a crutch
* Mitigation: First session should include a brief onboarding explanation of the reveal-after-solve concept ("We'll tell you what happened after you try it")
