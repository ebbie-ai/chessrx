import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

interface ExplainRequest {
  fen: string
  bestMove: string
  playerMove: string
  evalBefore: number
  evalAfter: number
  side: 'white' | 'black'
  moveNumber: number
  opponent: string
  pattern: string
}

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    )
  }

  let body: ExplainRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { fen, bestMove, playerMove, evalBefore, evalAfter, side, moveNumber, opponent, pattern } = body

  const sideLabel = side === 'white' ? 'White' : 'Black'
  const evalDelta = Math.abs(evalAfter - evalBefore)

  const prompt = `You are a chess coach explaining a critical moment from a real game to an improving player (rated ~1000-1500).

Position (FEN): ${fen}
It is ${sideLabel}'s turn (move ${moveNumber}).
The player played: ${playerMove} (a ${pattern.toLowerCase()})
The best move was: ${bestMove}
Evaluation shifted from ${evalBefore > 0 ? '+' : ''}${evalBefore.toFixed(1)} to ${evalAfter > 0 ? '+' : ''}${evalAfter.toFixed(1)} (${evalDelta.toFixed(1)} pawn swing).

Write a 2-3 sentence explanation of WHY the best move (${bestMove}) is strong. Identify the tactical or positional theme (fork, pin, skewer, discovered attack, hanging piece, pawn structure, etc.). Be specific about which pieces and squares are involved. Write as if talking directly to the player — warm but concise, no fluff.

Do NOT mention the evaluation numbers. Do NOT start with "The best move" — vary your openings.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20250414',
        max_tokens: 200,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', response.status, errText)
      return NextResponse.json(
        { error: 'Explanation generation failed' },
        { status: 502 }
      )
    }

    const data = await response.json()
    const explanation = data.content?.[0]?.text ?? ''

    return NextResponse.json({ explanation })
  } catch (err) {
    console.error('Explain API error:', err)
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    )
  }
}
