import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      {/* Background decorations */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Radial glow top-center */}
        <div className="absolute -top-32 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-teal-500/5 blur-3xl" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* Hero */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:py-32">
        {/* Eyebrow */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-teal-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-500" />
          </span>
          Early Preview
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-3xl text-5xl font-extrabold leading-none tracking-tight text-white sm:text-6xl md:text-7xl">
          Your games.{' '}
          <span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Your mistakes.
          </span>
          <br />
          Your training.
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
          AI chess coaching that learns from your actual games — not someone
          else&apos;s. Every puzzle is a position you reached. Every pattern is
          one you need to fix.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/train"
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-teal-500 px-7 py-3.5 text-base font-bold text-slate-900 shadow-lg shadow-teal-500/25 transition-all duration-200 hover:bg-teal-400 hover:shadow-teal-400/40 active:scale-[0.97]"
          >
            Get Started
            <svg
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/train"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-7 py-3.5 text-base font-medium text-slate-300 transition-all duration-200 hover:border-white/20 hover:bg-white/5 hover:text-white active:scale-[0.97]"
          >
            Try sample puzzles
          </Link>
        </div>

        {/* Social proof / trust */}
        <p className="mt-8 text-xs text-slate-600">
          No account required for demo · No data stored
        </p>
      </section>

      {/* Feature grid */}
      <section className="relative px-4 pb-24">
        <div className="mx-auto max-w-5xl">
          {/* Section header */}
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Built different, for how you actually improve
            </h2>
            <p className="mt-3 text-slate-500">
              Most chess apps train you on random positions. ChessRx trains you
              on{' '}
              <em className="not-italic text-slate-400">your</em> positions.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon="🎯"
              title="Personalized Puzzles"
              description="Every training session is built from blunders and missed tactics in your own games. No filler, no noise — just the patterns you need."
              accent="teal"
            />
            <FeatureCard
              icon="🧠"
              title="Pattern Recognition"
              description="ChessRx clusters your mistakes by tactical theme: pins, forks, back-rank threats. Train the weakness, not the symptom."
              accent="cyan"
            />
            <FeatureCard
              icon="⏰"
              title="Time-Aware Training"
              description="Losing on time? Your puzzle pool skews faster. Playing well tonight? We reduce volume and sharpen depth. Adapts to your session, not a schedule."
              accent="teal"
            />
            <FeatureCard
              icon="💚"
              title="Positive Reinforcement"
              description="No streaks to break, no XP bars, no shame. ChessRx focuses on what you got right and builds momentum from there."
              accent="green"
            />
            <FeatureCard
              icon="♟️"
              title="Stockfish Analysis"
              description="Every position is analyzed at depth 18+ with Stockfish NNUE. See the eval bar shift as you find the right move."
              accent="cyan"
            />
            <FeatureCard
              icon="📈"
              title="Game Context"
              description="Each puzzle shows the game it came from — the opponent, the date, the moment. Training feels like storytelling, not homework."
              accent="teal"
            />
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="relative border-t border-white/5 px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-teal-400">
            Start now
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            The only chess coach that knows your games
          </h2>
          <p className="mt-4 text-slate-500">
            Try the training demo with sample puzzles — no sign-up needed.
          </p>
          <Link
            href="/train"
            className="mt-8 inline-flex items-center gap-2.5 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-slate-900 transition-all duration-200 hover:bg-slate-100 active:scale-[0.97]"
          >
            Open Training
          </Link>
        </div>
      </section>
    </div>
  )
}

// --- Sub-components ---

function FeatureCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: string
  title: string
  description: string
  accent: 'teal' | 'cyan' | 'green'
}) {
  const accentStyles = {
    teal: 'group-hover:border-teal-500/30 group-hover:bg-teal-500/3',
    cyan: 'group-hover:border-cyan-500/30 group-hover:bg-cyan-500/3',
    green: 'group-hover:border-emerald-500/30 group-hover:bg-emerald-500/3',
  }

  return (
    <div
      className={`group rounded-xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-300 ${accentStyles[accent]}`}
    >
      <div className="mb-4 text-3xl">{icon}</div>
      <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  )
}
