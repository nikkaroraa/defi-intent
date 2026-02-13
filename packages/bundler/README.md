# @katana-intent/bundler

Multicall batch transaction builder for Katana L2.

## Installation

```bash
npm install @katana-intent/bundler
```

## Quick Start

```typescript
import { batch } from '@katana-intent/bundler';

const wallet = '0x...';

const tx = batch()
  .wrapETH('1')
  .swap({
    tokenIn: 'WETH',
    tokenOut: 'USDC',
    amountIn: '0.5',
    recipient: wallet
  })
  .supplyMorpho({
    asset: 'USDC',
    amount: '100',
    onBehalf: wallet
  })
  .build();

// Execute with wagmi or viem
await walletClient.sendTransaction(tx);
```

## API

### `batch()`

Creates a new `BatchBuilder` instance.

### BatchBuilder Methods

| Method | Description |
|--------|-------------|
| `.approve({ token, spender, amount? })` | Approve token spending |
| `.transfer(token, to, amount)` | Transfer tokens |
| `.swap({ tokenIn, tokenOut, amountIn, recipient, ... })` | Swap via Sushi V2 |
| `.wrapETH(amount)` | Wrap ETH → WETH |
| `.unwrapETH(amount)` | Unwrap WETH → ETH |
| `.supplyMorpho({ asset, amount, onBehalf })` | Supply to Morpho |
| `.build()` | Build the multicall transaction |
| `.simulate(from)` | Dry-run the batch |

### Build Output

```typescript
const { to, data, value, calls } = batch().wrapETH('1').build();

// to: Multicall3 address
// data: Encoded multicall calldata
// value: Total ETH needed
// calls: Array of individual calls (for debugging)
```

## Verified Deployments

| Contract | Address |
|----------|---------|
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |
| Sushi V2 Router | `0x69cc349932ae18ed406eeb917d79b9b3033fb68e` |
| Morpho | `0xd50f2dfffd62f94ee4aed9ca05c61d0753268abc` |

## License

MIT
