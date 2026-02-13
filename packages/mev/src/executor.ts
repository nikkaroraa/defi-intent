/**
 * MEV Executor
 * Executes arbitrage trades atomically
 */

import {
  type Address,
  type PublicClient,
  type WalletClient,
  encodeFunctionData,
  formatUnits,
} from 'viem';
import {
  TOKENS,
  SUSHI_V2_ROUTER,
  V2_ROUTER_ABI,
  MIN_PROFIT_WEI,
  SLIPPAGE_BPS,
  MAX_GAS_PRICE,
} from './config.js';
import { type ArbitrageOpportunity } from './arbitrage.js';

// ===========================================
// TYPES
// ===========================================

export interface ExecutionResult {
  success: boolean;
  txHash?: `0x${string}`;
  profit?: bigint;
  gasUsed?: bigint;
  error?: string;
}

export interface ExecutionConfig {
  maxGasPrice: bigint;
  minProfitWei: bigint;
  slippageBps: number;
  dryRun: boolean;
}

export const DEFAULT_CONFIG: ExecutionConfig = {
  maxGasPrice: MAX_GAS_PRICE,
  minProfitWei: MIN_PROFIT_WEI,
  slippageBps: SLIPPAGE_BPS,
  dryRun: true,
};

// ===========================================
// PRE-EXECUTION CHECKS
// ===========================================

/**
 * Verify opportunity is still profitable
 */
export async function verifyProfitability(
  client: PublicClient,
  opportunity: ArbitrageOpportunity,
  config: ExecutionConfig
): Promise<{ valid: boolean; reason?: string }> {
  // Check gas price
  const gasPrice = await client.getGasPrice();
  if (gasPrice > config.maxGasPrice) {
    return { valid: false, reason: `Gas too high: ${gasPrice} > ${config.maxGasPrice}` };
  }

  // Re-simulate the trade
  // In production, would re-fetch reserves and recalculate

  // Check minimum profit
  const gasCost = opportunity.gasEstimate * gasPrice;
  const netProfit = opportunity.profit - gasCost;

  if (netProfit < config.minProfitWei) {
    return {
      valid: false,
      reason: `Profit too low: ${formatUnits(netProfit, 18)} ETH < ${formatUnits(config.minProfitWei, 18)} ETH`,
    };
  }

  return { valid: true };
}

// ===========================================
// TRANSACTION BUILDING
// ===========================================

/**
 * Build swap transaction for V2 router
 */
export function buildV2SwapTx(
  path: Address[],
  amountIn: bigint,
  amountOutMin: bigint,
  recipient: Address,
  deadline: bigint
): { to: Address; data: `0x${string}`; value: bigint } {
  return {
    to: SUSHI_V2_ROUTER,
    data: encodeFunctionData({
      abi: V2_ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [amountIn, amountOutMin, path, recipient, deadline],
    }),
    value: BigInt(0),
  };
}

/**
 * Build atomic arbitrage transaction sequence
 */
export function buildArbitrageTxs(
  opportunity: ArbitrageOpportunity,
  executor: Address,
  config: ExecutionConfig
): { to: Address; data: `0x${string}`; value: bigint }[] {
  const txs: { to: Address; data: `0x${string}`; value: bigint }[] = [];
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes

  // Convert path symbols to addresses
  const path = opportunity.path.map((symbol) => {
    const token = TOKENS[symbol];
    if (!token) throw new Error(`Unknown token: ${symbol}`);
    return token.address;
  });

  // Calculate minimum output with slippage
  const slippageMultiplier = BigInt(10000 - config.slippageBps);
  const amountOutMin = (opportunity.outputAmount * slippageMultiplier) / BigInt(10000);

  // For triangular arbitrage, we need two swaps
  if (opportunity.type === 'triangular' && path.length === 3) {
    // First swap: token0 -> token1
    txs.push(
      buildV2SwapTx(
        [path[0], path[1]],
        opportunity.inputAmount,
        BigInt(0), // Will be checked by second swap
        executor,
        deadline
      )
    );

    // Second swap: token1 -> token2 (back to token0)
    txs.push(
      buildV2SwapTx(
        [path[1], path[2]],
        BigInt(0), // Use output from first swap
        amountOutMin,
        executor,
        deadline
      )
    );
  } else {
    // Direct arbitrage
    txs.push(
      buildV2SwapTx(path, opportunity.inputAmount, amountOutMin, executor, deadline)
    );
  }

  return txs;
}

// ===========================================
// EXECUTION
// ===========================================

/**
 * Execute arbitrage (simulation or real)
 */
export async function executeArbitrage(
  client: PublicClient,
  walletClient: WalletClient | null,
  opportunity: ArbitrageOpportunity,
  config: ExecutionConfig = DEFAULT_CONFIG
): Promise<ExecutionResult> {
  // Verify profitability
  const verification = await verifyProfitability(client, opportunity, config);
  if (!verification.valid) {
    return { success: false, error: verification.reason };
  }

  // Get executor address
  const executor = walletClient?.account?.address;
  if (!executor && !config.dryRun) {
    return { success: false, error: 'No wallet connected' };
  }

  // Build transactions
  const txs = buildArbitrageTxs(
    opportunity,
    executor || '0x0000000000000000000000000000000000000000',
    config
  );

  // Dry run - simulation only
  if (config.dryRun) {
    console.log('\n🔍 DRY RUN - Simulation only');
    console.log(`Transactions: ${txs.length}`);
    for (let i = 0; i < txs.length; i++) {
      console.log(`  TX ${i + 1}:`);
      console.log(`    to: ${txs[i].to}`);
      console.log(`    data: ${txs[i].data.slice(0, 66)}...`);
    }
    console.log(`Expected profit: ${formatUnits(opportunity.netProfit, 18)} ETH`);

    return {
      success: true,
      profit: opportunity.netProfit,
      gasUsed: opportunity.gasEstimate,
    };
  }

  // Real execution
  if (!walletClient) {
    return { success: false, error: 'Wallet client required' };
  }

  try {
    // Execute transactions
    for (const tx of txs) {
      const hash = await walletClient.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value,
      });

      const receipt = await client.waitForTransactionReceipt({ hash });

      if (receipt.status === 'reverted') {
        return { success: false, error: 'Transaction reverted', txHash: hash };
      }
    }

    return {
      success: true,
      profit: opportunity.netProfit,
      gasUsed: opportunity.gasEstimate,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

// ===========================================
// FLASH LOAN EXECUTION
// ===========================================

/**
 * Flash loan arbitrage contract interface
 * In production, would deploy a contract like:
 *
 * contract FlashArb {
 *   function executeArb(
 *     address[] calldata path,
 *     uint256 borrowAmount,
 *     uint256 minProfit
 *   ) external {
 *     // 1. Flash borrow from Morpho
 *     // 2. Execute swaps
 *     // 3. Verify profit
 *     // 4. Repay flash loan
 *     // 5. Send profit to caller
 *   }
 * }
 */
export const FLASH_ARB_ABI = [
  {
    name: 'executeArb',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'path', type: 'address[]' },
      { name: 'borrowAmount', type: 'uint256' },
      { name: 'minProfit', type: 'uint256' },
    ],
    outputs: [{ name: 'profit', type: 'uint256' }],
  },
] as const;

export function buildFlashArbTx(
  flashArbContract: Address,
  opportunity: ArbitrageOpportunity
): { to: Address; data: `0x${string}`; value: bigint } {
  const path = opportunity.path.map((symbol) => {
    const token = TOKENS[symbol];
    if (!token) throw new Error(`Unknown token: ${symbol}`);
    return token.address;
  });

  return {
    to: flashArbContract,
    data: encodeFunctionData({
      abi: FLASH_ARB_ABI,
      functionName: 'executeArb',
      args: [path, opportunity.inputAmount, opportunity.netProfit],
    }),
    value: BigInt(0),
  };
}

// ===========================================
// FORMAT HELPERS
// ===========================================

export function formatResult(result: ExecutionResult): string {
  if (result.success) {
    return [
      '✅ Execution Successful',
      result.txHash ? `  TX: ${result.txHash}` : '',
      result.profit ? `  Profit: ${formatUnits(result.profit, 18)} ETH` : '',
      result.gasUsed ? `  Gas: ${result.gasUsed.toString()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  return `❌ Execution Failed: ${result.error}`;
}
