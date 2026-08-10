export default function DailyLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Badge + heading skeleton */}
          <div className="space-y-3">
            <div className="h-5 w-32 bg-muted rounded-full animate-pulse" />
            <div className="h-9 w-72 bg-muted rounded animate-pulse" />
            <div className="h-4 w-56 bg-muted rounded animate-pulse" />
          </div>
          {/* Canvas skeleton */}
          <div className="aspect-square max-h-[480px] w-full rounded-2xl bg-muted animate-pulse" />
          {/* CTA skeleton */}
          <div className="h-12 w-full max-w-md mx-auto bg-muted rounded-lg animate-pulse" />
        </div>
      </main>
    </div>
  )
}
