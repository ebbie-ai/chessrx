import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchPlayerProfile,
  fetchPlayerStats,
  fetchGameArchives,
  fetchGamesForArchive,
  getPlayerRating,
  getPlayerSide,
  ChessComApiError,
  type ChessComGame,
  type ChessComPlayer,
  type ChessComStats,
} from '@/lib/chesscom-api'
import { parsePgn } from '@/lib/pgn-parser'

// ── Sample PGN (as would come from Chess.com API) ────────────────────────────

const SAMPLE_CHESSCOM_PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.02.10"]
[Round "-"]
[White "btakashi444"]
[Black "SomeOpponent"]
[Result "1-0"]
[WhiteElo "1520"]
[BlackElo "1490"]
[TimeControl "180+0"]
[ECO "B12"]
[Opening "Caro-Kann Defense"]
[Termination "btakashi444 won on time"]

1. e4 {[%clk 0:03:00]} 1... c6 {[%clk 0:03:00]} 2. d4 {[%clk 0:02:59]} 2... d5 {[%clk 0:02:58]} 3. e5 {[%clk 0:02:57]} 3... Bf5 {[%clk 0:02:56]} 4. Nf3 {[%clk 0:02:55]} 4... e6 {[%clk 0:02:54]} 5. Be2 {[%clk 0:02:53]} 5... Nd7 {[%clk 0:02:50]} 1-0`

// ── PGN parsing via Chess.com context ────────────────────────────────────────

describe('Chess.com PGN parsing', () => {
  it('parses a Chess.com PGN string correctly', () => {
    const game = parsePgn(SAMPLE_CHESSCOM_PGN)
    expect(game).not.toBeNull()
    if (!game) return

    expect(game.white).toBe('btakashi444')
    expect(game.black).toBe('SomeOpponent')
    expect(game.whiteElo).toBe(1520)
    expect(game.blackElo).toBe(1490)
    expect(game.opening).toBe('Caro-Kann Defense')
    expect(game.timeControl).toBe('180+0')
    expect(game.date).toBe('2026.02.10')
    expect(game.result).toBe('1-0')
  })

  it('parses 10 moves from the sample PGN', () => {
    const game = parsePgn(SAMPLE_CHESSCOM_PGN)
    expect(game?.moves).toHaveLength(10)
  })

  it('extracts clock annotations from Chess.com PGN', () => {
    const game = parsePgn(SAMPLE_CHESSCOM_PGN)
    if (!game) throw new Error('parsePgn failed')

    // 1.e4 → 0:03:00 = 180s
    expect(game.moves[0]?.clockAfter).toBe(180)
    // 1...c6 → 0:03:00 = 180s
    expect(game.moves[1]?.clockAfter).toBe(180)
    // 2.d4 → 0:02:59 = 179s
    expect(game.moves[2]?.clockAfter).toBe(179)
  })

  it('calculates time spent per move', () => {
    const game = parsePgn(SAMPLE_CHESSCOM_PGN)
    if (!game) throw new Error('parsePgn failed')

    // Move 2 (2.d4): clockBefore=180, clockAfter=179 → 1s
    expect(game.moves[2]?.timeSpent).toBe(1)
    // Move 3 (2...d5): clockBefore=179, clockAfter=178 → 1s  
    expect(game.moves[3]?.timeSpent).toBe(1)
  })

  it('assigns correct move sides', () => {
    const game = parsePgn(SAMPLE_CHESSCOM_PGN)
    if (!game) throw new Error('parsePgn failed')

    // Even indices = white, odd = black
    for (let i = 0; i < game.moves.length; i++) {
      const expected = i % 2 === 0 ? 'white' : 'black'
      expect(game.moves[i]?.side).toBe(expected)
    }
  })

  it('fenBefore of move 0 is the standard starting position', () => {
    const game = parsePgn(SAMPLE_CHESSCOM_PGN)
    if (!game) throw new Error('parsePgn failed')

    expect(game.moves[0]?.fenBefore).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    )
  })

  it('first UCI move is e2e4', () => {
    const game = parsePgn(SAMPLE_CHESSCOM_PGN)
    if (!game) throw new Error('parsePgn failed')
    expect(game.moves[0]?.uci).toBe('e2e4')
  })
})

// ── getPlayerRating ───────────────────────────────────────────────────────────

describe('getPlayerRating', () => {
  const stats: ChessComStats = {
    chess_blitz: {
      last: { rating: 1520, date: 1700000000, rd: 50 },
      best: { rating: 1650, date: 1600000000, game: 'https://chess.com/game/1' },
      record: { win: 100, loss: 80, draw: 20 },
    },
    chess_rapid: {
      last: { rating: 1480, date: 1700000000, rd: 60 },
      best: { rating: 1550, date: 1600000000, game: 'https://chess.com/game/2' },
      record: { win: 50, loss: 40, draw: 10 },
    },
  }

  it('returns the correct blitz rating', () => {
    expect(getPlayerRating(stats, 'blitz')).toBe(1520)
  })

  it('returns the correct rapid rating', () => {
    expect(getPlayerRating(stats, 'rapid')).toBe(1480)
  })

  it('returns undefined for a time class with no data', () => {
    expect(getPlayerRating(stats, 'bullet')).toBeUndefined()
    expect(getPlayerRating(stats, 'daily')).toBeUndefined()
  })
})

// ── getPlayerSide ─────────────────────────────────────────────────────────────

describe('getPlayerSide', () => {
  const makeGame = (white: string, black: string): ChessComGame => ({
    url: 'https://chess.com/game/123',
    pgn: '',
    time_control: '300+0',
    end_time: 1700000000,
    rated: true,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    time_class: 'blitz',
    rules: 'chess',
    white: { rating: 1500, result: '1-0', '@id': '', username: white, uuid: '' },
    black: { rating: 1450, result: '0-1', '@id': '', username: black, uuid: '' },
  })

  it('returns "white" when the user played as white', () => {
    const game = makeGame('btakashi444', 'opponent')
    expect(getPlayerSide(game, 'btakashi444')).toBe('white')
  })

  it('returns "black" when the user played as black', () => {
    const game = makeGame('opponent', 'btakashi444')
    expect(getPlayerSide(game, 'btakashi444')).toBe('black')
  })

  it('is case-insensitive', () => {
    const game = makeGame('BTakashi444', 'opponent')
    expect(getPlayerSide(game, 'btakashi444')).toBe('white')
    expect(getPlayerSide(game, 'BTAKASHI444')).toBe('white')
  })
})

// ── API fetch functions (mocked) ─────────────────────────────────────────────

describe('fetchPlayerProfile', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the correct URL', async () => {
    const mockPlayer: ChessComPlayer = {
      '@id': 'https://api.chess.com/pub/player/btakashi444',
      url: 'https://www.chess.com/member/btakashi444',
      username: 'btakashi444',
      player_id: 12345,
      status: 'premium',
      country: 'https://api.chess.com/pub/country/US',
      joined: 1600000000,
      last_online: 1700000000,
      followers: 10,
      is_streamer: false,
    }

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockPlayer), { status: 200 })
    )

    const result = await fetchPlayerProfile('btakashi444')
    expect(result.username).toBe('btakashi444')
    // In browser context (jsdom) calls go through the Next.js proxy route
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/chesscom/player/btakashi444',
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    )
  })

  it('throws ChessComApiError on 404', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))

    await expect(fetchPlayerProfile('nobody')).rejects.toThrow(ChessComApiError)
    await expect(fetchPlayerProfile('nobody2')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    })
  })

  it('throws ChessComApiError on 429 (rate limit)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 429 }))

    await expect(fetchPlayerProfile('user')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
    })
  })

  it('throws ChessComApiError on network failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network request failed'))

    await expect(fetchPlayerProfile('user')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    })
  })
})

describe('fetchGameArchives', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns an array of archive URLs', async () => {
    const mockArchives = {
      archives: [
        'https://api.chess.com/pub/player/btakashi444/games/2026/01',
        'https://api.chess.com/pub/player/btakashi444/games/2026/02',
      ],
    }

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockArchives), { status: 200 })
    )

    const result = await fetchGameArchives('btakashi444')
    expect(result).toHaveLength(2)
    expect(result[0]).toContain('2026/01')
    expect(result[1]).toContain('2026/02')
  })
})
