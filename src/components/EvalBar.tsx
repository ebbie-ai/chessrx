'use client'

import { clsx } from 'clsx'
import { evalToPercent } from '@/lib/chess-utils'

interface EvalBarProps {
  evaluation: number | null
  isAnalyzing: boolean
  flipped?: boolean
  className?: string
}

export function EvalBar({
  evaluation,
  isAnalyzing,
  flipped = false,
  className,
}: EvalBarProps) {
  const whitePercent =
    evaluation !== null ? evalToPercent(evaluation) : 50

  // If the board is flipped (black at bottom), invert so black's bar is at bottom
  const whiteBarPercent = flipped ? 100 - whitePercent : whitePercent

  const evalLabel =
    evaluation === null
      ? null
      : Math.abs(evaluation) >= 99
      ? `M`
      : evaluation > 0
      ? `+${evaluation.toFixed(1)}`
      : evaluation.toFixed(1)

  return (
    <div
      className={clsx(
        'relative flex flex-col self-stretch overflow-hidden rounded-lg border border-white/5',
        className
      )}
      style={{ width: 14, minWidth: 14 }}
      title={evalLabel ? `Eval: ${evalLabel}` : 'Analyzing…'}
    >
      {/* Black section (top = black advantage or neutral top) */}
      <div
        className="w-full flex-shrink-0 bg-slate-800 transition-all duration-700 ease-in-out"
        style={{ flexBasis: `${100 - whiteBarPercent}%` }}
      />
      {/* White section (bottom) */}
      <div
        className="w-full flex-shrink-0 bg-slate-200 transition-all duration-700 ease-in-out"
        style={{ flexBasis: `${whiteBarPercent}%` }}
      />

      {/* Analyzing pulse indicator */}
      {isAnalyzing && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 animate-pulse bg-teal-400/70" />
      )}
    </div>
  )
}
