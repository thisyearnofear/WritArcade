import { GridSkeleton } from '@/components/effects'

export default function GamesLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="mt-2 h-4 w-72 bg-muted rounded animate-pulse" />
          </div>
          <GridSkeleton count={6} columns={3} />
        </div>
      </main>
    </div>
  )
}
