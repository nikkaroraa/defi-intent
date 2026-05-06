import Link from 'next/link';
import { Sword, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Sword className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[15px]">DeFi Intent</span>
          </div>
          <Link
            href="/app"
            className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5"
          >
            Launch App <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1] mb-6">
            DeFi in
            <br />
            plain English.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mb-10">
            Describe what you want. DeFi Intent figures out the best route, finds the
            highest yields, and executes on Ethereum.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Launch App <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="border-t border-border/60" />
      </div>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-medium">01</p>
              <h3 className="text-lg font-medium mb-2">Natural language</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Say &ldquo;swap 1 ETH to USDC&rdquo; or &ldquo;find the best yield for my stables.&rdquo;
                The intent engine parses, routes, and executes.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-medium">02</p>
              <h3 className="text-lg font-medium mb-2">Sustained yields</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Live APY data from Morpho and Yearn. Sorted by 30-day sustained
                yield so you see what actually holds up.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-medium">03</p>
              <h3 className="text-lg font-medium mb-2">Best execution</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Quotes from Uniswap and SushiSwap in parallel. Picks the best
                rate. You confirm and sign.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="border-t border-border/60" />
      </div>

      {/* Protocols */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6 font-medium">Integrated protocols</p>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            {['Uniswap', 'SushiSwap', 'Morpho', 'Yearn'].map((name) => (
              <span key={name} className="hover:text-foreground transition-colors">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="border-t border-border/60" />
      </div>

      {/* Bottom CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold tracking-tight mb-4">
            Ready to try it?
          </h2>
          <p className="text-muted-foreground mb-8">
            Connect your wallet and start talking to DeFi.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Launch App <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <span>DeFi Intent</span>
          <span>Ethereum mainnet</span>
        </div>
      </footer>
    </div>
  );
}
