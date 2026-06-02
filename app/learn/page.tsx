import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { ArrowRight, Network } from 'lucide-react'

export const metadata = {
  title: 'Learn — WritersArcade',
  description: 'How WritersArcade works, which chains it uses, and how to participate.',
}

const PAGES = [
  {
    href: '/learn/chains',
    icon: Network,
    title: 'How the chains work',
    blurb: 'Mezo, Base, and Story Protocol — what each one does, and which one powers each part of the experience.',
  },
]

export default function LearnIndex() {
  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 py-12 sm:py-16 px-4">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Learn
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
              How WritersArcade works
            </h1>
            <p className="text-muted-foreground leading-relaxed mb-10 max-w-xl">
              Short, honest explainers. We try to keep the marketing to a minimum.
            </p>

            <ul className="space-y-3">
              {PAGES.map((p) => {
                const Icon = p.icon
                return (
                  <li key={p.href}>
                    <Link
                      href={p.href}
                      className="group flex items-start gap-4 p-5 rounded-2xl border border-border bg-card hover:border-foreground/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0 group-hover:border-foreground/30 transition-colors">
                        <Icon className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold text-foreground mb-1 group-hover:text-foreground">
                          {p.title}
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">{p.blurb}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </main>
        <Footer />
      </div>
    </ThemeWrapper>
  )
}
