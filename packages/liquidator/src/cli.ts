#!/usr/bin/env tsx
/**
 * DeFi Intent Liquidation Bot CLI
 * Monitor and execute Morpho Blue liquidations
 */

import {
  createDeFi IntentClient,
  scanForLiquidatablePositions,
  getMarketState,
  formatOpportunity,
} from './scanner.js';
import {
  executeLiquidation,
  executeBatchLiquidations,
  formatResult,
  DEFAULT_CONFIG,
  type ExecutionConfig,
} from './executor.js';
import { MORPHO_BLUE, TOKENS } from './config.js';

// ===========================================
// SAMPLE MARKET IDS
// ===========================================

// These would be fetched from on-chain events in production
const SAMPLE_MARKETS: `0x${string}`[] = [
  // WETH/USDC market (example - need real market IDs)
  '0x0000000000000000000000000000000000000000000000000000000000000001',
  // WBTC/USDC market
  '0x0000000000000000000000000000000000000000000000000000000000000002',
];

// ===========================================
// CLI COMMANDS
// ===========================================

async function cmdInfo() {
  console.log('\n🔍 DeFi Intent Liquidation Bot');
  console.log('='.repeat(50));
  console.log(`Morpho Blue: ${MORPHO_BLUE}`);
  console.log('\nSupported Tokens:');
  for (const [symbol, token] of Object.entries(TOKENS)) {
    console.log(`  ${symbol}: ${token.address}`);
  }
  console.log('\nCommands:');
  console.log('  scan     - Scan for liquidatable positions');
  console.log('  monitor  - Continuously monitor for opportunities');
  console.log('  simulate - Simulate liquidation on test position');
  console.log('  help     - Show this help');
}

async function cmdScan() {
  console.log('\n🔍 Scanning for liquidatable positions...');
  console.log('='.repeat(50));

  const client = createDeFi IntentClient();

  // Get recent block
  const block = await client.getBlockNumber();
  console.log(`Current block: ${block}`);

  // Scan from recent blocks (last ~1000 blocks)
  const fromBlock = block > BigInt(1000) ? block - BigInt(1000) : BigInt(0);

  const opportunities = await scanForLiquidatablePositions(
    client,
    SAMPLE_MARKETS,
    fromBlock
  );

  if (opportunities.length === 0) {
    console.log('\n✅ No liquidatable positions found');
    return;
  }

  console.log(`\n🎯 Found ${opportunities.length} liquidation opportunities:\n`);
  for (const opp of opportunities) {
    console.log(formatOpportunity(opp));
    console.log('');
  }
}

async function cmdMonitor(intervalMs: number = 30000) {
  console.log('\n👀 Starting liquidation monitor...');
  console.log(`Checking every ${intervalMs / 1000}s`);
  console.log('Press Ctrl+C to stop\n');
  console.log('='.repeat(50));

  const client = createDeFi IntentClient();
  let lastBlock = BigInt(0);

  async function check() {
    try {
      const block = await client.getBlockNumber();
      if (block <= lastBlock) return;

      console.log(`\n[${new Date().toISOString()}] Block ${block}`);

      const opportunities = await scanForLiquidatablePositions(
        client,
        SAMPLE_MARKETS,
        lastBlock || block - BigInt(100)
      );

      if (opportunities.length > 0) {
        console.log(`\n🚨 ALERT: ${opportunities.length} liquidation opportunities!`);
        for (const opp of opportunities) {
          console.log(formatOpportunity(opp));

          // Simulate execution
          const result = await executeLiquidation(client, null, opp, {
            ...DEFAULT_CONFIG,
            dryRun: true,
          });
          console.log(formatResult(result));
        }
      } else {
        console.log('No liquidatable positions');
      }

      lastBlock = block;
    } catch (e) {
      console.error('Monitor error:', e);
    }
  }

  // Initial check
  await check();

  // Periodic checks
  setInterval(check, intervalMs);
}

async function cmdSimulate() {
  console.log('\n🧪 Simulating liquidation...');
  console.log('='.repeat(50));

  // Create a mock opportunity for testing
  const mockOpportunity = {
    position: {
      user: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      marketId: SAMPLE_MARKETS[0],
      marketParams: {
        loanToken: TOKENS.USDC.address,
        collateralToken: TOKENS.WETH.address,
        oracle: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        irm: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        lltv: BigInt(10) ** BigInt(18) * BigInt(86) / BigInt(100), // 86% LLTV
      },
      supplyShares: BigInt(0),
      borrowShares: BigInt(1000) * BigInt(10) ** BigInt(6), // 1000 USDC
      collateral: BigInt(10) ** BigInt(18), // 1 ETH
      borrowAmount: BigInt(2000) * BigInt(10) ** BigInt(6), // 2000 USDC debt
      collateralValue: BigInt(2500) * BigInt(10) ** BigInt(6), // ~$2500 collateral
      healthFactor: 0.95, // Underwater
      isLiquidatable: true,
    },
    market: {
      id: SAMPLE_MARKETS[0],
      params: {
        loanToken: TOKENS.USDC.address,
        collateralToken: TOKENS.WETH.address,
        oracle: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        irm: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        lltv: BigInt(10) ** BigInt(18) * BigInt(86) / BigInt(100),
      },
      totalSupplyAssets: BigInt(1000000) * BigInt(10) ** BigInt(6),
      totalSupplyShares: BigInt(1000000) * BigInt(10) ** BigInt(6),
      totalBorrowAssets: BigInt(500000) * BigInt(10) ** BigInt(6),
      totalBorrowShares: BigInt(500000) * BigInt(10) ** BigInt(6),
      price: BigInt(2500) * BigInt(10) ** BigInt(36) / BigInt(10) ** BigInt(18), // ETH = $2500
    },
    maxSeizableCollateral: BigInt(10) ** BigInt(18) / BigInt(2), // 0.5 ETH
    maxRepayableDebt: BigInt(1000) * BigInt(10) ** BigInt(6), // 1000 USDC
    estimatedProfitUsd: BigInt(50) * BigInt(10) ** BigInt(6), // $50 profit
    loanTokenSymbol: 'USDC',
    collateralTokenSymbol: 'WETH',
  };

  console.log('\nMock Position:');
  console.log(formatOpportunity(mockOpportunity));

  const client = createDeFi IntentClient();
  const result = await executeLiquidation(client, null, mockOpportunity, {
    ...DEFAULT_CONFIG,
    dryRun: true,
  });

  console.log('\nSimulation Result:');
  console.log(formatResult(result));
}

async function cmdMarkets() {
  console.log('\n📊 Fetching market states...');
  console.log('='.repeat(50));

  const client = createDeFi IntentClient();

  for (const marketId of SAMPLE_MARKETS) {
    const state = await getMarketState(client, marketId);
    if (state) {
      console.log(`\nMarket: ${marketId.slice(0, 18)}...`);
      console.log(`  Loan Token: ${state.params.loanToken}`);
      console.log(`  Collateral Token: ${state.params.collateralToken}`);
      console.log(`  LLTV: ${Number(state.params.lltv) / 1e18 * 100}%`);
      console.log(`  Total Supply: ${state.totalSupplyAssets.toString()}`);
      console.log(`  Total Borrow: ${state.totalBorrowAssets.toString()}`);
    }
  }
}

// ===========================================
// MAIN
// ===========================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'info':
    case 'help':
      await cmdInfo();
      break;
    case 'scan':
      await cmdScan();
      break;
    case 'monitor':
      const interval = parseInt(args[1] || '30000');
      await cmdMonitor(interval);
      break;
    case 'simulate':
      await cmdSimulate();
      break;
    case 'markets':
      await cmdMarkets();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      await cmdInfo();
  }
}

main().catch(console.error);
