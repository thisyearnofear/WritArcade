import { BasePaintDayArchiveView } from '@/components/basepaint/basepaint-day-archive-view'
import { getBasePaintDay } from '@/lib/basepaint'

interface PageProps {
  params: Promise<{ day: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { day: dayParam } = await params
  const day = parseInt(dayParam, 10)
  return {
    title: Number.isFinite(day) ? `BasePaint Day ${day}` : 'Canvas archive',
  }
}

export default async function BasePaintDayPage({ params }: PageProps) {
  const { day: dayParam } = await params
  const day = parseInt(dayParam, 10)
  const validDay = Number.isFinite(day) && day >= 1 ? day : getBasePaintDay()
  return <BasePaintDayArchiveView day={validDay} />
}
