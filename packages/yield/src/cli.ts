#!/usr/bin/env npx tsx
/**
 * Katana Yield CLI
 * Unified yield aggregator commands
 */

import { formatUnits, type Address } from "viem";
import { TOKENS, type YieldOpportunity, type Protocol } from "./config.js";
import { fetchAllYields, getBestYield, getTopYields, getYieldsByProtocol } from "./aggregator.js";
import { buildBestYieldRoute, buildSplitYieldRoute, formatRoute } from "./router.js";

// Colors
const GREEN = "\x1b[0;32m";
const YELLOW = "\x1b[1;33m";
const BLUE = "\x1b[0;34m";
const CYAN = "\x1b[0;36m";
const RED = "\x1b[0;31m";
const NC = "\x1b[0m";
const BOLD = "\x1b[1m";

// ===========================================
// HELPERS
// ===========================================

function formatApy(apy: number): string {
  return `${(apy * 100).toFixed(2)}%`;
}

function formatRisk(risk: string): string {
  switch (risk) {
    case "low":
      return `${GREEN}Low${NC}`;
    case "medium":
      return `${YELLOW}Medium${NC}`;
    case "high":
      return `${RED}High${NC}`;
    default:
      return risk;
  }
}

function formatProtocol(protocol: Protocol): string {
  const colors: Record<Protocol, string> = {
    morpho: BLUE,
    yearn: GREEN,
    spectra: CYAN,
    "sushi-lp": YELLOW,
  };
  return `${colors[protocol]}${protocol.toUpperCase()}${NC}`;
}

function printOpp(opp: YieldOpportunity, index?: number) {
  const prefix = index !== undefined ? `${index + 1}. ` : "";
  console.log(
    `${prefix}${formatProtocol(opp.protocol)} | ${opp.asset.padEnd(12)} | ${GREEN}${formatApy(opp.apy).padStart(7)}${NC} | ${formatRisk(opp.risk).padEnd(18)} | ${opp.name}`
  );
  if (opp.description) {
    console.log(`   ${opp.description}`);
  }
}

function printHelp() {
  console.log(`
${BOLD}Katana Yield CLI${NC}
Unified yield aggregator for Katana L2

${BOLD}Usage:${NC}
  npx tsx src/cli.ts <command> [options]

${BOLD}Commands:${NC}
  list                          List all yield opportunities
  list --protocol <name>        Filter by protocol (morpho, yearn, spectra, sushi-lp)
  list --min-apy <percent>      Filter by minimum APY (e.g., 5 for 5%)
  
  best <asset>                  Get best yield for an asset
  top <asset> [n]               Get top N yields for an asset (default: 3)
  
  deposit <asset> <amount>      Build deposit route to best yield
  split <asset> <amount> [n]    Build split deposit across top N yields

${BOLD}Examples:${NC}
  npx tsx src/cli.ts list
  npx tsx src/cli.ts list --protocol morpho
  npx tsx src/cli.ts list --min-apy 5
  npx tsx src/cli.ts best USDC
  npx tsx src/cli.ts top WETH 5
  npx tsx src/cli.ts deposit USDC 1000
  npx tsx src/cli.ts split USDC 1000 3
`);
}

// ===========================================
// COMMANDS
// ===========================================

async function cmdList(args: string[]) {
  let protocol: Protocol | undefined;
  let minApy: number | undefined;

  // Parse flags
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--protocol" && args[i + 1]) {
      protocol = args[i + 1] as Protocol;
      i++;
    } else if (args[i] === "--min-apy" && args[i + 1]) {
      minApy = parseFloat(args[i + 1]) / 100; // Convert percent to decimal
      i++;
    }
  }

  console.log(`\n${BOLD}${CYAN}⚔️ Katana Yield Hub${NC}\n`);

  const protocols = protocol ? [protocol] : undefined;
  const yields = await fetchAllYields({ protocols, minApy });

  if (yields.length === 0) {
    console.log(`${YELLOW}No yields found matching criteria${NC}`);
    return;
  }

  console.log(`${BOLD}Protocol     | Asset        | APY     | Risk       | Name${NC}`);
  console.log(`${"─".repeat(80)}`);

  for (const opp of yields) {
    printOpp(opp);
  }

  console.log(`\n${yields.length} opportunities found`);
}

async function cmdBest(asset: string) {
  console.log(`\n${BOLD}Best yield for ${asset}...${NC}\n`);

  const best = await getBestYield(asset);

  if (!best) {
    console.log(`${YELLOW}No yields found for ${asset}${NC}`);
    return;
  }

  console.log(`${GREEN}${BOLD}Best Yield:${NC}`);
  printOpp(best);
}

async function cmdTop(asset: string, n: number = 3) {
  console.log(`\n${BOLD}Top ${n} yields for ${asset}...${NC}\n`);

  const top = await getTopYields(asset, n);

  if (top.length === 0) {
    console.log(`${YELLOW}No yields found for ${asset}${NC}`);
    return;
  }

  console.log(`${BOLD}Protocol     | Asset        | APY     | Risk       | Name${NC}`);
  console.log(`${"─".repeat(80)}`);

  for (let i = 0; i < top.length; i++) {
    printOpp(top[i], i);
  }
}

async function cmdDeposit(asset: string, amount: string) {
  console.log(`\n${BOLD}Building deposit route for ${amount} ${asset}...${NC}\n`);

  // Use a placeholder wallet for demo
  const wallet = "0x1234567890123456789012345678901234567890" as Address;

  const route = await buildBestYieldRoute(asset, amount, wallet);

  if (!route) {
    console.log(`${YELLOW}No deposit route found for ${asset}${NC}`);
    return;
  }

  const token = TOKENS[asset.toUpperCase()];
  if (!token) {
    console.log(`${RED}Unknown token: ${asset}${NC}`);
    return;
  }

  console.log(`${GREEN}${BOLD}Deposit Route:${NC}`);
  console.log(`  ${formatRoute(route, token)}`);
  console.log(`\n${CYAN}Transaction Steps:${NC}`);

  for (let i = 0; i < route.calls.length; i++) {
    console.log(`  ${i + 1}. ${route.calls[i].description} → ${route.calls[i].target.slice(0, 10)}...`);
  }

  console.log(`\n${YELLOW}Note: Use buildBestYieldRoute() to get encoded calldata for execution${NC}`);
}

async function cmdSplit(asset: string, amount: string, n: number = 2) {
  console.log(`\n${BOLD}Building split deposit for ${amount} ${asset} across ${n} protocols...${NC}\n`);

  const wallet = "0x1234567890123456789012345678901234567890" as Address;

  const multiRoute = await buildSplitYieldRoute(asset, amount, wallet, n);

  if (!multiRoute || multiRoute.routes.length === 0) {
    console.log(`${YELLOW}No split route found for ${asset}${NC}`);
    return;
  }

  const token = TOKENS[asset.toUpperCase()];
  if (!token) {
    console.log(`${RED}Unknown token: ${asset}${NC}`);
    return;
  }

  console.log(`${GREEN}${BOLD}Split Deposit Route:${NC}`);
  console.log(`  Weighted APY: ${GREEN}${formatApy(multiRoute.weightedApy)}${NC}`);
  console.log(`  Routes: ${multiRoute.routes.length}`);

  console.log(`\n${CYAN}Breakdown:${NC}`);
  for (const route of multiRoute.routes) {
    console.log(`  • ${formatRoute(route, token)}`);
  }
}

// ===========================================
// MAIN
// ===========================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "help" || args[0] === "--help") {
    printHelp();
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case "list":
        await cmdList(args.slice(1));
        break;

      case "best":
        if (!args[1]) {
          console.error("Usage: best <asset>");
          return;
        }
        await cmdBest(args[1]);
        break;

      case "top":
        if (!args[1]) {
          console.error("Usage: top <asset> [n]");
          return;
        }
        await cmdTop(args[1], parseInt(args[2]) || 3);
        break;

      case "deposit":
        if (!args[1] || !args[2]) {
          console.error("Usage: deposit <asset> <amount>");
          return;
        }
        await cmdDeposit(args[1], args[2]);
        break;

      case "split":
        if (!args[1] || !args[2]) {
          console.error("Usage: split <asset> <amount> [n]");
          return;
        }
        await cmdSplit(args[1], args[2], parseInt(args[3]) || 2);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
    }
  } catch (e: any) {
    console.error(`${RED}Error:${NC}`, e.message);
  }
}

main();
