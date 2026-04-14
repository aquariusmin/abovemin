export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-[#4A5D4E] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-sans">
          Loading...
        </p>
      </div>
    </div>
  );
}
