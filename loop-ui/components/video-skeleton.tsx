"use client"

export function VideoSkeleton() {
  return (
    <div className="h-screen w-full bg-black flex items-center justify-center">
      <div className="w-full max-w-md space-y-4 px-4">
        {/* Video skeleton */}
        <div className="aspect-[9/16] bg-neutral-900 rounded-xl animate-pulse" />

        {/* User info skeleton */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-800 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-neutral-800 rounded animate-pulse" />
            <div className="h-3 w-16 bg-neutral-800 rounded animate-pulse" />
          </div>
        </div>

        {/* Caption skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-neutral-800 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-neutral-800 rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export function VideoFeedSkeleton() {
  return (
    <div className="h-screen overflow-hidden bg-black">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-screen flex items-center justify-center">
          <div className="w-full max-w-md space-y-4 px-4">
            <div className="aspect-[9/16] bg-neutral-900 rounded-xl animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-800 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-neutral-800 rounded animate-pulse" />
                <div className="h-3 w-16 bg-neutral-800 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}


