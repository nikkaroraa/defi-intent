/**
 * Liquidation Executor
 * Executes liquidations directly or via flash loans
 */

import {
  type Address,
  type PublicClient,
  type WalletClient,
  encodeFunctionData,
  formatUnits,
} from 'viem';
import {
  MORPHO_BLUE,
  MORPHO_BLUE_ABI,
  ERC20_ABI,
  ESTIMATED_GAS_LIQUIDATE,
  ESTIMATED_GAS_FLASH_LIQUIDATE,
  MIN_PROFIT_USD,
  TOKENS,
} from './config.js';
import { type LiquidationOpportunity, type MarketParams } from './scanner.js';

// ===========================================
// TYPES
// ===========================================

export interface LiquidationResult {
  success: boolean;
  txHash?: `0x${string}`;
  assetsSeized?: bigint;
  sharesRepaid?: bigint;
  gasUsed?: bigint;
  profitUsd?: bigint;
  error?: string;
}

export interface ExecutionConfig {
  maxGasPrice: bigint; // Max gas price in wei
  minProfitUsd: bigint; // Minimum profit threshold
  useFlashLoan: boolean; // Use flash loan for capital efficiency
  dryRun: boolean; // Simulate only, don't execute
}

export const DEFAULT_CONFIG: ExecutionConfig = {
  maxGasPrice: BigInt(50_000000000), // 50 gwei
  minProfitUsd: MIN_PROFIT_USD,
  useFlashLoan: true,
  dryRun: true, // Safe default
};

// ===========================================
// PROFITABILITY CHECK
// ===========================================

/**
 * Calculate if a liquidation is profitable after gas costs
 */
export async function isProfitable(
  client: PublicClient,
  opportunity: LiquidationOpportunity,
  config: ExecutionConfig
): Promise<{ profitable: boolean; netProfitUsd: bigint; gasEstimate: bigint }> {
  // Get current gas price
  const gasPrice = await client.getGasPrice();

  if (gasPrice > config.maxGasPrice) {
    return { profitable: false, netProfitUsd: BigInt(0), gasEstimate: BigInt(0) };
  }

  // Estimate gas based on execution method
  const gasEstimate = config.useFlashLoan
    ? ESTIMATED_GAS_FLASH_LIQUIDATE
    : ESTIMATED_GAS_LIQUIDATE;

  // Calculate gas cost in USD (assuming ETH price ~ $2500 for estimation)
  const ETH_PRICE_USD = BigInt(2500_000000); // $2500 with 6 decimals
  const gasCostWei = gasPrice * gasEstimate;
  const gasCostUsd = (gasCostWei * ETH_PRICE_USD) / BigInt(10) ** BigInt(18);

  // Net profit
  const netProfitUsd = opportunity.estimatedProfitUsd - gasCostUsd;
  const profitable = netProfitUsd >= config.minProfitUsd;

  return { profitable, netProfitUsd, gasEstimate };
}

// ===========================================
// DIRECT LIQUIDATION
// ===========================================

/**
 * Build direct liquidation transaction
 * Requires the liquidator to have the loan tokens
 */
export function buildDirectLiquidationTx(
  opportunity: LiquidationOpportunity,
  liquidator: Address
): { to: Address; data: `0x${string}`; value: bigint }[] {
  const txs: { to: Address; data: `0x${string}`; value: bigint }[] = [];

  // 1. Approve Morpho Blue to spend loan tokens
  txs.push({
    to: opportunity.position.marketParams.loanToken,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [MORPHO_BLUE, opportunity.maxRepayableDebt],
    }),
    value: BigInt(0),
  });

  // 2. Execute liquidation
  // Using seizedAssets mode (specify how much collateral to seize)
  txs.push({
    to: MORPHO_BLUE,
    data: encodeFunctionData({
      abi: MORPHO_BLUE_ABI,
      functionName: 'liquidate',
      args: [
        opportunity.position.marketParams,
        opportunity.position.user,
        opportunity.maxSeizableCollateral, // seizedAssets
        BigInt(0), // repaidShares (0 = use seizedAssets mode)
        '0x', // callback data
      ],
    }),
    value: BigInt(0),
  });

  return txs;
}

// ===========================================
// FLASH LOAN LIQUIDATION
// ===========================================

/**
 * Flash loan callback contract bytecode
 * This is a simplified representation - in production you'd deploy a contract
 */
export const FLASH_LIQUIDATOR_ABI = [
  {
    name: 'flashLiquidate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'borrower', type: 'address' },
      { name: 'seizedAssets', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

/**
 * Build flash loan liquidation call
 * Uses Morpho's flash loan mechanism for capital efficiency
 */
export function buildFlashLiquidationTx(
  opportunity: LiquidationOpportunity,
  flashLiquidatorContract: Address
): { to: Address; data: `0x${string}`; value: bigint } {
  return {
    to: flashLiquidatorContract,
    data: encodeFunctionData({
      abi: FLASH_LIQUIDATOR_ABI,
      functionName: 'flashLiquidate',
      args: [
        opportunity.position.marketParams,
        opportunity.position.user,
        opportunity.maxSeizableCollateral,
      ],
    }),
    value: BigInt(0),
  };
}

// ===========================================
// EXECUTE LIQUIDATION
// ===========================================

/**
 * Execute a liquidation (simulated or real)
 */
export async function executeLiquidation(
  client: PublicClient,
  walletClient: WalletClient | null,
  opportunity: LiquidationOpportunity,
  config: ExecutionConfig = DEFAULT_CONFIG
): Promise<LiquidationResult> {
  // Check profitability
  const profitability = await isProfitable(client, opportunity, config);

  if (!profitability.profitable) {
    return {
      success: false,
      error: `Not profitable. Net profit: $${formatUnits(profitability.netProfitUsd, 6)}`,
    };
  }

  // Build transaction
  const liquidator = walletClient?.account?.address;
  if (!liquidator && !config.dryRun) {
    return { success: false, error: 'No wallet connected' };
  }

  const txs = buildDirectLiquidationTx(
    opportunity,
    liquidator || '0x0000000000000000000000000000000000000000'
  );

  // Dry run - simulate only
  if (config.dryRun) {
    console.log('\n🔍 DRY RUN - Simulation only');
    console.log(`Transactions to execute: ${txs.length}`);
    for (const tx of txs) {
      console.log(`  → to: ${tx.to}`);
      console.log(`    data: ${tx.data.slice(0, 66)}...`);
    }
    console.log(`Estimated profit: $${formatUnits(profitability.netProfitUsd, 6)}`);

    return {
      success: true,
      profitUsd: profitability.netProfitUsd,
      gasUsed: profitability.gasEstimate,
    };
  }

  // Real execution
  if (!walletClient) {
    return { success: false, error: 'Wallet client required for real execution' };
  }

  try {
    // Execute each transaction
    for (const tx of txs) {
      const hash = await walletClient.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value,
      });

      // Wait for confirmation
      const receipt = await client.waitForTransactionReceipt({ hash });

      if (receipt.status === 'reverted') {
        return { success: false, error: 'Transaction reverted', txHash: hash };
      }
    }

    return {
      success: true,
      profitUsd: profitability.netProfitUsd,
      gasUsed: profitability.gasEstimate,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

// ===========================================
// BATCH EXECUTION
// ===========================================

/**
 * Execute multiple liquidations in sequence
 */
export async function executeBatchLiquidations(
  client: PublicClient,
  walletClient: WalletClient | null,
  opportunities: LiquidationOpportunity[],
  config: ExecutionConfig = DEFAULT_CONFIG
): Promise<LiquidationResult[]> {
  const results: LiquidationResult[] = [];

  for (const opportunity of opportunities) {
    console.log(`\nProcessing liquidation for ${opportunity.position.user}...`);
    const result = await executeLiquidation(client, walletClient, opportunity, config);
    results.push(result);

    if (result.success) {
      console.log(`✅ Success! Profit: $${formatUnits(result.profitUsd || BigInt(0), 6)}`);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
  }

  return results;
}

// ===========================================
// FORMAT HELPERS
// ===========================================

export function formatResult(result: LiquidationResult): string {
  if (result.success) {
    return [
      '✅ Liquidation Successful',
      result.txHash ? `  TX: ${result.txHash}` : '',
      result.profitUsd ? `  Profit: $${formatUnits(result.profitUsd, 6)}` : '',
      result.gasUsed ? `  Gas: ${result.gasUsed.toString()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  return `❌ Liquidation Failed: ${result.error}`;
}
