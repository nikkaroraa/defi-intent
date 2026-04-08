# @defi-intent/yield

Unified yield aggregator for L2. Fetches yields from all protocols and routes deposits to best opportunities.

## Features

- **Multi-protocol aggregation**: Morpho, Yearn, Spectra, Sushi LP
- **Best yield routing**: Automatically find and route to highest APY
- **Split deposits**: Diversify across multiple protocols
- **CLI interface**: Quick yield lookup and deposit building

## Installation

```bash
npm install @defi-intent/yield
```

## CLI Usage

```bash
# List all yield opportunities
npx tsx src/cli.ts list

# Filter by protocol
npx tsx src/cli.ts list --protocol morpho

# Filter by minimum APY
npx tsx src/cli.ts list --min-apy 5

# Get best yield for an asset
npx tsx src/cli.ts best USDC

# Get top N yields for an asset
npx tsx src/cli.ts top WETH 5

# Build deposit route to best yield
npx tsx src/cli.ts deposit USDC 1000

# Build split deposit across top yields
npx tsx src/cli.ts split USDC 1000 3
```

## Programmatic Usage

```typescript
import {
  fetchAllYields,
  getBestYield,
  buildBestYieldRoute,
  buildSplitYieldRoute,
} from '@defi-intent/yield';

// Fetch all yields
const yields = await fetchAllYields();
const morphoOnly = await fetchAllYields({ protocols: ['morpho'] });
const highApy = await fetchAllYields({ minApy: 0.05 }); // 5%+

// Get best yield for USDC
const best = await getBestYield('USDC');
console.log(`Best: ${best.name} @ ${best.apy * 100}% APY`);

// Build deposit route
const route = await buildBestYieldRoute('USDC', '1000', wallet);
// route.calls contains encoded transactions

// Split across multiple protocols
const splitRoute = await buildSplitYieldRoute('USDC', '1000', wallet, 3);
console.log(`Weighted APY: ${splitRoute.weightedApy * 100}%`);
```

## Supported Protocols

| Protocol | Type | Status |
|----------|------|--------|
| Morpho | Lending | ✅ Live |
| Yearn | Vaults | 🔜 Coming |
| Spectra | PT/YT | 🔜 Coming |
| Sushi LP | Liquidity | ✅ Live (quotes only) |

## API Reference

### Aggregator

- `fetchAllYields(options?)` - Fetch all yield opportunities
- `getBestYield(asset)` - Get best yield for an asset
- `getTopYields(asset, n)` - Get top N yields for an asset
- `getYieldsByProtocol()` - Get yields grouped by protocol

### Router

- `buildBestYieldRoute(asset, amount, recipient)` - Build deposit to best yield
- `buildSplitYieldRoute(asset, amount, recipient, splits)` - Build split deposit

### Types

```typescript
interface YieldOpportunity {
  id: string;
  protocol: 'morpho' | 'yearn' | 'spectra' | 'sushi-lp';
  name: string;
  asset: string;
  assetAddress: Address;
  apy: number; // 0.05 = 5%
  tvl: bigint;
  contractAddress: Address;
  risk: 'low' | 'medium' | 'high';
  description?: string;
}
```

## Integration with Bundler

Use with `@defi-intent/bundler` for batch deposits:

```typescript
import { batch } from '@defi-intent/bundler';
import { buildBestYieldRoute } from '@defi-intent/yield';

const route = await buildBestYieldRoute('USDC', '1000', wallet);

const tx = batch()
  .addCalls(route.calls)
  .build();

await walletClient.sendTransaction(tx);
```

## License

MIT
