/**
 * Yield Rebalancer
 * Compare yields across chains and suggest optimal rebalancing
 */

import { type Address, formatUnits } from 'viem';
import { type YieldOpportunity, type Protocol, TOKENS } from './config.js';
import { fetchAllYields, getBestYield } from './aggregator.js';
import {
  type YieldWithHistory,
  type RebalanceSuggestion,
  type HistoricalAPY,
  fetchYieldsWithHistory,
  generateSimulatedHistory,
  generateRebalanceSuggestions,
  formatHistoricalAPY,
} from './historical.js';

// ===========================================
// TYPES
// ===========================================

export interface ChainYields {
  chainId: number;
  chainName: string;
  yields: YieldWithHistory[];
}

export interface MultiChainComparison {
  asset: string;
  chains: Array<{
    chainId: number;
    chainName: string;
    best: YieldWithHistory | null;
  }>;
  recommendation: string;
}

export interface Portfolio {
  positions: PortfolioPosition[];
  totalValue: bigint;
}

export interface PortfolioPosition {
  chainId: number;
  protocol: Protocol;
  asset: string;
  amount: bigint;
  currentApy: number;
  vault: YieldWithHistory;
}

// ===========================================
// MULTI-CHAIN YIELD FETCHING
// ===========================================

/**
 * Fetch yields from all supported chains
 */
export async function fetchMultiChainYields(): Promise<ChainYields[]> {
  const chains = [
    { id: 1, name: 'Ethereum' },
    { id: 8453, name: 'Base' },
    { id: 747474, name: 'DeFi Intent' },
  ];

  const results: ChainYields[] = [];

  for (const chain of chains) {
    try {
      // For DeFi Intent, use local yields since not on DeFiLlama
      if (chain.id === 747474) {
        const localYields = await fetchAllYields();
        const withHistory: YieldWithHistory[] = localYields.map((y) => ({
          ...y,
          historical: generateSimulatedHistory(y.apy, 0.1),
        }));
        results.push({
          chainId: chain.id,
          chainName: chain.name,
          yields: withHistory,
        });
      } else {
        // Use DeFiLlama for other chains
        const yields = await fetchYieldsWithHistory(chain.name.toLowerCase());
        results.push({
          chainId: chain.id,
          chainName: chain.name,
          yields,
        });
      }
    } catch (e) {
      console.error(`Failed to fetch yields for ${chain.name}:`, e);
      results.push({
        chainId: chain.id,
        chainName: chain.name,
        yields: [],
      });
    }
  }

  return results;
}

/**
 * Compare yields for a specific asset across chains
 */
export async function compareAssetYields(
  asset: string
): Promise<MultiChainComparison> {
  const allChains = await fetchMultiChainYields();

  const comparison: MultiChainComparison = {
    asset,
    chains: [],
    recommendation: '',
  };

  let bestOverall: { chain: string; yield: YieldWithHistory } | null = null;

  for (const chain of allChains) {
    // Find best yield for this asset on this chain
    const assetYields = chain.yields.filter(
      (y) =>
        y.asset.toUpperCase() === asset.toUpperCase() ||
        y.asset.toUpperCase().includes(asset.toUpperCase())
    );

    const best = assetYields.length > 0
      ? assetYields.reduce((a, b) =>
          b.historical.avg30d > a.historical.avg30d ? b : a
        )
      : null;

    comparison.chains.push({
      chainId: chain.chainId,
      chainName: chain.chainName,
      best,
    });

    if (best && (!bestOverall || best.historical.avg30d > bestOverall.yield.historical.avg30d)) {
      bestOverall = { chain: chain.chainName, yield: best };
    }
  }

  if (bestOverall) {
    const apy = (bestOverall.yield.historical.avg30d * 100).toFixed(2);
    comparison.recommendation = `Best ${asset} yield: ${bestOverall.chain} - ${bestOverall.yield.name} @ ${apy}% (30d avg)`;
  } else {
    comparison.recommendation = `No yields found for ${asset}`;
  }

  return comparison;
}

// ===========================================
// PORTFOLIO ANALYSIS
// ===========================================

/**
 * Analyze a portfolio and suggest rebalancing
 */
export async function analyzePortfolio(
  positions: PortfolioPosition[]
): Promise<RebalanceSuggestion[]> {
  // Get all available yields across chains
  const allChains = await fetchMultiChainYields();
  const allOpportunities = allChains.flatMap((c) => c.yields);

  // Convert positions to YieldWithHistory format
  const positionsWithHistory: YieldWithHistory[] = positions.map((p) => p.vault);

  // Generate suggestions
  return generateRebalanceSuggestions(positionsWithHistory, allOpportunities, 0.005);
}

// ===========================================
// YIELD RANKING
// ===========================================

export interface RankedYield {
  yield: YieldWithHistory;
  chain: string;
  score: number; // Composite score based on APY, volatility, trend
  rank: number;
}

/**
 * Rank yields across all chains by composite score
 */
export async function rankYieldsGlobally(
  asset?: string
): Promise<RankedYield[]> {
  const allChains = await fetchMultiChainYields();
  const ranked: RankedYield[] = [];

  for (const chain of allChains) {
    let yields = chain.yields;

    if (asset) {
      yields = yields.filter(
        (y) =>
          y.asset.toUpperCase() === asset.toUpperCase() ||
          y.asset.toUpperCase().includes(asset.toUpperCase())
      );
    }

    for (const y of yields) {
      // Calculate composite score
      // Weighted: 50% 30d avg, 30% current, 20% stability
      let score = y.historical.avg30d * 0.5 + y.historical.current * 0.3;

      // Bonus for low volatility
      if (y.historical.volatility === 'low') score *= 1.1;
      else if (y.historical.volatility === 'high') score *= 0.9;

      // Bonus for upward trend
      if (y.historical.trend === 'up') score *= 1.05;
      else if (y.historical.trend === 'down') score *= 0.95;

      ranked.push({
        yield: y,
        chain: chain.chainName,
        score,
        rank: 0,
      });
    }
  }

  // Sort by score and assign ranks
  ranked.sort((a, b) => b.score - a.score);
  ranked.forEach((r, i) => (r.rank = i + 1));

  return ranked;
}

// ===========================================
// FORMAT HELPERS
// ===========================================

export function formatChainYields(chainYields: ChainYields): string {
  const lines = [`\n${chainYields.chainName} (${chainYields.yields.length} opportunities)`];

  for (const y of chainYields.yields.slice(0, 5)) {
    lines.push(
      `  ${y.name.padEnd(30)} | ${y.asset.padEnd(8)} | ${formatHistoricalAPY(y.historical)}`
    );
  }

  return lines.join('\n');
}

export function formatMultiChainComparison(comp: MultiChainComparison): string {
  const lines = [`\n${comp.asset} Yields Across Chains:`];

  for (const chain of comp.chains) {
    if (chain.best) {
      const apy = (chain.best.historical.avg30d * 100).toFixed(2);
      lines.push(
        `  ${chain.chainName.padEnd(12)} | ${chain.best.name.padEnd(25)} | ${apy}% (30d avg)`
      );
    } else {
      lines.push(`  ${chain.chainName.padEnd(12)} | No yields found`);
    }
  }

  lines.push(`\n${comp.recommendation}`);
  return lines.join('\n');
}

export function formatRankedYields(ranked: RankedYield[]): string {
  const lines = ['\nGlobal Yield Rankings:'];
  lines.push('Rank | Chain      | Protocol   | Asset    | 30d Avg | Current | Trend');
  lines.push('-'.repeat(80));

  for (const r of ranked.slice(0, 15)) {
    const avg30d = (r.yield.historical.avg30d * 100).toFixed(2);
    const current = (r.yield.historical.current * 100).toFixed(2);
    const trend = r.yield.historical.trend === 'up' ? '📈' : r.yield.historical.trend === 'down' ? '📉' : '➡️';

    lines.push(
      `#${r.rank.toString().padStart(2)} | ${r.chain.padEnd(10)} | ${r.yield.protocol.padEnd(10)} | ${r.yield.asset.padEnd(8)} | ${avg30d.padStart(6)}% | ${current.padStart(6)}% | ${trend}`
    );
  }

  return lines.join('\n');
}
