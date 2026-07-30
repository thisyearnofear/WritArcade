export default function EmbedLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="space-y-4 text-center">
        <div className="loading-spinner mx-auto" />
        <p className="animate-pulse text-sm text-muted-foreground">Loading story...</p>
      </div>
    </div>
  )
}
