import { SwapCard } from '@/components/swap/swap-card';

export default function SwapPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-1">Swap</h1>
          <p className="text-sm text-muted-foreground">Best execution across Uniswap, SushiSwap, and Aerodrome</p>
        </div>
        <SwapCard />
      </div>
    </div>
  );
}
