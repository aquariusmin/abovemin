export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen flex items-center justify-center px-8"
    >
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="eyebrow text-muted-foreground" aria-hidden="true">Loading…</p>
        <span className="sr-only">Loading, please wait.</span>
      </div>
    </div>
  );
}
