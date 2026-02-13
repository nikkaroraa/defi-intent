/**
 * Hyperliquid Vault Management
 * HLP tracking, yield comparison, deposit/withdraw
 */

import { HyperliquidClient, createHyperliquidClient } from './client.js';
import {
  type VaultDetails,
  type UserVaultEquity,
  type BorrowLendReserveState,
  KNOWN_VAULTS,
} from './config.js';

// ===========================================
// TYPES
// ===========================================

export interface VaultYieldInfo {
  name: string;
  address: string;
  tvl: number;
  apy: number;
  type: 'vault' | 'lending';
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface UserVaultPosition {
  vaultName: string;
  vaultAddress: string;
  equity: number;
  allTimePnl: number;
  currentApy: number;
}

export interface YieldComparison {
  asset: string;
  hyperliquid: {
    supplyApy: number;
    borrowApy: number;
    utilization: number;
  };
  competitors: Array<{
    protocol: string;
    supplyApy: number;
    borrowApy?: number;
  }>;
  recommendation: string;
}

// ===========================================
// VAULT FUNCTIONS
// ===========================================

/**
 * Get all yield opportunities on Hyperliquid
 */
export async function getHyperliquidYields(
  client?: HyperliquidClient
): Promise<VaultYieldInfo[]> {
  const hl = client || createHyperliquidClient();
  const yields: VaultYieldInfo[] = [];

  // Get lending rates
  try {
    const reserves = await hl.getAllBorrowLendReserveStates();

    for (const reserve of reserves) {
      if (reserve.supplyApy > 0) {
        yields.push({
          name: `${reserve.tokenName} Supply`,
          address: `lending-${reserve.token}`,
          tvl: parseFloat(reserve.totalSupply),
          apy: reserve.supplyApy * 100, // Convert to percentage
          type: 'lending',
          description: `Supply ${reserve.tokenName} to earn yield`,
          riskLevel: reserve.utilizationRate > 0.8 ? 'medium' : 'low',
        });
      }
    }
  } catch (e) {
    console.error('Failed to fetch lending rates:', e);
  }

  // Add known vaults
  for (const vault of KNOWN_VAULTS) {
    try {
      const details = await hl.getVaultDetails(vault.address);
      yields.push({
        name: details.name || vault.name,
        address: vault.address,
        tvl: parseFloat(details.portfolio?.accountValue || '0'),
        apy: details.apr || 0,
        type: 'vault',
        description: vault.description,
        riskLevel: vault.type === 'protocol' ? 'medium' : 'high',
      });
    } catch {
      // Vault might not exist or be accessible
    }
  }

  // Sort by APY
  yields.sort((a, b) => b.apy - a.apy);

  return yields;
}

/**
 * Get user's positions across all vaults
 */
export async function getUserVaultPositions(
  userAddress: string,
  client?: HyperliquidClient
): Promise<UserVaultPosition[]> {
  const hl = client || createHyperliquidClient();
  const positions: UserVaultPosition[] = [];

  try {
    const equities = await hl.getUserVaultEquities(userAddress);

    for (const eq of equities) {
      // Get vault APY
      let apy = 0;
      try {
        const details = await hl.getVaultDetails(eq.vaultAddress, userAddress);
        apy = details.apr || 0;
      } catch {}

      positions.push({
        vaultName: eq.vaultName,
        vaultAddress: eq.vaultAddress,
        equity: parseFloat(eq.equity),
        allTimePnl: parseFloat(eq.allTimePnl),
        currentApy: apy,
      });
    }
  } catch (e) {
    console.error('Failed to fetch user vault positions:', e);
  }

  return positions;
}

/**
 * Compare Hyperliquid yields with other protocols
 */
export async function compareYields(
  asset: string,
  client?: HyperliquidClient
): Promise<YieldComparison> {
  const hl = client || createHyperliquidClient();

  // Get Hyperliquid rates
  let hlRates = {
    supplyApy: 0,
    borrowApy: 0,
    utilization: 0,
  };

  try {
    const reserves = await hl.getAllBorrowLendReserveStates();
    const assetReserve = reserves.find(
      (r) => r.tokenName.toUpperCase() === asset.toUpperCase()
    );

    if (assetReserve) {
      hlRates = {
        supplyApy: assetReserve.supplyApy * 100,
        borrowApy: assetReserve.borrowApy * 100,
        utilization: assetReserve.utilizationRate * 100,
      };
    }
  } catch (e) {
    console.error('Failed to fetch Hyperliquid rates:', e);
  }

  // Competitor rates (would be fetched from their APIs in production)
  const competitors = [
    { protocol: 'Aave V3', supplyApy: 3.5, borrowApy: 5.2 },
    { protocol: 'Compound', supplyApy: 2.8, borrowApy: 4.5 },
    { protocol: 'Morpho', supplyApy: 4.2, borrowApy: 5.8 },
  ];

  // Generate recommendation
  let recommendation = '';
  const hlSupply = hlRates.supplyApy;
  const bestCompetitor = competitors.reduce((best, curr) =>
    curr.supplyApy > best.supplyApy ? curr : best
  );

  if (hlSupply > bestCompetitor.supplyApy) {
    recommendation = `Hyperliquid offers the best ${asset} supply rate at ${hlSupply.toFixed(2)}%`;
  } else {
    recommendation = `${bestCompetitor.protocol} offers better ${asset} supply rate (${bestCompetitor.supplyApy.toFixed(2)}% vs ${hlSupply.toFixed(2)}%)`;
  }

  return {
    asset,
    hyperliquid: hlRates,
    competitors,
    recommendation,
  };
}

// ===========================================
// HLP SPECIFIC FUNCTIONS
// ===========================================

export interface HLPInfo {
  tvl: number;
  apy: number;
  positions: Array<{
    coin: string;
    exposure: number;
    weight: number;
  }>;
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

/**
 * Get HLP (Hyperliquid Liquidity Provider) info
 * HLP is the main protocol vault that provides liquidity
 */
export async function getHLPInfo(client?: HyperliquidClient): Promise<HLPInfo> {
  // In production, would fetch from actual HLP vault
  // This is simulated data for demo
  return {
    tvl: 850_000_000, // $850M TVL
    apy: 25.5, // 25.5% APY
    positions: [
      { coin: 'BTC', exposure: 125_000_000, weight: 0.147 },
      { coin: 'ETH', exposure: 180_000_000, weight: 0.212 },
      { coin: 'SOL', exposure: 95_000_000, weight: 0.112 },
      { coin: 'HYPE', exposure: 75_000_000, weight: 0.088 },
      { coin: 'Others', exposure: 375_000_000, weight: 0.441 },
    ],
    performance: {
      daily: 0.07,
      weekly: 0.52,
      monthly: 2.13,
    },
  };
}

// ===========================================
// FORMAT HELPERS
// ===========================================

export function formatVaultYield(yield_: VaultYieldInfo): string {
  return [
    `${yield_.name}`,
    `  APY: ${yield_.apy.toFixed(2)}%`,
    `  TVL: $${(yield_.tvl / 1e6).toFixed(2)}M`,
    `  Type: ${yield_.type}`,
    `  Risk: ${yield_.riskLevel}`,
    `  ${yield_.description}`,
  ].join('\n');
}

export function formatYieldComparison(comp: YieldComparison): string {
  const lines = [`\n📊 ${comp.asset} Yield Comparison`];
  lines.push(`\nHyperliquid:`);
  lines.push(`  Supply APY: ${comp.hyperliquid.supplyApy.toFixed(2)}%`);
  lines.push(`  Borrow APY: ${comp.hyperliquid.borrowApy.toFixed(2)}%`);
  lines.push(`  Utilization: ${comp.hyperliquid.utilization.toFixed(1)}%`);

  lines.push(`\nCompetitors:`);
  for (const c of comp.competitors) {
    lines.push(`  ${c.protocol}: ${c.supplyApy.toFixed(2)}% supply`);
  }

  lines.push(`\n💡 ${comp.recommendation}`);
  return lines.join('\n');
}

export function formatHLPInfo(hlp: HLPInfo): string {
  const lines = [
    `\n🏦 HLP (Hyperliquid Liquidity Provider)`,
    `═══════════════════════════════════════`,
    `  TVL: $${(hlp.tvl / 1e9).toFixed(2)}B`,
    `  APY: ${hlp.apy.toFixed(2)}%`,
    ``,
    `📈 Performance:`,
    `  Daily: ${hlp.performance.daily > 0 ? '+' : ''}${hlp.performance.daily.toFixed(2)}%`,
    `  Weekly: ${hlp.performance.weekly > 0 ? '+' : ''}${hlp.performance.weekly.toFixed(2)}%`,
    `  Monthly: ${hlp.performance.monthly > 0 ? '+' : ''}${hlp.performance.monthly.toFixed(2)}%`,
    ``,
    `📊 Top Positions:`,
  ];

  for (const pos of hlp.positions) {
    const bar = '█'.repeat(Math.floor(pos.weight * 20));
    lines.push(`  ${pos.coin.padEnd(6)} ${bar} ${(pos.weight * 100).toFixed(1)}%`);
  }

  return lines.join('\n');
}
