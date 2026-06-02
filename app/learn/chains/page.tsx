import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ThemeWrapper } from '@/components/layout/ThemeWrapper'
import { Coins, Network, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'How the chains work — WritersArcade',
  description: 'WritersArcade uses Mezo, Base, and Story Protocol. Here is what each one does, and which one powers each part of the experience.',
}

export default function ChainsLearnPage() {
  return (
    <ThemeWrapper theme="arcade">
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">
          <article className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
            <nav className="text-xs text-muted-foreground mb-6">
              <Link href="/learn" className="hover:text-foreground transition-colors">Learn</Link>
              <span className="mx-1.5">/</span>
              <span className="text-foreground">Chains</span>
            </nav>

            <header className="mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                How the chains work
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
                WritersArcade runs on three chains. Each one does what it&apos;s best at.
              </h1>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                You don&apos;t need to pick one. The app auto-routes your action to the right chain, and you only sign when your wallet is needed.
              </p>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
              <ChainOverview color="amber" name="Mezo" role="Frictionless onramp" blurb="Pay for any game with MUSD, a Bitcoin-backed stablecoin. No writer token needed." />
              <ChainOverview color="blue" name="Base" role="Writer royalties" blurb="Mint games as NFTs. Writer coins (social tokens) flow back to the original writer." />
              <ChainOverview color="emerald" name="Story Protocol" role="On-chain IP" blurb="Register your game as intellectual property. Pool it with your other works to earn from derivatives." />
            </section>

            <SectionTable />
            <SectionRouting />
            <SectionTradeoffs />
            <SectionFaq />

            <section className="rounded-2xl border border-border bg-muted/20 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Ready to try it?</p>
                <p className="text-sm text-muted-foreground">Paste any Paragraph article — we&apos;ll auto-pick the right chain.</p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                Go to the arcade <ArrowRight className="w-4 h-4" />
              </Link>
            </section>
          </article>
        </main>
        <Footer />
      </div>
    </ThemeWrapper>
  )
}

function SectionTable() {
  return (
    <section className="mb-12">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground mb-4">
        Which chain for which action
      </h2>
      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left font-semibold py-3 px-4">When you&hellip;</th>
              <th className="text-left font-semibold py-3 px-4">You sign on</th>
              <th className="text-left font-semibold py-3 px-4">You pay / earn with</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <Row action="Pay to generate a game" chain="Mezo (Matsnet testnet)" token="MUSD (default) or a writer coin (Base) if the author has one" />
            <Row action="Mint a game as an NFT" chain="Base (mainnet) or Mezo (Matsnet)" token="MUSD on Mezo, or the writer coin on Base" />
            <Row action="Register the game as IP" chain="Story Protocol (Aeneid testnet)" token="Free (gas paid by the platform)" />
            <Row action="Pool your IPs for royalties" chain="Story Protocol (Aeneid testnet)" token="Free (gas paid by the platform)" />
            <Row action="Claim royalties from your pool" chain="Story Protocol (Aeneid testnet)" token="MUSD / WIP / native (per pool config)" />
            <Row action="Play a free Wordle" chain="— (no wallet, no chain)" token="Free" />
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Testnet configurations shown above. Mainnet launches are environment-gated per chain.
      </p>
    </section>
  )
}

function SectionRouting() {
  return (
    <section className="mb-12">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground mb-4">
        How the app picks a chain
      </h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          <span className="font-medium text-foreground">1. You paste a Paragraph article URL.</span>{' '}
          The app reads the author handle. If the author is one of our 5 launch writers (AVC, Debbie, Jake, Tso, Papa), the app pre-selects their coin on Base. Otherwise, it defaults to MUSD on Mezo so any article works.
        </p>
        <p>
          <span className="font-medium text-foreground">2. You submit.</span>{' '}
          The app routes payment to the selected chain and prompts your wallet to switch networks if needed. The same article can be paid with MUSD <em>or</em> the writer&apos;s coin — your choice.
        </p>
        <p>
          <span className="font-medium text-foreground">3. You play the game.</span>{' '}
          All gameplay happens off-chain. No transactions, no gas.
        </p>
        <p>
          <span className="font-medium text-foreground">4. You mint and (optionally) register IP.</span>{' '}
          Minting mints an NFT on the same chain you paid with. Registering IP moves you to Story Protocol and creates a writer-specific royalty pool — your first game creates the pool, every later game joins it.
        </p>
      </div>
    </section>
  )
}

function SectionTradeoffs() {
  return (
    <section className="mb-12">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground mb-4">
        Why three chains, honestly
      </h2>
      <div className="space-y-4">
        <Tradeoff name="Mezo" icon={<Coins className="w-4 h-4" />} color="amber" pros={['Cheap for any user — no writer token required', 'Bitcoin-backed stablecoin avoids writer-coin liquidity issues', 'Boosts for MEZO holders funded by the platform']} cons={['Testnet only at the moment — mainnet launch tracked separately']} />
        <Tradeoff name="Base" icon={<Network className="w-4 h-4" />} color="blue" pros={['Where the writer coins already live — no bridge, no friction', 'L2 finality for NFTs is fast and cheap', 'Coin holders are the people who actually want to play']} cons={['Only 5 launch writers have coins today', 'Users without a writer coin must bridge or use MUSD']} />
        <Tradeoff name="Story Protocol" icon={<ShieldCheck className="w-4 h-4" />} color="emerald" pros={['Real on-chain IP — license terms and royalty splits are enforceable', 'Pool model: every game you register joins your writer royalty pool', 'Platform pays gas so registration feels free']} cons={['Testnet only — production mainnet launch is environment-gated', 'One extra wallet signature for creators who register']} />
      </div>
    </section>
  )
}

function SectionFaq() {
  return (
    <section className="mb-12">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground mb-4">
        Common questions
      </h2>
      <div className="space-y-3">
        <Faq q="Do I need to hold every chain's token?" a="No. The app switches chains for you. You only need the token for the chain you choose to pay on — MUSD on Mezo, or the writer coin on Base. Story Protocol operations are gas-sponsored by the platform." />
        <Faq q="Can I pay with MUSD for a writer who has a coin?" a="Yes. When the URL matches a known writer, the form shows a 'Use MUSD instead' link. Your MUSD still splits to the writer per the contract terms." />
        <Faq q="What happens if I skip IP registration?" a="The game still mints as an NFT and you still earn from plays. You just don't get the royalty-pool benefits (licensing, derivatives, even distribution across your works)." />
        <Faq q="Why does Story Protocol run on testnet?" a="We're aligned with Story's Aeneid testnet for the current cycle. Mainnet configuration is environment-gated and will flip when Story's mainnet is ready for our integration." />
      </div>
    </section>
  )
}

function ChainOverview({ color, name, role, blurb }: { color: 'amber' | 'blue' | 'emerald'; name: string; role: string; blurb: string }) {
  const colors = {
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
    blue: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
  }[color]
  return (
    <div className={`rounded-2xl border p-4 ${colors}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-black uppercase tracking-widest">{name}</span>
        <Sparkles className="w-3.5 h-3.5 opacity-60" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">{role}</p>
      <p className="text-xs leading-relaxed opacity-90">{blurb}</p>
    </div>
  )
}

function Row({ action, chain, token }: { action: string; chain: string; token: string }) {
  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="py-3 px-4 font-medium text-foreground">{action}</td>
      <td className="py-3 px-4 text-foreground/80 font-mono text-xs">{chain}</td>
      <td className="py-3 px-4 text-muted-foreground">{token}</td>
    </tr>
  )
}

function Tradeoff({ name, icon, color, pros, cons }: { name: string; icon: React.ReactNode; color: 'amber' | 'blue' | 'emerald'; pros: string[]; cons: string[] }) {
  const dot = { amber: 'bg-amber-500', blue: 'bg-blue-500', emerald: 'bg-emerald-500' }[color]
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <span className="text-sm font-bold text-foreground">{name}</span>
        {icon}
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider mb-1">Pros</p>
          <ul className="space-y-1 text-muted-foreground">
            {pros.map((p) => <li key={p}>• {p}</li>)}
          </ul>
        </div>
        <div>
          <p className="text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider mb-1">Tradeoffs</p>
          <ul className="space-y-1 text-muted-foreground">
            {cons.map((c) => <li key={c}>• {c}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-xl border border-border bg-card p-4 group">
      <summary className="cursor-pointer text-sm font-semibold text-foreground list-none flex items-center justify-between">
        {q}
        <span className="text-muted-foreground text-xs group-open:rotate-90 transition-transform">▶</span>
      </summary>
      <p className="text-sm text-muted-foreground leading-relaxed mt-3">{a}</p>
    </details>
  )
}
