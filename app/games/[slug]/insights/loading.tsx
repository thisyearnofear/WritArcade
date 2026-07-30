export default function InsightsLoading() {
  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-4xl animate-pulse px-4 py-10">
        <div className="h-3 w-24 rounded bg-white/10" />
        <div className="mt-6 h-7 w-56 rounded bg-white/10" />
        <div className="mt-2 h-3 w-72 rounded bg-white/10" />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-white/10 bg-white/5" />
          ))}
        </div>
        <div className="mt-8 h-64 rounded-xl border border-white/10 bg-white/5" />
      </div>
    </div>
  )
}
