export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="eyebrow text-muted">Loading…</p>
      </div>
    </div>
  );
}
