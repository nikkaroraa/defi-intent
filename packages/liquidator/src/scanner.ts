/**
 * Position Scanner
 * Monitors Morpho Blue positions for liquidation opportunities
 */

import {
  createPublicClient,
  http,
  type Address,
  type PublicClient,
  formatUnits,
  parseAbiItem,
} from 'viem';
import {
  KATANA_CHAIN,
  MORPHO_BLUE,
  MORPHO_BLUE_ABI,
  ORACLE_ABI,
  TOKENS,
  WAD,
} from './config.js';

// ===========================================
// TYPES
// ===========================================

export interface MarketParams {
  loanToken: Address;
  collateralToken: Address;
  oracle: Address;
  irm: Address;
  lltv: bigint;
}

export interface Position {
  user: Address;
  marketId: `0x${string}`;
  marketParams: MarketParams;
  supplyShares: bigint;
  borrowShares: bigint;
  collateral: bigint;
  // Derived values
  borrowAmount: bigint;
  collateralValue: bigint;
  healthFactor: number;
  isLiquidatable: boolean;
}

export interface MarketState {
  id: `0x${string}`;
  params: MarketParams;
  totalSupplyAssets: bigint;
  totalSupplyShares: bigint;
  totalBorrowAssets: bigint;
  totalBorrowShares: bigint;
  price: bigint; // Oracle price
}

export interface LiquidationOpportunity {
  position: Position;
  market: MarketState;
  maxSeizableCollateral: bigint;
  maxRepayableDebt: bigint;
  estimatedProfitUsd: bigint;
  loanTokenSymbol: string;
  collateralTokenSymbol: string;
}

// ===========================================
// CLIENT
// ===========================================

export function createKatanaClient(): PublicClient {
  return createPublicClient({
    chain: {
      id: KATANA_CHAIN.id,
      name: KATANA_CHAIN.name,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [KATANA_CHAIN.rpc] } },
    },
    transport: http(KATANA_CHAIN.rpc),
  });
}

// ===========================================
// MARKET FUNCTIONS
// ===========================================

/**
 * Get market state including oracle price
 */
export async function getMarketState(
  client: PublicClient,
  marketId: `0x${string}`
): Promise<MarketState | null> {
  try {
    // Get market params
    const params = await client.readContract({
      address: MORPHO_BLUE,
      abi: MORPHO_BLUE_ABI,
      functionName: 'idToMarketParams',
      args: [marketId],
    });

    // Get market totals
    const market = await client.readContract({
      address: MORPHO_BLUE,
      abi: MORPHO_BLUE_ABI,
      functionName: 'market',
      args: [marketId],
    });

    // Get oracle price
    let price = BigInt(0);
    try {
      price = await client.readContract({
        address: params[2], // oracle address
        abi: ORACLE_ABI,
        functionName: 'price',
      });
    } catch {
      console.warn(`Failed to get price for market ${marketId}`);
    }

    return {
      id: marketId,
      params: {
        loanToken: params[0],
        collateralToken: params[1],
        oracle: params[2],
        irm: params[3],
        lltv: params[4],
      },
      totalSupplyAssets: market[0],
      totalSupplyShares: market[1],
      totalBorrowAssets: market[2],
      totalBorrowShares: market[3],
      price,
    };
  } catch (e) {
    console.error(`Failed to get market state for ${marketId}:`, e);
    return null;
  }
}

// ===========================================
// POSITION FUNCTIONS
// ===========================================

/**
 * Get a user's position in a market
 */
export async function getPosition(
  client: PublicClient,
  marketId: `0x${string}`,
  user: Address,
  marketState: MarketState
): Promise<Position | null> {
  try {
    const position = await client.readContract({
      address: MORPHO_BLUE,
      abi: MORPHO_BLUE_ABI,
      functionName: 'position',
      args: [marketId, user],
    });

    const supplyShares = position[0];
    const borrowShares = BigInt(position[1]);
    const collateral = BigInt(position[2]);

    // Calculate borrow amount from shares
    const borrowAmount = marketState.totalBorrowShares > BigInt(0)
      ? (borrowShares * marketState.totalBorrowAssets) / marketState.totalBorrowShares
      : BigInt(0);

    // Calculate collateral value in loan token terms using oracle price
    // price is typically scaled by 1e36 (ORACLE_PRICE_SCALE in Morpho)
    const ORACLE_SCALE = BigInt(10) ** BigInt(36);
    const collateralValue = marketState.price > BigInt(0)
      ? (collateral * marketState.price) / ORACLE_SCALE
      : BigInt(0);

    // Calculate health factor
    // HF = (collateralValue * LLTV) / borrowAmount
    // If HF < 1, position is liquidatable
    let healthFactor = Infinity;
    if (borrowAmount > BigInt(0) && collateralValue > BigInt(0)) {
      const maxBorrowable = (collateralValue * marketState.params.lltv) / WAD;
      healthFactor = Number(maxBorrowable) / Number(borrowAmount);
    }

    const isLiquidatable = healthFactor < 1;

    return {
      user,
      marketId,
      marketParams: marketState.params,
      supplyShares,
      borrowShares,
      collateral,
      borrowAmount,
      collateralValue,
      healthFactor,
      isLiquidatable,
    };
  } catch (e) {
    console.error(`Failed to get position for ${user}:`, e);
    return null;
  }
}

/**
 * Scan for liquidatable positions by listening to events
 */
export async function scanForLiquidatablePositions(
  client: PublicClient,
  marketIds: `0x${string}`[],
  fromBlock?: bigint
): Promise<LiquidationOpportunity[]> {
  const opportunities: LiquidationOpportunity[] = [];

  // Borrow event signature
  const borrowEventAbi = parseAbiItem(
    'event Borrow(bytes32 indexed id, address caller, address indexed onBehalf, address indexed receiver, uint256 assets, uint256 shares)'
  );

  for (const marketId of marketIds) {
    const marketState = await getMarketState(client, marketId);
    if (!marketState) continue;

    // Get recent borrow events to find borrowers
    try {
      const logs = await client.getLogs({
        address: MORPHO_BLUE,
        event: borrowEventAbi,
        args: { id: marketId },
        fromBlock: fromBlock || BigInt(0),
        toBlock: 'latest',
      });

      // Get unique borrowers
      const borrowers = [...new Set(logs.map((log) => log.args.onBehalf as Address))];

      // Check each borrower's position
      for (const borrower of borrowers) {
        const position = await getPosition(client, marketId, borrower, marketState);
        if (!position || !position.isLiquidatable) continue;

        // Calculate liquidation opportunity
        const opportunity = calculateLiquidationOpportunity(position, marketState);
        if (opportunity) {
          opportunities.push(opportunity);
        }
      }
    } catch (e) {
      console.error(`Failed to scan market ${marketId}:`, e);
    }
  }

  // Sort by profit descending
  opportunities.sort((a, b) => Number(b.estimatedProfitUsd - a.estimatedProfitUsd));

  return opportunities;
}

// ===========================================
// LIQUIDATION CALCULATION
// ===========================================

/**
 * Calculate liquidation opportunity details
 */
export function calculateLiquidationOpportunity(
  position: Position,
  market: MarketState
): LiquidationOpportunity | null {
  if (!position.isLiquidatable) return null;

  // Max repayable is typically 50% of the debt
  const maxRepayableDebt = position.borrowAmount / BigInt(2);

  // Calculate seized collateral with liquidation incentive (5%)
  // seizedCollateral = repayAmount * price * incentive
  const ORACLE_SCALE = BigInt(10) ** BigInt(36);
  const INCENTIVE = BigInt(105); // 105%
  
  const maxSeizableCollateral = market.price > BigInt(0)
    ? (maxRepayableDebt * ORACLE_SCALE * INCENTIVE) / (market.price * BigInt(100))
    : BigInt(0);

  // Cap at actual collateral
  const actualSeizable = maxSeizableCollateral > position.collateral
    ? position.collateral
    : maxSeizableCollateral;

  // Estimate profit in USD (simplified - assumes 1:1 for stables)
  // Real profit = collateral_seized_value - debt_repaid_value
  // With 5% incentive, profit ≈ 5% of liquidated amount
  const profitRatio = BigInt(5); // 5%
  const estimatedProfitUsd = (maxRepayableDebt * profitRatio) / BigInt(100);

  // Find token symbols
  const loanToken = Object.entries(TOKENS).find(
    ([, t]) => t.address.toLowerCase() === position.marketParams.loanToken.toLowerCase()
  );
  const collateralToken = Object.entries(TOKENS).find(
    ([, t]) => t.address.toLowerCase() === position.marketParams.collateralToken.toLowerCase()
  );

  return {
    position,
    market,
    maxSeizableCollateral: actualSeizable,
    maxRepayableDebt,
    estimatedProfitUsd,
    loanTokenSymbol: loanToken?.[0] || 'UNKNOWN',
    collateralTokenSymbol: collateralToken?.[0] || 'UNKNOWN',
  };
}

// ===========================================
// FORMAT HELPERS
// ===========================================

export function formatPosition(pos: Position): string {
  return [
    `User: ${pos.user}`,
    `Market: ${pos.marketId.slice(0, 10)}...`,
    `Collateral: ${formatUnits(pos.collateral, 18)}`,
    `Borrow: ${formatUnits(pos.borrowAmount, 18)}`,
    `Health Factor: ${pos.healthFactor.toFixed(4)}`,
    `Liquidatable: ${pos.isLiquidatable ? '🔴 YES' : '🟢 NO'}`,
  ].join('\n');
}

export function formatOpportunity(opp: LiquidationOpportunity): string {
  return [
    `🎯 Liquidation Opportunity`,
    `  User: ${opp.position.user}`,
    `  Market: ${opp.loanTokenSymbol}/${opp.collateralTokenSymbol}`,
    `  Health Factor: ${opp.position.healthFactor.toFixed(4)}`,
    `  Max Repay: ${formatUnits(opp.maxRepayableDebt, 18)} ${opp.loanTokenSymbol}`,
    `  Seize: ${formatUnits(opp.maxSeizableCollateral, 18)} ${opp.collateralTokenSymbol}`,
    `  Est. Profit: $${formatUnits(opp.estimatedProfitUsd, 6)}`,
  ].join('\n');
}
