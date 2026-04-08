import { SwapCard } from '@/components/swap/swap-card';

export default function SwapPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Swap on Katana</h1>
          <p className="text-muted-foreground">Best rates via Sushi V2/V3</p>
        </div>
        <SwapCard />
      </div>
    </div>
  );
}
