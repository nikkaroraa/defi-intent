#!/usr/bin/env tsx
/**
 * Hyperliquid CLI
 * Query vaults, yields, and positions
 */

import { createHyperliquidClient } from './client.js';
import {
  getHyperliquidYields,
  getUserVaultPositions,
  compareYields,
  getHLPInfo,
  formatVaultYield,
  formatYieldComparison,
  formatHLPInfo,
} from './vaults.js';
import { HYPERLIQUID_API } from './config.js';

// ===========================================
// CLI COMMANDS
// ===========================================

async function cmdHelp() {
  console.log(`
🌊 Hyperliquid CLI
═══════════════════════════════════════

Commands:
  yields              - List all yield opportunities
  hlp                 - Show HLP (protocol vault) info
  compare <asset>     - Compare yields with other protocols
  positions <address> - Show user's vault positions
  lending             - Show lending/borrowing rates
  mids                - Get all mid prices
  help                - Show this help

API Endpoints:
  Mainnet: ${HYPERLIQUID_API.mainnet}
  Testnet: ${HYPERLIQUID_API.testnet}
  `);
}

async function cmdYields() {
  console.log('\n📊 Fetching Hyperliquid yield opportunities...\n');

  const yields = await getHyperliquidYields();

  if (yields.length === 0) {
    console.log('No yield opportunities found');
    return;
  }

  console.log(`Found ${yields.length} opportunities:\n`);
  for (const y of yields) {
    console.log(formatVaultYield(y));
    console.log('');
  }
}

async function cmdHLP() {
  console.log('\n🏦 Fetching HLP info...');

  const hlp = await getHLPInfo();
  console.log(formatHLPInfo(hlp));
}

async function cmdCompare(asset: string) {
  if (!asset) {
    console.log('Usage: compare <asset>');
    console.log('Example: compare USDC');
    return;
  }

  console.log(`\n📊 Comparing ${asset} yields...`);

  const comparison = await compareYields(asset);
  console.log(formatYieldComparison(comparison));
}

async function cmdPositions(userAddress: string) {
  if (!userAddress) {
    console.log('Usage: positions <address>');
    console.log('Example: positions 0x...');
    return;
  }

  console.log(`\n👤 Fetching positions for ${userAddress.slice(0, 10)}...`);

  const positions = await getUserVaultPositions(userAddress);

  if (positions.length === 0) {
    console.log('No vault positions found');
    return;
  }

  console.log(`\nFound ${positions.length} positions:\n`);
  for (const pos of positions) {
    console.log(`${pos.vaultName}`);
    console.log(`  Equity: $${pos.equity.toLocaleString()}`);
    console.log(`  All-Time PnL: $${pos.allTimePnl.toLocaleString()}`);
    console.log(`  Current APY: ${pos.currentApy.toFixed(2)}%`);
    console.log('');
  }
}

async function cmdLending() {
  console.log('\n💰 Fetching lending/borrowing rates...\n');

  const client = createHyperliquidClient();

  try {
    const reserves = await client.getAllBorrowLendReserveStates();

    console.log('Token        | Supply APY | Borrow APY | Utilization');
    console.log('─'.repeat(55));

    for (const r of reserves) {
      const supplyApy = (r.supplyApy * 100).toFixed(2).padStart(9);
      const borrowApy = (r.borrowApy * 100).toFixed(2).padStart(9);
      const util = (r.utilizationRate * 100).toFixed(1).padStart(10);
      console.log(
        `${r.tokenName.padEnd(12)} | ${supplyApy}% | ${borrowApy}% | ${util}%`
      );
    }
  } catch (e) {
    console.error('Failed to fetch lending rates:', e);
  }
}

async function cmdMids() {
  console.log('\n📈 Fetching mid prices...\n');

  const client = createHyperliquidClient();

  try {
    const mids = await client.getAllMids();

    const entries = Object.entries(mids).sort((a, b) => a[0].localeCompare(b[0]));

    console.log('Asset        | Mid Price');
    console.log('─'.repeat(35));

    for (const [asset, price] of entries.slice(0, 20)) {
      console.log(`${asset.padEnd(12)} | $${parseFloat(price).toLocaleString()}`);
    }

    if (entries.length > 20) {
      console.log(`\n... and ${entries.length - 20} more assets`);
    }
  } catch (e) {
    console.error('Failed to fetch mids:', e);
  }
}

// ===========================================
// MAIN
// ===========================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'yields':
      await cmdYields();
      break;
    case 'hlp':
      await cmdHLP();
      break;
    case 'compare':
      await cmdCompare(args[1]);
      break;
    case 'positions':
      await cmdPositions(args[1]);
      break;
    case 'lending':
      await cmdLending();
      break;
    case 'mids':
      await cmdMids();
      break;
    case 'help':
    default:
      await cmdHelp();
  }
}

main().catch(console.error);
