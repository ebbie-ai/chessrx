# Use Next.js 14 with App Router

**Status:** accepted  
**Date:** 2026-02-20

## Context and Problem Statement

ChessRx needs a React-based web framework that supports both server-side rendering (for fast initial loads and SEO) and rich client-side interactivity (for the chess board, real-time Stockfish analysis, and training session UI). We need to choose between Next.js App Router (introduced in 13, stable in 14), Pages Router (legacy Next.js model), or an alternative like Remix or SvelteKit.

## Considered Options

* Next.js 14 — App Router
* Next.js 14 — Pages Router
* Remix (React-based, file-based routing, excellent data loading)
* SvelteKit (lighter, faster, but different ecosystem)

## Decision Outcome

Chosen option: **Next.js 14 — App Router**, because it offers the best balance of server components (reducing client bundle), nested layouts (useful for the training session UI), and the broadest ecosystem support for our stack (Clerk, Supabase, Tailwind, Vercel deployment). App Router is the strategic direction from Vercel/Next.js and has been stable since 14.0.

### Consequences

* Good, because Server Components allow pre-fetching dashboard data without client-side waterfalls
* Good, because nested layouts simplify the `/train`, `/dashboard`, `/games` route structure
* Good, because Vercel auto-deploys Next.js with zero configuration
* Good, because the App Router ecosystem (Clerk `auth()`, Supabase server clients) is well-supported
* Bad, because App Router has a steeper learning curve than Pages Router for developers unfamiliar with React Server Components
* Bad, because some third-party libraries (like react-chessboard) require `'use client'` directives, adding boilerplate
* Bad, because App Router caching behavior can be surprising and requires explicit opt-outs in some cases
