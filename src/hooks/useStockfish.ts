'use client'

/**
 * useStockfish — React hook for real-time position evaluation.
 *
 * Uses Stockfish 18 (sf_18_smallnet) via @lichess-org/stockfish-web.
 * Requires COOP/COEP headers (set in next.config.js) for SharedArrayBuffer.
 *
 * The SF module is loaded once on mount and reused across analyze() calls.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// ── Local module type ────────────────────────────────────────────────────────

interface StockfishWebModule {
  uci(command: string): void
  setNnueBuffer(data: Uint8Array, index?: number): void
  getRecommendedNnue(index?: number): string
  listen: (data: string) => void
  onError: (msg: string) => void
}

// ── Hook state ───────────────────────────────────────────────────────────────

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

// ── Runtime loader ───────────────────────────────────────────────────────────

/**
 * Load a JS module from a runtime URL, bypassing TypeScript module resolution
 * and webpack static analysis. webpackIgnore inside new Function is a string
 * literal in the generated code, so webpack still ignores it.
 */
function loadRuntimeModule<T>(url: string): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function('u', 'return import(/* webpackIgnore: true */ u)')(url) as Promise<T>
}

// ── Initialization ───────────────────────────────────────────────────────────

async function initStockfish18(): Promise<StockfishWebModule> {
  type Sf18Factory = (arg: Partial<StockfishWebModule> & { wasmMemory?: WebAssembly.Memory }) => Promise<StockfishWebModule>
  const mod = await loadRuntimeModule<{ default: Sf18Factory }>('/stockfish/sf_18_smallnet.js')

  const wasmMemory = new WebAssembly.Memory({ shared: true, initial: 1536, maximum: 32767 })
  const sf: StockfishWebModule = await mod.default({ wasmMemory })

  // Phase 1: wait for uciok
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      sf.listen = () => {}
      reject(new Error('SF18 uciok timeout'))
    }, 30_000)
    sf.listen = (line: string) => {
      if (line === 'uciok') {
        clearTimeout(timeout)
        sf.listen = () => {}
        resolve()
      }
    }
    sf.onError = (msg: string) => console.error('[SF18 hook]', msg)
    sf.uci('uci')
  })

  // Phase 2: load NNUE (best-effort; engine works without it)
  const nnueName = sf.getRecommendedNnue()
  try {
    const resp = await fetch(`/stockfish/${nnueName}`)
    if (resp.ok) {
      sf.setNnueBuffer(new Uint8Array(await resp.arrayBuffer()))
    }
  } catch (err) {
    console.warn('[SF18 hook] NNUE load failed:', err)
  }

  // Phase 3: configure and wait for readyok
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      sf.listen = () => {}
      reject(new Error('SF18 readyok timeout'))
    }, 30_000)
    sf.listen = (line: string) => {
      if (line === 'readyok') {
        clearTimeout(timeout)
        sf.listen = () => {}
        resolve()
      }
    }
    sf.uci('setoption name Threads value 2')
    sf.uci('setoption name Hash value 16')
    sf.uci('isready')
  })

  return sf
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useStockfish(): StockfishState {
  const sfRef = useRef<StockfishWebModule | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [evaluation, setEvaluation] = useState<number | null>(null)
  const [bestMove, setBestMove] = useState<string | null>(null)
  const [depth, setDepth] = useState(0)

  useEffect(() => {
    let cancelled = false

    initStockfish18()
      .then((sf) => {
        if (cancelled) return
        sfRef.current = sf
        // Idle listener (no-op until analyze() sets a real one)
        sf.listen = () => {}
        setIsReady(true)
      })
      .catch((err) => {
        if (!cancelled) console.warn('[SF18 hook] Init failed:', err)
      })

    return () => {
      cancelled = true
      // Drop reference; the engine keeps running in its pthread until page unload.
      sfRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    const sf = sfRef.current
    if (!sf) return
    sf.uci('stop')
    sf.listen = () => {}
    setIsAnalyzing(false)
  }, [])

  const analyze = useCallback(
    (fen: string, maxDepth = 18) => {
      const sf = sfRef.current
      if (!sf || !isReady) return

      // Reset state
      setEvaluation(null)
      setBestMove(null)
      setDepth(0)
      setIsAnalyzing(true)

      sf.listen = (line: string) => {
        if (!line) return

        // "info depth 15 score cp 42 ..."
        if (line.startsWith('info') && line.includes('score')) {
          const depthMatch = line.match(/\bdepth (\d+)/)
          const depthStr = depthMatch?.[1]
          if (depthStr !== undefined) setDepth(parseInt(depthStr))

          const cpMatch = line.match(/\bscore cp (-?\d+)/)
          const cpStr = cpMatch?.[1]
          if (cpStr !== undefined) {
            // Eval is from side-to-move perspective; normalize to White's.
            const sideToMove = fen.split(' ')[1]
            const cp = parseInt(cpStr) / 100
            setEvaluation(sideToMove === 'b' ? -cp : cp)
          }

          const mateMatch = line.match(/\bscore mate (-?\d+)/)
          const mateStr = mateMatch?.[1]
          if (mateStr !== undefined) {
            const mateMoves = parseInt(mateStr)
            const sideToMove = fen.split(' ')[1]
            const raw = mateMoves > 0 ? 999 : -999
            setEvaluation(sideToMove === 'b' ? -raw : raw)
          }
        }

        if (line.startsWith('bestmove')) {
          const parts = line.split(' ')
          const move = parts[1]
          if (move && move !== '(none)') {
            setBestMove(move)
          }
          sf.listen = () => {}
          setIsAnalyzing(false)
        }
      }

      sf.uci('stop')
      sf.uci('ucinewgame')
      sf.uci(`position fen ${fen}`)
      sf.uci(`go depth ${maxDepth}`)
    },
    [isReady]
  )

  return { isReady, isAnalyzing, evaluation, bestMove, depth, analyze, stop }
}
