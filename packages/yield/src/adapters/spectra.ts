/**
 * Spectra Finance Adapter
 * Fixed-rate yields via PT/YT tokenization
 *
 * Spectra splits yield-bearing assets (ERC-4626 IBTs) into:
 * - Principal Token (PT): Redeemable for underlying at maturity
 * - Yield Token (YT): Claims yield generated before maturity
 *
 * Key mechanics:
 * - PT trades at discount to underlying (discount = fixed yield)
 * - YT value = total future yield until maturity
 * - At maturity: PT = underlying, YT = 0
 *
 * Data is fetched from DeFi Llama (project: "spectra") for live APYs and TVLs.
 */

import {
  type Address,
  type PublicClient,
  formatUnits,
  parseUnits,
} from 'viem';
import { type YieldOpportunity, type Protocol } from '../config.js';

// ===========================================
// TYPES
// ===========================================

export interface SpectraMarket {
  id: string;
  name: string;
  ptAddress: Address;
  ytAddress: Address;
  ibtAddress: Address;
  underlyingAddress: Address;
  underlyingSymbol: string;
  maturity: number;
  ptPrice: number;
  ytPrice: number;
  fixedAPY: number;
  variableAPY: number;
  tvl: bigint;
}

export interface PTYTPosition {
  market: SpectraMarket;
  ptBalance: bigint;
  ytBalance: bigint;
  ptValue: bigint;
  ytValue: bigint;
  claimableYield: bigint;
}

// ===========================================
// SPECTRA CONTRACTS (Ethereum Mainnet)
// ===========================================

export const SPECTRA_REGISTRY = '0x085EE67132Ec4297b85ed5d8b4c8150B139C4532' as Address;
export const SPECTRA_ROUTER = '0x3d20601ac0Ba4e5891A2174A7AEFe14AAA0C39c1' as Address;

// ===========================================
// ABIs
// ===========================================

export const PRINCIPAL_TOKEN_ABI = [
  {
    name: 'maturity',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'underlying',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'ptReceiver', type: 'address' },
      { name: 'ytReceiver', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'depositIBT',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'ibts', type: 'uint256' },
      { name: 'ptReceiver', type: 'address' },
      { name: 'ytReceiver', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'redeem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },
  {
    name: 'previewDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'previewRedeem',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getIBT',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'getYT',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

export const YIELD_TOKEN_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'claimYield',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'receiver', type: 'address' },
      { name: 'minAssets', type: 'uint256' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },
  {
    name: 'getClaimableYield',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ===========================================
// DATA FETCHING (via DeFi Llama)
// ===========================================

interface DefiLlamaPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  poolMeta: string | null;
}

/**
 * Fetch Spectra yields from DeFi Llama
 */
async function fetchSpectraFromDeFiLlama(): Promise<DefiLlamaPool[]> {
  try {
    const res = await fetch('https://yields.llama.fi/pools');
    if (!res.ok) return [];

    const data = await res.json();
    const pools: DefiLlamaPool[] = data.data;

    return pools.filter(
      (p) => p.project === 'spectra' || p.project === 'pendle'
    );
  } catch {
    return [];
  }
}

// ===========================================
// YIELD CALCULATION
// ===========================================

/**
 * Calculate fixed APY from PT discount
 * Fixed APY = (1 - ptPrice) / timeToMaturity * 365 days
 */
export function calculateFixedAPY(ptPrice: number, maturityTimestamp: number): number {
  const now = Date.now() / 1000;
  const timeToMaturity = (maturityTimestamp - now) / (365 * 24 * 3600);

  if (timeToMaturity <= 0) return 0;

  const discount = 1 - ptPrice;
  const annualizedYield = discount / timeToMaturity;

  return annualizedYield;
}

/**
 * Calculate YT value based on expected yield
 */
export function calculateYTValue(
  variableAPY: number,
  maturityTimestamp: number,
  principal: number = 1
): number {
  const now = Date.now() / 1000;
  const timeToMaturity = (maturityTimestamp - now) / (365 * 24 * 3600);

  if (timeToMaturity <= 0) return 0;

  return principal * variableAPY * timeToMaturity;
}

/**
 * Compare fixed vs variable yield strategies
 */
export function compareStrategies(market: SpectraMarket): {
  fixedYield: number;
  expectedVariableYield: number;
  recommendation: 'fixed' | 'variable' | 'neutral';
  reason: string;
} {
  const now = Date.now() / 1000;
  const timeToMaturity = (market.maturity - now) / (365 * 24 * 3600);

  const fixedYield = (1 - market.ptPrice) * 100;
  const expectedVariableYield = market.variableAPY * timeToMaturity * 100;

  let recommendation: 'fixed' | 'variable' | 'neutral';
  let reason: string;

  if (fixedYield > expectedVariableYield * 1.1) {
    recommendation = 'fixed';
    reason = `Fixed yield (${fixedYield.toFixed(2)}%) beats expected variable (${expectedVariableYield.toFixed(2)}%)`;
  } else if (expectedVariableYield > fixedYield * 1.1) {
    recommendation = 'variable';
    reason = `Expected variable yield (${expectedVariableYield.toFixed(2)}%) beats fixed (${fixedYield.toFixed(2)}%)`;
  } else {
    recommendation = 'neutral';
    reason = 'Fixed and variable yields are similar - choose based on risk preference';
  }

  return { fixedYield, expectedVariableYield, recommendation, reason };
}

// ===========================================
// ADAPTER FUNCTIONS
// ===========================================

/**
 * Fetch all Spectra/Pendle yield opportunities from DeFi Llama
 */
export async function fetchSpectraYields(): Promise<YieldOpportunity[]> {
  const pools = await fetchSpectraFromDeFiLlama();
  const opportunities: YieldOpportunity[] = [];

  for (const pool of pools) {
    if (!pool.apy || pool.apy <= 0 || !pool.tvlUsd || pool.tvlUsd < 50_000) continue;

    const apy = pool.apy / 100; // Convert percentage to decimal
    const symbol = pool.symbol.split('-')[0] || pool.symbol;
    const isFixed = pool.poolMeta?.toLowerCase().includes('pt') || pool.symbol.toLowerCase().includes('pt-');

    opportunities.push({
      id: pool.pool,
      protocol: 'spectra' as Protocol,
      name: `${pool.project === 'pendle' ? 'Pendle' : 'Spectra'} ${pool.symbol}`,
      asset: symbol,
      assetAddress: '0x0000000000000000000000000000000000000000' as Address, // Not available from DeFi Llama
      apy,
      tvl: BigInt(Math.round(pool.tvlUsd)),
      contractAddress: SPECTRA_REGISTRY,
      risk: isFixed ? 'low' : 'high',
      description: `${isFixed ? 'Fixed' : 'Variable'} yield on ${pool.chain}${pool.poolMeta ? ` (${pool.poolMeta})` : ''}`,
    });
  }

  return opportunities;
}

/**
 * Get best fixed yield for an asset
 */
export async function getBestFixedYield(asset: string): Promise<YieldOpportunity | null> {
  const yields = await fetchSpectraYields();
  const fixed = yields.filter(
    (y) =>
      y.asset.toUpperCase() === asset.toUpperCase() &&
      y.description?.includes('Fixed')
  );

  if (fixed.length === 0) return null;
  return fixed.reduce((best, current) => (current.apy > best.apy ? current : best));
}

// ===========================================
// FORMAT HELPERS
// ===========================================

export function formatSpectraMarket(market: SpectraMarket): string {
  const now = Date.now() / 1000;
  const daysToMaturity = Math.floor((market.maturity - now) / (24 * 3600));
  const comparison = compareStrategies(market);

  return [
    `${market.name}`,
    `  Underlying: ${market.underlyingSymbol}`,
    `  Maturity: ${daysToMaturity} days`,
    `  Fixed APY: ${(market.fixedAPY * 100).toFixed(2)}% (via PT)`,
    `  Variable APY: ${(market.variableAPY * 100).toFixed(2)}% (IBT)`,
    `  PT Price: ${market.ptPrice.toFixed(4)}`,
    `  YT Price: ${market.ytPrice.toFixed(4)}`,
    `  Recommendation: ${comparison.recommendation.toUpperCase()}`,
    `  Reason: ${comparison.reason}`,
  ].join('\n');
}

export function formatYieldComparison(market: SpectraMarket): string {
  const comparison = compareStrategies(market);

  return `
${market.name}
Strategy     | Expected Return | Risk
Fixed (PT)   | ${comparison.fixedYield.toFixed(2).padStart(13)}% | Low
Variable     | ${comparison.expectedVariableYield.toFixed(2).padStart(13)}% | Medium
YT Leverage  | ${(market.variableAPY * 100 / market.ytPrice).toFixed(2).padStart(13)}% | High
Recommendation: ${comparison.recommendation.toUpperCase()}`;
}
