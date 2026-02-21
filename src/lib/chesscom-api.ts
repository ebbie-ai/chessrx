import { parsePgn, type ParsedGame } from './pgn-parser'

// When running in the browser, COEP: require-corp blocks direct cross-origin
// fetches to chess.com (they don't send Cross-Origin-Resource-Policy headers).
// Route all calls through the Next.js proxy so the browser only sees a
// same-origin response. On the server the direct URL is fine.
const CHESS_COM_DIRECT = 'https://api.chess.com/pub'
const CHESS_COM_PROXY = '/api/chesscom'

function chessComUrl(path: string): string {
  const base = typeof window === 'undefined' ? CHESS_COM_DIRECT : CHESS_COM_PROXY
  return `${base}${path}`
}

/**
 * Convert a full chess.com archive URL to our proxy equivalent.
 * e.g. https://api.chess.com/pub/player/foo/games/2024/01
 *      → /api/chesscom/player/foo/games/2024/01
 */
function proxyArchiveUrl(archiveUrl: string): string {
  if (typeof window === 'undefined') return archiveUrl
  return archiveUrl.replace(CHESS_COM_DIRECT, CHESS_COM_PROXY)
}

// ── Response types ───────────────────────────────────────────────────────────

export interface ChessComPlayer {
  '@id': string
  url: string
  username: string
  player_id: number
  title?: string
  status: string
  name?: string
  avatar?: string
  location?: string
  country: string
  joined: number
  last_online: number
  followers: number
  is_streamer: boolean
  twitch_url?: string
  fide?: number
}

export interface ChessComRatingEntry {
  last: { rating: number; date: number; rd: number }
  best: { rating: number; date: number; game: string }
  record: { win: number; loss: number; draw: number }
}

export interface ChessComStats {
  chess_daily?: ChessComRatingEntry
  chess_rapid?: ChessComRatingEntry
  chess_blitz?: ChessComRatingEntry
  chess_bullet?: ChessComRatingEntry
}

export interface ChessComGamePlayer {
  rating: number
  result: string
  '@id': string
  username: string
  uuid: string
}

export interface ChessComGame {
  url: string
  pgn: string
  time_control: string
  end_time: number
  rated: boolean
  fen: string
  time_class: 'daily' | 'rapid' | 'blitz' | 'bullet'
  rules: string
  white: ChessComGamePlayer
  black: ChessComGamePlayer
  accuracies?: { white: number; black: number }
}

export type TimeClass = 'daily' | 'rapid' | 'blitz' | 'bullet' | 'all'

// ── Error class ──────────────────────────────────────────────────────────────

export class ChessComApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'ChessComApiError'
  }
}

// ── Internal fetch helper ────────────────────────────────────────────────────

async function apiFetch<T>(url: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
  } catch (err) {
    throw new ChessComApiError(
      `Network error: ${err instanceof Error ? err.message : String(err)}`,
      undefined,
      'NETWORK_ERROR'
    )
  }

  if (response.status === 404) {
    throw new ChessComApiError('Player not found', 404, 'NOT_FOUND')
  }
  if (response.status === 429) {
    throw new ChessComApiError('Rate limited by Chess.com API', 429, 'RATE_LIMITED')
  }
  if (!response.ok) {
    throw new ChessComApiError(
      `Chess.com API error: ${response.status} ${response.statusText}`,
      response.status
    )
  }

  try {
    return (await response.json()) as T
  } catch {
    throw new ChessComApiError('Failed to parse API response', response.status, 'PARSE_ERROR')
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Public API functions ─────────────────────────────────────────────────────

/** Fetch a player's public profile. */
export async function fetchPlayerProfile(username: string): Promise<ChessComPlayer> {
  return apiFetch<ChessComPlayer>(
    chessComUrl(`/player/${encodeURIComponent(username.toLowerCase())}`)
  )
}

/** Fetch a player's rating stats across all time controls. */
export async function fetchPlayerStats(username: string): Promise<ChessComStats> {
  return apiFetch<ChessComStats>(
    chessComUrl(`/player/${encodeURIComponent(username.toLowerCase())}/stats`)
  )
}

/** Fetch the list of monthly archive URLs for a player. */
export async function fetchGameArchives(username: string): Promise<string[]> {
  const result = await apiFetch<{ archives: string[] }>(
    chessComUrl(`/player/${encodeURIComponent(username.toLowerCase())}/games/archives`)
  )
  return result.archives
}

/** Fetch all games from a monthly archive URL. */
export async function fetchGamesForArchive(archiveUrl: string): Promise<ChessComGame[]> {
  const result = await apiFetch<{ games: ChessComGame[] }>(proxyArchiveUrl(archiveUrl))
  return result.games
}

// ── Higher-level helpers ─────────────────────────────────────────────────────

export interface FetchedGame {
  chesscomGame: ChessComGame
  parsed: ParsedGame
}

export interface FetchOptions {
  /** Max games to return (default 20) */
  maxGames?: number
  /** Filter by time class (default 'all') */
  timeClass?: TimeClass
  /** How many months back to search (default 1) */
  monthsBack?: number
  /** Progress callback: (fetched, goal) */
  onProgress?: (fetched: number, goal: number) => void
}

/**
 * Fetch and parse the most recent games for a player, most recent first.
 * Limits to `maxGames` games across the last `monthsBack` months.
 */
export async function fetchRecentGames(
  username: string,
  options: FetchOptions = {}
): Promise<FetchedGame[]> {
  const { maxGames = 20, timeClass = 'all', monthsBack = 1, onProgress } = options

  const archives = await fetchGameArchives(username)
  // Take the most recent N archives (each is one calendar month)
  const recentArchives = archives
    .slice(-Math.min(monthsBack + 1, archives.length))
    .reverse()

  const results: FetchedGame[] = []

  for (const archiveUrl of recentArchives) {
    if (results.length >= maxGames) break

    try {
      const games = await fetchGamesForArchive(archiveUrl)
      const filtered =
        timeClass === 'all' ? games : games.filter((g) => g.time_class === timeClass)

      // Reverse for most-recent-first order
      for (const game of [...filtered].reverse()) {
        if (results.length >= maxGames) break
        if (!game.pgn) continue
        const parsed = parsePgn(game.pgn)
        if (!parsed) continue
        results.push({ chesscomGame: game, parsed })
        onProgress?.(results.length, maxGames)
      }
    } catch (err) {
      console.warn(`[fetchRecentGames] Skipping archive ${archiveUrl}:`, err)
    }

    await sleep(150) // be nice to the API
  }

  return results
}

/** Return the player's current rating for a given time class. */
export function getPlayerRating(
  stats: ChessComStats,
  timeClass: 'rapid' | 'blitz' | 'bullet' | 'daily'
): number | undefined {
  const key = `chess_${timeClass}` as keyof ChessComStats
  return stats[key]?.last?.rating
}

/** Determine which side (white/black) the named player was. */
export function getPlayerSide(game: ChessComGame, username: string): 'white' | 'black' {
  return game.white.username.toLowerCase() === username.toLowerCase() ? 'white' : 'black'
}
