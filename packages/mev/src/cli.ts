#!/usr/bin/env tsx
/**
 * MEV Bot CLI
 * Scan, monitor, and execute MEV opportunities
 */

import {
  createClient,
  scanForArbitrage,
  formatOpportunity,
  getV2Pair,
  getV2Reserves,
  formatPoolState,
  type PoolState,
} from './arbitrage.js';
import {
  monitorBlocks,
  formatBackrunOpportunity,
  type BackrunOpportunity,
} from './backrun.js';
import {
  executeArbitrage,
  formatResult,
  DEFAULT_CONFIG,
} from './executor.js';
import { TOKENS, CHAIN, SUSHI_V2_FACTORY } from './config.js';
import { formatUnits } from 'viem';

// ===========================================
// CLI COMMANDS
// ===========================================

async function cmdHelp() {
  console.log('\n🤖 MEV Bot');
  console.log('='.repeat(50));
  console.log('\nCommands:');
  console.log('  scan       - Scan for arbitrage opportunities');
  console.log('  monitor    - Monitor blocks for backrun opportunities');
  console.log('  simulate   - Simulate an arbitrage execution');
  console.log('  pools      - List known pool states');
  console.log('  research   - Show research summary');
  console.log('  help       - Show this help');
  console.log('\nConfiguration:');
  console.log(`  Chain: ${CHAIN.name} (${CHAIN.id})`);
  console.log(`  RPC: ${CHAIN.rpc}`);
  console.log(`  Tokens: ${Object.keys(TOKENS).join(', ')}`);
}

async function cmdScan() {
  console.log('\n🔍 Scanning for arbitrage opportunities...');
  console.log('='.repeat(50));

  const client = createClient();
  const block = await client.getBlockNumber();
  console.log(`Current block: ${block}`);

  const opportunities = await scanForArbitrage(client);

  if (opportunities.length === 0) {
    console.log('\n✅ No arbitrage opportunities found');
    console.log('   Market is efficiently priced (for now)');
    return;
  }

  console.log(`\n🎯 Found ${opportunities.length} opportunities:\n`);
  for (const opp of opportunities) {
    console.log(formatOpportunity(opp));
    console.log('');
  }

  // Summary
  const totalProfit = opportunities.reduce((sum, o) => sum + o.netProfit, BigInt(0));
  console.log('─'.repeat(50));
  console.log(`Total potential profit: ${formatUnits(totalProfit, 18)} ETH`);
}

async function cmdMonitor() {
  console.log('\n👀 Starting MEV monitor...');
  console.log('Watching for large trades to backrun');
  console.log('Press Ctrl+C to stop\n');
  console.log('='.repeat(50));

  const client = createClient();

  // Get all pairs to monitor
  const pairs: `0x${string}`[] = [];
  const tokenList = Object.values(TOKENS);

  for (let i = 0; i < tokenList.length; i++) {
    for (let j = i + 1; j < tokenList.length; j++) {
      const pair = await getV2Pair(client, tokenList[i].address, tokenList[j].address);
      if (pair) {
        pairs.push(pair);
        console.log(`Monitoring: ${tokenList[i].symbol}/${tokenList[j].symbol}`);
      }
    }
  }

  console.log(`\nMonitoring ${pairs.length} pools...\n`);

  // Start monitoring
  const cleanup = await monitorBlocks(
    client,
    pairs,
    async (opp: BackrunOpportunity) => {
      console.log('\n' + '🚨'.repeat(25));
      console.log(formatBackrunOpportunity(opp));

      // Simulate execution
      const result = await executeArbitrage(client, null, opp.arbitrage, {
        ...DEFAULT_CONFIG,
        dryRun: true,
      });
      console.log(formatResult(result));
      console.log('🚨'.repeat(25) + '\n');
    },
    5000 // $5000 minimum trade size
  );

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\nStopping monitor...');
    cleanup();
    process.exit(0);
  });
}

async function cmdSimulate() {
  console.log('\n🧪 Simulating arbitrage execution...');
  console.log('='.repeat(50));

  const client = createClient();

  // Create a mock opportunity for testing
  const mockOpportunity = {
    id: 'test-arb',
    type: 'triangular' as const,
    path: ['WETH', 'USDC', 'WETH'],
    pools: [],
    inputToken: 'WETH',
    inputAmount: BigInt(10) ** BigInt(18), // 1 WETH
    outputAmount: BigInt(10) ** BigInt(18) + BigInt(10) ** BigInt(16), // 1.01 WETH
    profit: BigInt(10) ** BigInt(16), // 0.01 WETH
    profitPercent: 1.0,
    gasEstimate: BigInt(300000),
    netProfit: BigInt(5) * BigInt(10) ** BigInt(15), // 0.005 WETH after gas
  };

  console.log('\nMock Opportunity:');
  console.log(formatOpportunity(mockOpportunity));

  const result = await executeArbitrage(client, null, mockOpportunity, {
    ...DEFAULT_CONFIG,
    dryRun: true,
  });

  console.log('\nSimulation Result:');
  console.log(formatResult(result));
}

async function cmdPools() {
  console.log('\n📊 Fetching pool states...');
  console.log('='.repeat(50));

  const client = createClient();

  const tokenList = Object.values(TOKENS);
  const pools: PoolState[] = [];

  for (let i = 0; i < tokenList.length; i++) {
    for (let j = i + 1; j < tokenList.length; j++) {
      const pair = await getV2Pair(client, tokenList[i].address, tokenList[j].address);
      if (!pair) continue;

      const reserves = await getV2Reserves(client, pair);
      if (!reserves) continue;

      pools.push({
        address: pair,
        type: 'v2',
        token0: tokenList[i],
        token1: tokenList[j],
        reserve0: reserves.reserve0,
        reserve1: reserves.reserve1,
      });
    }
  }

  console.log(`\nFound ${pools.length} pools:\n`);
  for (const pool of pools) {
    console.log(formatPoolState(pool));
    console.log('');
  }
}

async function cmdResearch() {
  console.log('\n📚 MEV Research Summary');
  console.log('='.repeat(50));
  console.log(`
🎯 VIABLE STRATEGIES ON KATANA L2:

1. Cross-Pool Arbitrage ⭐ HIGH POTENTIAL
   - V2 vs V3 price differences
   - Different fee tiers in V3
   - Low competition (new L2)

2. Triangular Arbitrage ⭐ MEDIUM POTENTIAL
   - WETH → USDC → WBTC → WETH
   - More complex, higher gas
   - Larger opportunities

3. Backrunning ⭐ MEDIUM POTENTIAL
   - Follow large trades
   - No mempool needed
   - Block-based monitoring

❌ NOT VIABLE:

1. Sandwich Attacks
   - No public mempool
   - Sequencer-controlled ordering

2. JIT Liquidity
   - Requires mempool visibility
   - Not feasible without sequencer cooperation

💰 ESTIMATED OPPORTUNITY:
   - Daily MEV: $2,000 - $5,000
   - Scales with trading volume

⚙️ IMPLEMENTATION STATUS:
   ✅ Arbitrage scanner
   ✅ Backrun monitor
   ✅ Execution simulator
   ⬜ Flash loan executor (needs contract deployment)
   ⬜ Multi-hop optimization
   ⬜ Cross-L2 arbitrage
  `);
}

// ===========================================
// MAIN
// ===========================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'scan':
      await cmdScan();
      break;
    case 'monitor':
      await cmdMonitor();
      break;
    case 'simulate':
      await cmdSimulate();
      break;
    case 'pools':
      await cmdPools();
      break;
    case 'research':
      await cmdResearch();
      break;
    case 'help':
    default:
      await cmdHelp();
  }
}

main().catch(console.error);
