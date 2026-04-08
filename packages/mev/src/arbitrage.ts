/**
 * Arbitrage Scanner
 * Finds profitable arbitrage opportunities across Katana DEXs
 */

import {
  createPublicClient,
  http,
  type Address,
  type PublicClient,
  formatUnits,
  parseUnits,
  zeroAddress,
} from 'viem';
import {
  CHAIN,
  TOKENS,
  SUSHI_V2_FACTORY,
  SUSHI_V2_ROUTER,
  V2_PAIR_ABI,
  V2_FACTORY_ABI,
  V2_ROUTER_ABI,
  V3_QUOTER_ABI,
  V3_FEE_TIERS,
  SUSHI_V3_QUOTER,
  MIN_PROFIT_WEI,
  type Token,
} from './config.js';

// ===========================================
// TYPES
// ===========================================

export interface PoolState {
  address: Address;
  type: 'v2' | 'v3';
  token0: Token;
  token1: Token;
  reserve0: bigint;
  reserve1: bigint;
  fee?: number; // V3 only
}

export interface ArbitrageOpportunity {
  id: string;
  type: 'v2-v3' | 'triangular' | 'multi-hop';
  path: string[];
  pools: PoolState[];
  inputToken: string;
  inputAmount: bigint;
  outputAmount: bigint;
  profit: bigint;
  profitPercent: number;
  gasEstimate: bigint;
  netProfit: bigint;
}

export interface PriceQuote {
  pool: PoolState;
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number;
}

// ===========================================
// CLIENT
// ===========================================

export function createClient(): PublicClient {
  return createPublicClient({
    chain: {
      id: CHAIN.id,
      name: CHAIN.name,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [CHAIN.rpc] } },
    },
    transport: http(CHAIN.rpc),
  });
}

// ===========================================
// POOL DISCOVERY
// ===========================================

/**
 * Get V2 pair address for two tokens
 */
export async function getV2Pair(
  client: PublicClient,
  tokenA: Address,
  tokenB: Address
): Promise<Address | null> {
  try {
    const pair = await client.readContract({
      address: SUSHI_V2_FACTORY,
      abi: V2_FACTORY_ABI,
      functionName: 'getPair',
      args: [tokenA, tokenB],
    });
    return pair === zeroAddress ? null : pair;
  } catch {
    return null;
  }
}

/**
 * Get all V2 pairs from factory
 */
export async function getAllV2Pairs(client: PublicClient): Promise<Address[]> {
  try {
    const length = await client.readContract({
      address: SUSHI_V2_FACTORY,
      abi: V2_FACTORY_ABI,
      functionName: 'allPairsLength',
    });

    const pairs: Address[] = [];
    for (let i = 0; i < Number(length); i++) {
      const pair = await client.readContract({
        address: SUSHI_V2_FACTORY,
        abi: V2_FACTORY_ABI,
        functionName: 'allPairs',
        args: [BigInt(i)],
      });
      pairs.push(pair);
    }
    return pairs;
  } catch (e) {
    console.error('Failed to get V2 pairs:', e);
    return [];
  }
}

// ===========================================
// RESERVE FETCHING
// ===========================================

/**
 * Get reserves for a V2 pair
 */
export async function getV2Reserves(
  client: PublicClient,
  pairAddress: Address
): Promise<{ reserve0: bigint; reserve1: bigint; token0: Address; token1: Address } | null> {
  try {
    const [reserves, token0, token1] = await Promise.all([
      client.readContract({
        address: pairAddress,
        abi: V2_PAIR_ABI,
        functionName: 'getReserves',
      }),
      client.readContract({
        address: pairAddress,
        abi: V2_PAIR_ABI,
        functionName: 'token0',
      }),
      client.readContract({
        address: pairAddress,
        abi: V2_PAIR_ABI,
        functionName: 'token1',
      }),
    ]);

    return {
      reserve0: reserves[0],
      reserve1: reserves[1],
      token0,
      token1,
    };
  } catch {
    return null;
  }
}

/**
 * Get pool state for multiple pairs
 */
export async function getPoolStates(
  client: PublicClient,
  pairAddresses: Address[]
): Promise<PoolState[]> {
  const states: PoolState[] = [];

  for (const address of pairAddresses) {
    const reserves = await getV2Reserves(client, address);
    if (!reserves) continue;

    // Find token info
    const token0 = Object.values(TOKENS).find(
      (t) => t.address.toLowerCase() === reserves.token0.toLowerCase()
    );
    const token1 = Object.values(TOKENS).find(
      (t) => t.address.toLowerCase() === reserves.token1.toLowerCase()
    );

    if (!token0 || !token1) continue;

    states.push({
      address,
      type: 'v2',
      token0,
      token1,
      reserve0: reserves.reserve0,
      reserve1: reserves.reserve1,
    });
  }

  return states;
}

// ===========================================
// PRICE CALCULATION
// ===========================================

/**
 * Calculate V2 output amount (constant product formula)
 * amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
 */
export function getV2AmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): bigint {
  if (amountIn <= BigInt(0) || reserveIn <= BigInt(0) || reserveOut <= BigInt(0)) {
    return BigInt(0);
  }

  const amountInWithFee = amountIn * BigInt(997);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * BigInt(1000) + amountInWithFee;

  return numerator / denominator;
}

/**
 * Calculate optimal input amount for maximum profit
 * Using binary search to find the sweet spot
 */
export function findOptimalInput(
  reserveA0: bigint,
  reserveA1: bigint,
  reserveB0: bigint,
  reserveB1: bigint,
  maxInput: bigint
): { optimalInput: bigint; expectedProfit: bigint } {
  let low = BigInt(0);
  let high = maxInput;
  let bestInput = BigInt(0);
  let bestProfit = BigInt(0);

  // Binary search for optimal input
  while (high - low > BigInt(1000)) {
    const mid = (low + high) / BigInt(2);

    // Buy on pool A, sell on pool B
    const outA = getV2AmountOut(mid, reserveA0, reserveA1);
    const outB = getV2AmountOut(outA, reserveB1, reserveB0);
    const profit = outB - mid;

    if (profit > bestProfit) {
      bestProfit = profit;
      bestInput = mid;
    }

    // Adjust search range
    const profitLeft = calculateProfit(low, reserveA0, reserveA1, reserveB0, reserveB1);
    const profitRight = calculateProfit(high, reserveA0, reserveA1, reserveB0, reserveB1);

    if (profitLeft > profitRight) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return { optimalInput: bestInput, expectedProfit: bestProfit };
}

function calculateProfit(
  input: bigint,
  rA0: bigint,
  rA1: bigint,
  rB0: bigint,
  rB1: bigint
): bigint {
  const outA = getV2AmountOut(input, rA0, rA1);
  const outB = getV2AmountOut(outA, rB1, rB0);
  return outB - input;
}

// ===========================================
// ARBITRAGE DETECTION
// ===========================================

/**
 * Find V2 vs V2 arbitrage (same pair, different pools/routes)
 */
export async function findV2Arbitrage(
  client: PublicClient,
  tokenA: Token,
  tokenB: Token
): Promise<ArbitrageOpportunity | null> {
  // Get pair for direct swap
  const pairAddress = await getV2Pair(client, tokenA.address, tokenB.address);
  if (!pairAddress) return null;

  const reserves = await getV2Reserves(client, pairAddress);
  if (!reserves) return null;

  // Check if there's a triangular opportunity via another token
  for (const [symbol, tokenC] of Object.entries(TOKENS)) {
    if (tokenC.address === tokenA.address || tokenC.address === tokenB.address) continue;

    const pairAC = await getV2Pair(client, tokenA.address, tokenC.address);
    const pairCB = await getV2Pair(client, tokenC.address, tokenB.address);

    if (!pairAC || !pairCB) continue;

    const reservesAC = await getV2Reserves(client, pairAC);
    const reservesCB = await getV2Reserves(client, pairCB);

    if (!reservesAC || !reservesCB) continue;

    // Calculate triangular arbitrage
    // A -> C -> B vs A -> B direct
    const testAmount = parseUnits('1', tokenA.decimals);

    // Direct route: A -> B
    const isToken0A = reserves.token0.toLowerCase() === tokenA.address.toLowerCase();
    const directOut = getV2AmountOut(
      testAmount,
      isToken0A ? reserves.reserve0 : reserves.reserve1,
      isToken0A ? reserves.reserve1 : reserves.reserve0
    );

    // Triangular: A -> C -> B
    const isToken0AC = reservesAC.token0.toLowerCase() === tokenA.address.toLowerCase();
    const outAC = getV2AmountOut(
      testAmount,
      isToken0AC ? reservesAC.reserve0 : reservesAC.reserve1,
      isToken0AC ? reservesAC.reserve1 : reservesAC.reserve0
    );

    const isToken0CB = reservesCB.token0.toLowerCase() === tokenC.address.toLowerCase();
    const outCB = getV2AmountOut(
      outAC,
      isToken0CB ? reservesCB.reserve0 : reservesCB.reserve1,
      isToken0CB ? reservesCB.reserve1 : reservesCB.reserve0
    );

    // Check for profit
    if (outCB > directOut) {
      const profit = outCB - directOut;
      const profitPercent = Number(profit) / Number(directOut) * 100;

      // Estimate gas (3 swaps = ~300k gas)
      const gasEstimate = BigInt(300000);
      const gasPrice = await client.getGasPrice();
      const gasCost = gasEstimate * gasPrice;

      // Convert profit to ETH terms for comparison
      // Simplified: assume profit token is worth ~1/2500 ETH if it's USDC
      const profitInWei = tokenB.decimals === 6
        ? (profit * BigInt(10) ** BigInt(18)) / (BigInt(2500) * BigInt(10) ** BigInt(6))
        : profit;

      const netProfit = profitInWei - gasCost;

      if (netProfit > MIN_PROFIT_WEI) {
        return {
          id: `tri-${tokenA.symbol}-${tokenC.symbol}-${tokenB.symbol}`,
          type: 'triangular',
          path: [tokenA.symbol, tokenC.symbol, tokenB.symbol],
          pools: [], // Would populate with actual pool states
          inputToken: tokenA.symbol,
          inputAmount: testAmount,
          outputAmount: outCB,
          profit,
          profitPercent,
          gasEstimate,
          netProfit,
        };
      }
    }
  }

  return null;
}

/**
 * Scan for all arbitrage opportunities
 */
export async function scanForArbitrage(
  client: PublicClient
): Promise<ArbitrageOpportunity[]> {
  const opportunities: ArbitrageOpportunity[] = [];

  // Check all token pairs
  const tokenList = Object.values(TOKENS);

  for (let i = 0; i < tokenList.length; i++) {
    for (let j = i + 1; j < tokenList.length; j++) {
      const opp = await findV2Arbitrage(client, tokenList[i], tokenList[j]);
      if (opp) {
        opportunities.push(opp);
      }
    }
  }

  // Sort by profit
  opportunities.sort((a, b) => Number(b.netProfit - a.netProfit));

  return opportunities;
}

// ===========================================
// FORMAT HELPERS
// ===========================================

export function formatOpportunity(opp: ArbitrageOpportunity): string {
  return [
    `🎯 Arbitrage Opportunity (${opp.type})`,
    `  Path: ${opp.path.join(' → ')}`,
    `  Input: ${formatUnits(opp.inputAmount, 18)} ${opp.inputToken}`,
    `  Profit: ${opp.profitPercent.toFixed(3)}%`,
    `  Net Profit: ${formatUnits(opp.netProfit, 18)} ETH`,
  ].join('\n');
}

export function formatPoolState(pool: PoolState): string {
  return [
    `Pool: ${pool.address.slice(0, 10)}...`,
    `  Type: ${pool.type}`,
    `  ${pool.token0.symbol}: ${formatUnits(pool.reserve0, pool.token0.decimals)}`,
    `  ${pool.token1.symbol}: ${formatUnits(pool.reserve1, pool.token1.decimals)}`,
  ].join('\n');
}
