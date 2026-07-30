export default function StudioLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 py-8 sm:py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="h-4 w-40 bg-muted rounded animate-pulse mx-auto" />
            <div className="mt-3 h-10 w-72 bg-muted rounded animate-pulse mx-auto" />
            <div className="mt-2 h-4 w-80 bg-muted rounded animate-pulse mx-auto" />
          </div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-48 w-full bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 bg-muted rounded animate-pulse" />
              <div className="h-16 bg-muted rounded animate-pulse" />
              <div className="h-16 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-12 w-full bg-muted rounded animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  )
}
