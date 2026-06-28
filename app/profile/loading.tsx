import { SkeletonShimmer } from '@/components/effects'

export default function ProfileLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <SkeletonShimmer lines={2} showAvatar={false} />
          <div className="grid gap-6 mt-8">
            <div className="h-48 bg-card border border-border rounded-lg animate-pulse" />
            <div className="h-32 bg-card border border-border rounded-lg animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  )
}
