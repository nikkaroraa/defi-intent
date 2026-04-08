/**
 * Backrunning Scanner
 * Monitors blocks for large trades and executes follow-up arbitrage
 */

import {
  createPublicClient,
  http,
  type Address,
  type PublicClient,
  type Log,
  formatUnits,
  parseAbiItem,
  decodeEventLog,
} from 'viem';
import {
  CHAIN,
  TOKENS,
  SUSHI_V2_ROUTER,
  V2_PAIR_ABI,
} from './config.js';
import { createClient, scanForArbitrage, type ArbitrageOpportunity } from './arbitrage.js';

// ===========================================
// TYPES
// ===========================================

export interface SwapEvent {
  blockNumber: bigint;
  txHash: `0x${string}`;
  pool: Address;
  sender: Address;
  amount0In: bigint;
  amount1In: bigint;
  amount0Out: bigint;
  amount1Out: bigint;
  token0?: string;
  token1?: string;
  volumeUsd?: number;
}

export interface BackrunOpportunity {
  triggerSwap: SwapEvent;
  arbitrage: ArbitrageOpportunity;
  urgency: 'high' | 'medium' | 'low';
  expiresAt: number; // Block number
}

// ===========================================
// EVENT SIGNATURES
// ===========================================

const SWAP_EVENT = parseAbiItem(
  'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)'
);

const SYNC_EVENT = parseAbiItem(
  'event Sync(uint112 reserve0, uint112 reserve1)'
);

// ===========================================
// SWAP MONITORING
// ===========================================

/**
 * Get recent swap events from a pool
 */
export async function getRecentSwaps(
  client: PublicClient,
  poolAddress: Address,
  fromBlock: bigint
): Promise<SwapEvent[]> {
  try {
    const logs = await client.getLogs({
      address: poolAddress,
      event: SWAP_EVENT,
      fromBlock,
      toBlock: 'latest',
    });

    return logs.map((log) => ({
      blockNumber: log.blockNumber,
      txHash: log.transactionHash,
      pool: poolAddress,
      sender: log.args.sender as Address,
      amount0In: log.args.amount0In as bigint,
      amount1In: log.args.amount1In as bigint,
      amount0Out: log.args.amount0Out as bigint,
      amount1Out: log.args.amount1Out as bigint,
    }));
  } catch (e) {
    console.error(`Failed to get swaps for ${poolAddress}:`, e);
    return [];
  }
}

/**
 * Calculate USD volume of a swap
 */
export function estimateSwapVolume(swap: SwapEvent): number {
  // Simplified: assume token amounts are in standard decimals
  // In production, would need proper token decimals and prices

  const amount0 = Number(swap.amount0In || swap.amount0Out);
  const amount1 = Number(swap.amount1In || swap.amount1Out);

  // Rough estimate: larger of the two amounts / 10^18 * $2500 (ETH price)
  const maxAmount = Math.max(amount0, amount1);
  return (maxAmount / 1e18) * 2500;
}

/**
 * Filter for large swaps worth backrunning
 */
export function filterLargeSwaps(
  swaps: SwapEvent[],
  minVolumeUsd: number = 10000
): SwapEvent[] {
  return swaps
    .map((swap) => ({
      ...swap,
      volumeUsd: estimateSwapVolume(swap),
    }))
    .filter((swap) => swap.volumeUsd >= minVolumeUsd)
    .sort((a, b) => (b.volumeUsd || 0) - (a.volumeUsd || 0));
}

// ===========================================
// BACKRUN DETECTION
// ===========================================

/**
 * Analyze a large swap for backrun opportunities
 */
export async function analyzeBackrunOpportunity(
  client: PublicClient,
  swap: SwapEvent
): Promise<BackrunOpportunity | null> {
  // After a large swap, check if arbitrage exists
  const opportunities = await scanForArbitrage(client);

  if (opportunities.length === 0) return null;

  const best = opportunities[0];

  // Determine urgency based on profit potential
  const profitEth = Number(best.netProfit) / 1e18;
  const urgency: 'high' | 'medium' | 'low' =
    profitEth > 0.1 ? 'high' : profitEth > 0.01 ? 'medium' : 'low';

  // Opportunity expires in ~5 blocks (10 seconds)
  const currentBlock = await client.getBlockNumber();
  const expiresAt = Number(currentBlock) + 5;

  return {
    triggerSwap: swap,
    arbitrage: best,
    urgency,
    expiresAt,
  };
}

// ===========================================
// BLOCK MONITORING
// ===========================================

/**
 * Monitor new blocks for backrun opportunities
 */
export async function monitorBlocks(
  client: PublicClient,
  pools: Address[],
  onOpportunity: (opp: BackrunOpportunity) => void,
  minVolumeUsd: number = 10000
): Promise<() => void> {
  let lastBlock = await client.getBlockNumber();

  const checkBlock = async () => {
    const currentBlock = await client.getBlockNumber();
    if (currentBlock <= lastBlock) return;

    console.log(`[Block ${currentBlock}] Checking for swaps...`);

    // Get swaps from all monitored pools
    const allSwaps: SwapEvent[] = [];
    for (const pool of pools) {
      const swaps = await getRecentSwaps(client, pool, lastBlock + BigInt(1));
      allSwaps.push(...swaps);
    }

    // Filter for large swaps
    const largeSwaps = filterLargeSwaps(allSwaps, minVolumeUsd);

    console.log(`  Found ${allSwaps.length} swaps, ${largeSwaps.length} large`);

    // Analyze each large swap
    for (const swap of largeSwaps) {
      const opp = await analyzeBackrunOpportunity(client, swap);
      if (opp) {
        onOpportunity(opp);
      }
    }

    lastBlock = currentBlock;
  };

  // Poll every block time
  const interval = setInterval(checkBlock, CHAIN.blockTime);

  // Return cleanup function
  return () => clearInterval(interval);
}

// ===========================================
// FORMAT HELPERS
// ===========================================

export function formatSwapEvent(swap: SwapEvent): string {
  return [
    `📊 Swap Detected`,
    `  TX: ${swap.txHash.slice(0, 10)}...`,
    `  Pool: ${swap.pool.slice(0, 10)}...`,
    `  Volume: ~$${(swap.volumeUsd || 0).toLocaleString()}`,
  ].join('\n');
}

export function formatBackrunOpportunity(opp: BackrunOpportunity): string {
  return [
    `🏃 Backrun Opportunity [${opp.urgency.toUpperCase()}]`,
    `  Trigger: ${opp.triggerSwap.txHash.slice(0, 10)}...`,
    `  Volume: ~$${(opp.triggerSwap.volumeUsd || 0).toLocaleString()}`,
    `  Arbitrage: ${opp.arbitrage.path.join(' → ')}`,
    `  Est. Profit: ${formatUnits(opp.arbitrage.netProfit, 18)} ETH`,
    `  Expires: Block ${opp.expiresAt}`,
  ].join('\n');
}
