'use client'

/** Optional 1×1 tracking pixel — https://basepaint.xyz/ai.txt */
export function BasePaintTrack({ refName = 'writersarcade' }: { refName?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://basepaint.xyz/api/track.gif?ref=${encodeURIComponent(refName)}`}
      alt=""
      width={1}
      height={1}
      className="pointer-events-none absolute opacity-0"
      aria-hidden
    />
  )
}
