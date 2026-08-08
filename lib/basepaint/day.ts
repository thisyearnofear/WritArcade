import { BASEPAINT_EPOCH, DAY_SECONDS } from '@/lib/basepaint/constants'

/** 1-based BasePaint day index (server + client). */
export function getBasePaintDay(at = Date.now()): number {
  return Math.floor((Math.floor(at / 1000) - BASEPAINT_EPOCH) / DAY_SECONDS) + 1
}

/** Zero-padded day for CDN paths (e.g. 0847). */
export function formatBasePaintDayPadded(day: number): string {
  return String(day).padStart(4, '0')
}
