// A spinning ring, used everywhere the app is waiting on the server.
// Pass `label` when the spinner is the only thing on screen, so screen readers hear what's
// loading; leave it out when visible text next to it already says so.
// motion-safe: people who turn on "reduce motion" see a still ring instead of a spinning one.
export function Spinner({ label, className = 'h-5 w-5 border-white' }: { label?: string; className?: string }) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`inline-block shrink-0 rounded-full border-4 border-t-transparent motion-safe:animate-spin ${className}`}
    />
  );
}

// Fills the screen while a whole page waits, e.g. for sign-in to load.
export function PageLoading({ label = 'loading' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy">
      <Spinner label={label} className="h-16 w-16 border-pink" />
    </div>
  );
}
