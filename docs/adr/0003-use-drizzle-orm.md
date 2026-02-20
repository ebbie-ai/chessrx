# Use Drizzle ORM for Database Access

**Status:** accepted  
**Date:** 2026-02-20

## Context and Problem Statement

ChessRx needs an ORM or query builder to interact with the Supabase PostgreSQL database from Next.js API routes and Server Actions. The ORM choice affects type safety, migration ergonomics, bundle size, and developer experience. We need something that works well with Supabase's Postgres and generates accurate TypeScript types.

## Considered Options

* Drizzle ORM (lightweight, TypeScript-first, excellent Postgres support)
* Prisma (the popular choice; heavier, good DX but larger bundle, slower cold starts)
* Kysely (SQL query builder; more verbose, excellent type safety, no migration tooling)
* Raw SQL with `postgres.js` (full control, no abstractions, no type safety without manual effort)

## Decision Outcome

Chosen option: **Drizzle ORM**, because it is significantly lighter than Prisma (no Rust binary, faster cold starts on Vercel Functions), has excellent Supabase/PostgreSQL support, and generates TypeScript types directly from the schema without a separate codegen step. Drizzle's schema-as-code approach keeps migrations in version control cleanly.

### Consequences

* Good, because Drizzle has no Rust query engine — cold starts on Vercel Functions are 3–5x faster than Prisma
* Good, because the schema definition is TypeScript code, not a DSL — full IDE support and type inference
* Good, because Drizzle Kit handles migrations cleanly with `drizzle-kit push` and `drizzle-kit generate`
* Good, because Drizzle works natively with the Supabase Postgres connection string (no special adapter)
* Good, because bundle size is ~40KB vs Prisma's ~3MB (important for edge runtime compatibility)
* Bad, because Drizzle is newer and has a smaller community/ecosystem than Prisma
* Bad, because some advanced Prisma features (nested writes, fluent API) require more verbose Drizzle queries
* Bad, because Drizzle's pgvector support may require manual type extensions (acceptable for v2)
