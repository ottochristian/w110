import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">

        {/* Illustration */}
        <div className="text-8xl mb-6 select-none">⛷️</div>

        {/* Error code */}
        <p className="text-xs font-bold tracking-[0.3em] text-orange-500 uppercase mb-3">
          Error 404 — Page Not Found
        </p>

        {/* Headline */}
        <h1 className="text-3xl font-bold text-foreground mb-4 leading-tight">
          You've skied off the groomed trail
        </h1>

        {/* Body copy */}
        <p className="text-muted-foreground text-sm leading-relaxed mb-2">
          Patrol has been notified, but honestly they're still finishing their coffee at the lodge.
          The page you're looking for doesn't exist — or it did exist, but took a yard sale on a black diamond and is currently scattered across the mountain.
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed mb-8">
          Pro tip: this is not the terrain park. Please stick to the marked runs.
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted-foreground text-xs">🎿</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
          >
            Back to the lodge
          </Link>
          <Link
            href="javascript:history.back()"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border hover:bg-secondary text-foreground text-sm font-medium px-5 py-2.5 transition-colors"
          >
            Ride the chairlift back up
          </Link>
        </div>

        {/* Footer quip */}
        <p className="text-muted-foreground text-xs mt-10">
          Ski patrol response time: unknown. Coffee break status: ongoing.
        </p>
      </div>
    </div>
  )
}
