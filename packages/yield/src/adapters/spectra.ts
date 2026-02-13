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
  ibtAddress: Address; // Interest-bearing token (e.g., yvUSDC)
  underlyingAddress: Address; // Underlying token (e.g., USDC)
  underlyingSymbol: string;
  maturity: number; // Unix timestamp
  ptPrice: number; // PT price in underlying terms (0-1)
  ytPrice: number; // YT price in underlying terms
  fixedAPY: number; // Implied fixed rate from PT discount
  variableAPY: number; // Current variable rate of IBT
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
// SPECTRA CONTRACTS
// ===========================================

// Katana Spectra deployment (placeholder addresses - need real ones)
export const SPECTRA_REGISTRY = '0x0000000000000000000000000000000000000000' as Address;
export const SPECTRA_ROUTER = '0x0000000000000000000000000000000000000000' as Address;
export const SPECTRA_FACTORY = '0x0000000000000000000000000000000000000000' as Address;

// Known Spectra markets on Katana
export const SPECTRA_MARKETS: SpectraMarket[] = [
  {
    id: 'spectra-yvusdc-mar25',
    name: 'PT-yvUSDC (Mar 2025)',
    ptAddress: '0x0000000000000000000000000000000000000001' as Address,
    ytAddress: '0x0000000000000000000000000000000000000002' as Address,
    ibtAddress: '0x0000000000000000000000000000000000000003' as Address,
    underlyingAddress: '0x203a662b0bd271a6ed5a60edfbd04bfce608fd36' as Address, // USDC
    underlyingSymbol: 'USDC',
    maturity: 1743465600, // March 31, 2025
    ptPrice: 0.95, // PT trades at 5% discount
    ytPrice: 0.05,
    fixedAPY: 0.11, // 11% fixed APY
    variableAPY: 0.085, // 8.5% variable
    tvl: BigInt(3200000) * BigInt(10) ** BigInt(6),
  },
  {
    id: 'spectra-yvweth-jun25',
    name: 'PT-yvWETH (Jun 2025)',
    ptAddress: '0x0000000000000000000000000000000000000004' as Address,
    ytAddress: '0x0000000000000000000000000000000000000005' as Address,
    ibtAddress: '0x0000000000000000000000000000000000000006' as Address,
    underlyingAddress: '0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62' as Address, // WETH
    underlyingSymbol: 'WETH',
    maturity: 1751328000, // June 30, 2025
    ptPrice: 0.97,
    ytPrice: 0.03,
    fixedAPY: 0.065, // 6.5% fixed APY
    variableAPY: 0.052, // 5.2% variable
    tvl: BigInt(1800) * BigInt(10) ** BigInt(18),
  },
  {
    id: 'spectra-yvdai-sep25',
    name: 'PT-yvDAI (Sep 2025)',
    ptAddress: '0x0000000000000000000000000000000000000007' as Address,
    ytAddress: '0x0000000000000000000000000000000000000008' as Address,
    ibtAddress: '0x0000000000000000000000000000000000000009' as Address,
    underlyingAddress: '0x4b6b9b31c72836806b0b1104cf1cdab8a0e3bd66' as Address, // DAI
    underlyingSymbol: 'DAI',
    maturity: 1759248000, // September 30, 2025
    ptPrice: 0.92,
    ytPrice: 0.08,
    fixedAPY: 0.095, // 9.5% fixed APY
    variableAPY: 0.078, // 7.8% variable
    tvl: BigInt(2100000) * BigInt(10) ** BigInt(18),
  },
];

// ===========================================
// ABIs
// ===========================================

export const PRINCIPAL_TOKEN_ABI = [
  // EIP-5095 functions
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
// YIELD CALCULATION
// ===========================================

/**
 * Calculate fixed APY from PT discount
 * Fixed APY = (1 - ptPrice) / timeToMaturity * 365 days
 */
export function calculateFixedAPY(ptPrice: number, maturityTimestamp: number): number {
  const now = Date.now() / 1000;
  const timeToMaturity = (maturityTimestamp - now) / (365 * 24 * 3600); // In years

  if (timeToMaturity <= 0) return 0;

  const discount = 1 - ptPrice;
  const annualizedYield = discount / timeToMaturity;

  return annualizedYield;
}

/**
 * Calculate YT value based on expected yield
 * YT value = expected yield until maturity
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

  const fixedYield = (1 - market.ptPrice) * 100; // Total fixed return
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
 * Fetch all Spectra yield opportunities
 */
export async function fetchSpectraYields(): Promise<YieldOpportunity[]> {
  const opportunities: YieldOpportunity[] = [];

  for (const market of SPECTRA_MARKETS) {
    // Check if market is still active
    const now = Date.now() / 1000;
    if (market.maturity < now) continue;

    const daysToMaturity = Math.floor((market.maturity - now) / (24 * 3600));

    // PT opportunity (fixed yield)
    opportunities.push({
      id: `${market.id}-pt`,
      protocol: 'spectra' as Protocol,
      name: market.name,
      asset: market.underlyingSymbol,
      assetAddress: market.underlyingAddress,
      apy: market.fixedAPY,
      tvl: market.tvl,
      contractAddress: market.ptAddress,
      risk: 'low', // Fixed yield = low risk
      description: `Fixed ${(market.fixedAPY * 100).toFixed(1)}% APY, matures in ${daysToMaturity} days`,
    });

    // YT opportunity (leveraged variable yield)
    opportunities.push({
      id: `${market.id}-yt`,
      protocol: 'spectra' as Protocol,
      name: `YT-${market.name.replace('PT-', '')}`,
      asset: market.underlyingSymbol,
      assetAddress: market.underlyingAddress,
      apy: market.variableAPY * (1 / market.ytPrice), // YT provides leveraged exposure
      tvl: market.tvl / BigInt(10), // YT is smaller market
      contractAddress: market.ytAddress,
      risk: 'high', // YT is speculative
      description: `Leveraged yield exposure, ${daysToMaturity} days to expiry`,
    });
  }

  return opportunities;
}

/**
 * Get best fixed yield for an asset
 */
export function getBestFixedYield(asset: string): SpectraMarket | null {
  const markets = SPECTRA_MARKETS.filter(
    (m) =>
      m.underlyingSymbol.toUpperCase() === asset.toUpperCase() &&
      m.maturity > Date.now() / 1000
  );

  if (markets.length === 0) return null;

  // Sort by fixed APY descending
  markets.sort((a, b) => b.fixedAPY - a.fixedAPY);

  return markets[0];
}

/**
 * Build deposit transaction for Spectra PT
 */
export function buildSpectraDepositTx(
  market: SpectraMarket,
  amount: bigint,
  receiver: Address
): { to: Address; data: `0x${string}` } {
  // This would use encodeFunctionData in production
  // Simplified for demo
  return {
    to: market.ptAddress,
    data: '0x' as `0x${string}`,
  };
}

// ===========================================
// FORMAT HELPERS
// ===========================================

export function formatSpectraMarket(market: SpectraMarket): string {
  const now = Date.now() / 1000;
  const daysToMaturity = Math.floor((market.maturity - now) / (24 * 3600));
  const comparison = compareStrategies(market);

  return [
    `📊 ${market.name}`,
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
┌─────────────────────────────────────────────────┐
│ ${market.name.padEnd(47)} │
├─────────────────────────────────────────────────┤
│ Strategy     │ Expected Return │ Risk          │
├──────────────┼─────────────────┼───────────────┤
│ Fixed (PT)   │ ${comparison.fixedYield.toFixed(2).padStart(13)}% │ Low           │
│ Variable     │ ${comparison.expectedVariableYield.toFixed(2).padStart(13)}% │ Medium        │
│ YT Leverage  │ ${(market.variableAPY * 100 / market.ytPrice).toFixed(2).padStart(13)}% │ High          │
├─────────────────────────────────────────────────┤
│ 💡 Recommendation: ${comparison.recommendation.toUpperCase().padEnd(27)} │
└─────────────────────────────────────────────────┘`;
}
