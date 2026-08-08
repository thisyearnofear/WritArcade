import { redirect } from 'next/navigation'

/** Consolidated entry — daily challenge lives at /basepaint for hackathon + product clarity. */
export default function DailyRedirectPage() {
  redirect('/basepaint')
}
