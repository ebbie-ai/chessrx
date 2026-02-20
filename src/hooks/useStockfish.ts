'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface StockfishState {
  isReady: boolean
  isAnalyzing: boolean
  /** Centipawn evaluation from White's perspective (positive = White is better) */
  evaluation: number | null
  /** Best move in UCI format (e.g. "e2e4") */
  bestMove: string | null
  /** Depth reached in current analysis */
  depth: number
  analyze: (fen: string, depth?: number) => void
  stop: () => void
}

export function useStockfish(): StockfishState {
  const workerRef = useRef<Worker | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [evaluation, setEvaluation] = useState<number | null>(null)
  const [bestMove, setBestMove] = useState<string | null>(null)
  const [depth, setDepth] = useState(0)

  useEffect(() => {
    let cancelled = false

    try {
      const worker = new Worker('/stockfish/stockfish-lite-single.js')

      if (cancelled) {
        worker.terminate()
        return
      }

      worker.onmessage = (e: MessageEvent<string>) => {
        const line = e.data
        if (!line) return

        // Engine ready
        if (line === 'readyok') {
          setIsReady(true)
          return
        }

        // Score info line: "info depth 15 score cp 42 ..."
        if (line.startsWith('info') && line.includes('score')) {
          const depthMatch = line.match(/\bdepth (\d+)/)
          const depthStr = depthMatch?.[1]
          if (depthStr !== undefined) setDepth(parseInt(depthStr))

          const cpMatch = line.match(/\bscore cp (-?\d+)/)
          const cpStr = cpMatch?.[1]
          if (cpStr !== undefined) {
            setEvaluation(parseInt(cpStr) / 100)
          }

          // Mate score: "score mate N"
          const mateMatch = line.match(/\bscore mate (-?\d+)/)
          const mateStr = mateMatch?.[1]
          if (mateStr !== undefined) {
            const mateMoves = parseInt(mateStr)
            setEvaluation(mateMoves > 0 ? 999 : -999)
          }
        }

        // Best move result
        if (line.startsWith('bestmove')) {
          const parts = line.split(' ')
          const move = parts[1]
          if (move && move !== '(none)') {
            setBestMove(move)
          }
          setIsAnalyzing(false)
        }
      }

      worker.onerror = (err) => {
        console.warn('[Stockfish] Worker error:', err.message)
      }

      // Initialize UCI protocol
      worker.postMessage('uci')
      worker.postMessage('setoption name Threads value 1')
      worker.postMessage('setoption name Hash value 16')
      worker.postMessage('isready')

      workerRef.current = worker
    } catch (err) {
      console.warn('[Stockfish] Failed to initialize:', err)
    }

    return () => {
      cancelled = true
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage('stop')
      setIsAnalyzing(false)
    }
  }, [])

  const analyze = useCallback(
    (fen: string, maxDepth = 18) => {
      const worker = workerRef.current
      if (!worker || !isReady) return

      // Reset state
      setEvaluation(null)
      setBestMove(null)
      setDepth(0)
      setIsAnalyzing(true)

      worker.postMessage('stop')
      worker.postMessage('ucinewgame')
      worker.postMessage(`position fen ${fen}`)
      worker.postMessage(`go depth ${maxDepth}`)
    },
    [isReady]
  )

  return { isReady, isAnalyzing, evaluation, bestMove, depth, analyze, stop }
}
