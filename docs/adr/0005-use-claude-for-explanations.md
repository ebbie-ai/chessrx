# Use Claude API (Haiku) for Plain-Language Move Explanations

**Status:** accepted  
**Date:** 2026-02-20

## Context and Problem Statement

ChessRx needs to generate plain-English explanations for chess mistakes, coaching notes for weakness patterns, and hints for training positions. These explanations must be concrete, coach-like, free of engine jargon, and appropriate for 600–1800 rated adult players. We need to choose an LLM provider and model.

## Considered Options

* Anthropic Claude Haiku (fast, cheap, good instruction-following)
* Anthropic Claude Sonnet (better quality, 3–5x more expensive)
* OpenAI GPT-4o mini (comparable price/quality to Haiku)
* OpenAI GPT-4o (high quality, highest cost)
* Self-hosted open-source LLM (Llama 3, Mistral — requires GPU infrastructure)

## Decision Outcome

Chosen option: **Claude Haiku (claude-3-5-haiku)**, because it has excellent instruction-following for structured coaching outputs, is the fastest and most cost-effective option at scale (~$0.001/call), and the product is being built by an Anthropic API user who can dogfood Claude. GPT-4o is a valid fallback if quality concerns arise.

**Cost model:** ~50 new explanation calls per user per month at $0.001/call = $0.05/user/month. Well within margin at $9.99/mo pricing.

**Caching strategy:** Cache explanations per `(FEN + played_move + best_move)` tuple in the database. Same position = same explanation. Multiple users hitting the same common mistake get zero additional LLM cost.

### Consequences

* Good, because Claude Haiku has excellent instruction-following for the coaching tone we need
* Good, because $0.001/call makes the economics viable even at free tier
* Good, because Anthropic's API is stable and well-documented
* Good, because caching makes marginal cost per user decrease with scale (shared positions)
* Good, because the model can be swapped to Sonnet for specific use cases (weekly coaching notes) without architectural changes
* Bad, because Claude Haiku is occasionally less "creative" in explanations vs. Claude Sonnet
* Bad, because API costs scale linearly with new positions (mitigated by caching)
* Bad, because LLM outputs require quality monitoring — occasional bad explanations need a feedback/flagging mechanism
