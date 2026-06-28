import { GridSkeleton } from '@/components/effects'

export default function MyGamesLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                <div className="h-8 w-12 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
          <GridSkeleton count={6} columns={3} />
        </div>
      </main>
    </div>
  )
}
