/**
 * /api/chesscom/[...path]
 *
 * Server-side proxy for Chess.com public API.
 *
 * With COEP: require-corp active in the browser, cross-origin fetches require
 * the remote server to send `Cross-Origin-Resource-Policy: cross-origin`.
 * Chess.com's public API does not set this header, so browser fetch calls fail
 * with a network error. Routing through this Next.js API route avoids the
 * problem because the browser only sees a same-origin response.
 *
 * Usage: replace https://api.chess.com/pub/<path> with /api/chesscom/<path>
 */

import { NextRequest, NextResponse } from 'next/server'

const CHESS_COM_BASE = 'https://api.chess.com/pub'

// Upstream Chess.com rate-limit is generous for public data (~300 req/min),
// so we just pass calls straight through without additional throttling.
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const upstreamPath = params.path.join('/')
  const search = request.nextUrl.search // preserve query strings if any
  const upstreamUrl = `${CHESS_COM_BASE}/${upstreamPath}${search}`

  let upstreamRes: Response
  try {
    upstreamRes = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        // Chess.com asks clients to identify themselves
        'User-Agent': 'ChessRx/0.1 (https://github.com/chessrx)',
      },
      // 25 second timeout — generous for monthly archive fetches
      signal: AbortSignal.timeout(25_000),
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to reach Chess.com: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    )
  }

  // Forward status codes faithfully
  if (!upstreamRes.ok) {
    return NextResponse.json(
      { error: `Chess.com returned ${upstreamRes.status}` },
      { status: upstreamRes.status }
    )
  }

  let data: unknown
  try {
    data = await upstreamRes.json()
  } catch {
    return NextResponse.json({ error: 'Failed to parse Chess.com response' }, { status: 502 })
  }

  return NextResponse.json(data, {
    status: 200,
    headers: {
      // Allow browser to cache public data briefly to reduce upstream calls
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      // Required so the browser treats this same-origin response as safe under COEP
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  })
}
