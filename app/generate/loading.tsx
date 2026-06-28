export default function GenerateLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 py-8 sm:py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="h-10 w-64 bg-muted rounded animate-pulse mx-auto" />
            <div className="mt-2 h-4 w-80 bg-muted rounded animate-pulse mx-auto" />
          </div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-12 w-full bg-muted rounded animate-pulse" />
            </div>
            <div className="h-10 w-40 bg-muted rounded animate-pulse" />
            <div className="flex gap-2 pt-2">
              <div className="h-12 flex-1 bg-muted rounded animate-pulse" />
              <div className="h-12 w-28 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
