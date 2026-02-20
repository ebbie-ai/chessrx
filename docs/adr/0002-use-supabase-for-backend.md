# Use Supabase for Backend Database and Auth Infrastructure

**Status:** accepted  
**Date:** 2026-02-20

## Context and Problem Statement

ChessRx needs a PostgreSQL database for storing games, analysis results, weakness profiles, training positions, and user accounts. We also need pgvector support for future position-similarity search (v2). The database choice affects our auth strategy, real-time capabilities, and storage options for PGN uploads. We need to choose between managed Postgres providers.

## Considered Options

* Supabase (managed Postgres + auth + realtime + storage + pgvector)
* Neon (serverless Postgres with branching; no built-in auth/storage)
* PlanetScale (MySQL-based, not Postgres; no pgvector)
* Self-hosted PostgreSQL on Fly.io or Render

## Decision Outcome

Chosen option: **Supabase**, because it provides everything we need in one platform — Postgres with pgvector extension, realtime subscriptions (useful for future live features), storage for PGN file uploads, and a generous free tier for MVP development. While we use Clerk for authentication (not Supabase Auth), the Supabase Postgres instance is the right choice for the database layer.

### Consequences

* Good, because pgvector is available out-of-the-box (needed in v2 for position similarity search)
* Good, because Supabase Storage simplifies PGN file upload handling
* Good, because realtime subscriptions enable future live analysis features without additional infrastructure
* Good, because the free tier (500MB DB, 50k MAU) covers the entire MVP development phase
* Good, because the Supabase dashboard provides built-in table editor, SQL runner, and logs — reducing dev tooling overhead
* Bad, because Supabase's managed Postgres has some vendor lock-in risk vs. a standard Postgres provider
* Bad, because Supabase's free tier pauses projects after 7 days of inactivity (fixable with keep-alive pings)
* Bad, because Neon's branching feature would have been useful for dev/staging DB isolation (a real tradeoff)
* Bad, because at high scale (10M+ rows), Supabase can be more expensive than Neon or self-hosted
