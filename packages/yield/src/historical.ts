/**
 * Historical Yield Data
 * Fetches APY history from DeFiLlama and protocol APIs
 */

import { type YieldOpportunity, type Protocol } from './config.js';

// ===========================================
// TYPES
// ===========================================

export interface HistoricalAPY {
  current: number;
  avg7d: number;
  avg30d: number;
  avg50d: number;
  trend: 'up' | 'down' | 'stable';
  volatility: 'low' | 'medium' | 'high';
}

export interface YieldWithHistory extends YieldOpportunity {
  historical: HistoricalAPY;
}

export interface RebalanceSuggestion {
  from: YieldWithHistory;
  to: YieldWithHistory;
  improvement: number; // Percentage improvement in 30d avg
  reason: string;
}

// ===========================================
// DEFILLAMA API
// ===========================================

const DEFILLAMA_YIELDS_URL = 'https://yields.llama.fi';

interface DefiLlamaPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number;
  apyReward: number;
  apy: number;
  apyMean30d: number;
  ilRisk: string;
  exposure: string;
}

interface DefiLlamaPoolHistory {
  timestamp: string;
  tvlUsd: number;
  apy: number;
  apyBase: number;
  apyReward: number;
}

/**
 * Fetch all pools from DeFiLlama
 */
async function fetchDefiLlamaPools(): Promise<DefiLlamaPool[]> {
  try {
    const res = await fetch(`${DEFILLAMA_YIELDS_URL}/pools`);
    if (!res.ok) throw new Error('Failed to fetch pools');
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error('DeFiLlama pools fetch error:', e);
    return [];
  }
}

/**
 * Fetch pool history from DeFiLlama
 */
async function fetchPoolHistory(poolId: string): Promise<DefiLlamaPoolHistory[]> {
  try {
    const res = await fetch(`${DEFILLAMA_YIELDS_URL}/chart/${poolId}`);
    if (!res.ok) throw new Error('Failed to fetch pool history');
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error('DeFiLlama history fetch error:', e);
    return [];
  }
}

// ===========================================
// HISTORICAL APY CALCULATION
// ===========================================

/**
 * Calculate historical APY averages from data points
 */
function calculateHistoricalAPY(
  history: DefiLlamaPoolHistory[],
  currentApy: number
): HistoricalAPY {
  if (history.length === 0) {
    return {
      current: currentApy,
      avg7d: currentApy,
      avg30d: currentApy,
      avg50d: currentApy,
      trend: 'stable',
      volatility: 'low',
    };
  }

  // Sort by timestamp descending (most recent first)
  const sorted = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Calculate averages
  const avg7d = calculateAverage(sorted.slice(0, 7).map((d) => d.apy));
  const avg30d = calculateAverage(sorted.slice(0, 30).map((d) => d.apy));
  const avg50d = calculateAverage(sorted.slice(0, 50).map((d) => d.apy));

  // Calculate trend (comparing 7d avg to 30d avg)
  let trend: 'up' | 'down' | 'stable';
  const trendDiff = avg7d - avg30d;
  if (trendDiff > 0.5) trend = 'up';
  else if (trendDiff < -0.5) trend = 'down';
  else trend = 'stable';

  // Calculate volatility (standard deviation of 30d)
  const stdDev = calculateStdDev(sorted.slice(0, 30).map((d) => d.apy));
  let volatility: 'low' | 'medium' | 'high';
  if (stdDev < 1) volatility = 'low';
  else if (stdDev < 3) volatility = 'medium';
  else volatility = 'high';

  return {
    current: currentApy,
    avg7d,
    avg30d,
    avg50d,
    trend,
    volatility,
  };
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = calculateAverage(values);
  const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(calculateAverage(squareDiffs));
}

// ===========================================
// CHAIN MAPPING
// ===========================================

const CHAIN_MAP: Record<string, string> = {
  ethereum: 'Ethereum',
  base: 'Base',
  katana: 'Katana',
};

const PROTOCOL_MAP: Record<string, Protocol> = {
  morpho: 'morpho',
  'morpho-blue': 'morpho',
  yearn: 'yearn',
  'yearn-finance': 'yearn',
  spectra: 'spectra',
  sushiswap: 'sushi-lp',
};

// ===========================================
// FETCH YIELDS WITH HISTORY
// ===========================================

/**
 * Fetch yield opportunities with historical APY data
 */
export async function fetchYieldsWithHistory(
  chainFilter?: string,
  protocolFilter?: Protocol
): Promise<YieldWithHistory[]> {
  const pools = await fetchDefiLlamaPools();

  // Filter pools
  let filtered = pools.filter((p) => p.apy > 0 && p.tvlUsd > 100000);

  if (chainFilter) {
    filtered = filtered.filter(
      (p) => p.chain.toLowerCase() === chainFilter.toLowerCase()
    );
  }

  if (protocolFilter) {
    filtered = filtered.filter((p) => {
      const mapped = PROTOCOL_MAP[p.project.toLowerCase()];
      return mapped === protocolFilter;
    });
  }

  // Limit to top 20 by TVL
  filtered = filtered.sort((a, b) => b.tvlUsd - a.tvlUsd).slice(0, 20);

  // Fetch history for each pool
  const results: YieldWithHistory[] = [];

  for (const pool of filtered) {
    const history = await fetchPoolHistory(pool.pool);
    const historical = calculateHistoricalAPY(history, pool.apy);

    const protocol = PROTOCOL_MAP[pool.project.toLowerCase()] || 'morpho';

    results.push({
      id: pool.pool,
      protocol,
      name: `${pool.project} ${pool.symbol}`,
      asset: pool.symbol.split('-')[0] || pool.symbol,
      assetAddress: '0x0000000000000000000000000000000000000000' as any, // Placeholder
      apy: pool.apy / 100, // Convert to decimal
      tvl: BigInt(Math.floor(pool.tvlUsd)),
      contractAddress: '0x0000000000000000000000000000000000000000' as any,
      risk: pool.ilRisk === 'yes' ? 'high' : historical.volatility === 'high' ? 'medium' : 'low',
      description: `${pool.chain} - ${pool.exposure || 'single'}`,
      historical: {
        ...historical,
        current: historical.current / 100,
        avg7d: historical.avg7d / 100,
        avg30d: historical.avg30d / 100,
        avg50d: historical.avg50d / 100,
      },
    });
  }

  return results;
}

// ===========================================
// SIMULATED DATA (for protocols not on DeFiLlama)
// ===========================================

/**
 * Generate simulated historical data for protocols not covered by DeFiLlama
 * Used for Katana-specific protocols
 */
export function generateSimulatedHistory(
  currentApy: number,
  volatilityFactor: number = 0.1
): HistoricalAPY {
  // Simulate historical APY with some variance
  const variance = currentApy * volatilityFactor;
  const avg7d = currentApy + (Math.random() - 0.5) * variance * 0.5;
  const avg30d = currentApy + (Math.random() - 0.5) * variance;
  const avg50d = currentApy + (Math.random() - 0.5) * variance * 1.2;

  const trendDiff = avg7d - avg30d;
  const trend: 'up' | 'down' | 'stable' =
    trendDiff > 0.005 ? 'up' : trendDiff < -0.005 ? 'down' : 'stable';

  const volatility: 'low' | 'medium' | 'high' =
    volatilityFactor < 0.1 ? 'low' : volatilityFactor < 0.2 ? 'medium' : 'high';

  return {
    current: currentApy,
    avg7d: Math.max(0, avg7d),
    avg30d: Math.max(0, avg30d),
    avg50d: Math.max(0, avg50d),
    trend,
    volatility,
  };
}

// ===========================================
// REBALANCE SUGGESTIONS
// ===========================================

/**
 * Generate rebalance suggestions based on historical yields
 */
export function generateRebalanceSuggestions(
  positions: YieldWithHistory[],
  opportunities: YieldWithHistory[],
  minImprovement: number = 0.01 // 1% minimum improvement
): RebalanceSuggestion[] {
  const suggestions: RebalanceSuggestion[] = [];

  for (const position of positions) {
    // Find better opportunities for the same asset
    const betterOptions = opportunities.filter((opp) => {
      // Same asset, different protocol/vault
      if (opp.asset.toUpperCase() !== position.asset.toUpperCase()) return false;
      if (opp.id === position.id) return false;

      // Compare 30d averages (more stable than current)
      const improvement = opp.historical.avg30d - position.historical.avg30d;
      return improvement >= minImprovement;
    });

    // Sort by 30d avg improvement
    betterOptions.sort(
      (a, b) => b.historical.avg30d - a.historical.avg30d
    );

    if (betterOptions.length > 0) {
      const best = betterOptions[0];
      const improvement = best.historical.avg30d - position.historical.avg30d;

      let reason = `${(improvement * 100).toFixed(2)}% higher 30d average APY`;
      if (best.historical.trend === 'up') {
        reason += ', trending upward';
      }
      if (best.historical.volatility === 'low' && position.historical.volatility !== 'low') {
        reason += ', lower volatility';
      }

      suggestions.push({
        from: position,
        to: best,
        improvement,
        reason,
      });
    }
  }

  // Sort by improvement
  suggestions.sort((a, b) => b.improvement - a.improvement);

  return suggestions;
}

// ===========================================
// FORMAT HELPERS
// ===========================================

export function formatHistoricalAPY(h: HistoricalAPY): string {
  const trendIcon = h.trend === 'up' ? '📈' : h.trend === 'down' ? '📉' : '➡️';
  return `Current: ${(h.current * 100).toFixed(2)}% | 7d: ${(h.avg7d * 100).toFixed(2)}% | 30d: ${(h.avg30d * 100).toFixed(2)}% | 50d: ${(h.avg50d * 100).toFixed(2)}% ${trendIcon}`;
}

export function formatRebalanceSuggestion(s: RebalanceSuggestion): string {
  return `${s.from.name} → ${s.to.name}: +${(s.improvement * 100).toFixed(2)}% (${s.reason})`;
}
