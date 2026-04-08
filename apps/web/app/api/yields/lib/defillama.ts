/**
 * DeFi Llama Yields API fetcher
 * https://yields.llama.fi/pools — free, no key required
 */

interface DefiLlamaPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  apyBase7d: number | null;
  apyMean30d: number | null;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  poolMeta: string | null;
}

export interface NormalizedYield {
  id: string;
  protocol: string;
  name: string;
  asset: string;
  apy: number;
  tvl: string;
  risk: 'low' | 'medium' | 'high';
  description: string;
  chainId: number;
  chainName: string;
  historical: {
    current: number;
    avg7d: number;
    avg30d: number;
    avg50d: number;
    trend: 'up' | 'down' | 'stable';
    volatility: 'low' | 'medium' | 'high';
  };
  isFixed?: boolean;
  isYieldToken?: boolean;
  maturity?: string;
  ptPrice?: number;
  ytPrice?: number;
}

const CHAIN_MAP: Record<string, { id: number; name: string }> = {
  Ethereum: { id: 1, name: 'Ethereum' },
  Base: { id: 8453, name: 'Base' },
  Arbitrum: { id: 42161, name: 'Arbitrum' },
};

// Projects we care about
const TARGET_PROJECTS = [
  'morpho-blue',
  'yearn-finance',
  'aave-v3',
  'compound-v3',
  'aerodrome',
  'moonwell',
  'sushiswap',
  'lido',
  'rocket-pool',
  'spark',
  'maker',
  'curve-dex',
  'convex-finance',
  'pendle',
];

const TARGET_CHAINS = ['Ethereum', 'Base'];

function assessRisk(pool: DefiLlamaPool): 'low' | 'medium' | 'high' {
  if (pool.stablecoin && pool.ilRisk === 'no') return 'low';
  if (pool.ilRisk === 'yes') return 'high';
  if (pool.exposure === 'multi') return 'medium';
  return 'medium';
}

function assessVolatility(current: number, avg7d: number, avg30d: number): 'low' | 'medium' | 'high' {
  if (avg7d === 0 || avg30d === 0) return 'medium';
  const shortTermDelta = Math.abs(current - avg7d) / avg7d;
  const longTermDelta = Math.abs(current - avg30d) / avg30d;
  if (shortTermDelta > 0.3 || longTermDelta > 0.5) return 'high';
  if (shortTermDelta > 0.1 || longTermDelta > 0.2) return 'medium';
  return 'low';
}

function assessTrend(current: number, avg7d: number, avg30d: number): 'up' | 'down' | 'stable' {
  if (avg30d === 0) return 'stable';
  const change = (current - avg30d) / avg30d;
  if (change > 0.05) return 'up';
  if (change < -0.05) return 'down';
  return 'stable';
}

function formatProjectName(project: string): string {
  const names: Record<string, string> = {
    'morpho-blue': 'Morpho',
    'yearn-finance': 'Yearn',
    'aave-v3': 'Aave V3',
    'compound-v3': 'Compound V3',
    'aerodrome': 'Aerodrome',
    'moonwell': 'Moonwell',
    'sushiswap': 'Sushi',
    'lido': 'Lido',
    'rocket-pool': 'Rocket Pool',
    'spark': 'Spark',
    'maker': 'Maker',
    'curve-dex': 'Curve',
    'convex-finance': 'Convex',
    'pendle': 'Pendle',
  };
  return names[project] || project;
}

function normalizeSymbol(symbol: string): string {
  // DeFi Llama symbols look like "USDC-WETH" or "USDC" or "stETH"
  return symbol.split('-')[0].toUpperCase();
}

export async function fetchDefiLlamaYields(): Promise<NormalizedYield[]> {
  const res = await fetch('https://yields.llama.fi/pools', {
    cache: 'no-store', // Response is 15MB+, skip Next.js cache — we use our own TTL cache
  });

  if (!res.ok) {
    console.error('DeFi Llama API failed:', res.status);
    return [];
  }

  const data = await res.json();
  const pools: DefiLlamaPool[] = data.data;

  return pools
    .filter((pool) => {
      if (!TARGET_CHAINS.includes(pool.chain)) return false;
      if (!TARGET_PROJECTS.includes(pool.project)) return false;
      if (!pool.apy || pool.apy <= 0 || pool.apy > 100) return false; // Filter out >100% APY outliers
      if (!pool.tvlUsd || pool.tvlUsd < 100_000) return false; // Min $100k TVL
      return true;
    })
    .map((pool) => {
      const chain = CHAIN_MAP[pool.chain];
      const currentApy = (pool.apy || 0) / 100; // DeFi Llama returns percentage, we store decimal
      const avg7d = (pool.apyBase7d || pool.apy || 0) / 100;
      const avg30d = (pool.apyMean30d || pool.apy || 0) / 100;

      return {
        id: pool.pool,
        protocol: formatProjectName(pool.project),
        name: `${formatProjectName(pool.project)} ${pool.symbol}`,
        asset: pool.symbol,
        apy: currentApy,
        tvl: Math.round(pool.tvlUsd).toString(),
        risk: assessRisk(pool),
        description: `${formatProjectName(pool.project)} on ${chain?.name || pool.chain}${pool.poolMeta ? ` (${pool.poolMeta})` : ''}`,
        chainId: chain?.id || 1,
        chainName: chain?.name || pool.chain,
        historical: {
          current: currentApy,
          avg7d,
          avg30d,
          avg50d: avg30d, // DeFi Llama doesn't provide 50d, use 30d as approximation
          trend: assessTrend(currentApy, avg7d, avg30d),
          volatility: assessVolatility(currentApy, avg7d, avg30d),
        },
      };
    })
    .sort((a, b) => b.apy - a.apy)
    .slice(0, 50); // Top 50 opportunities
}
