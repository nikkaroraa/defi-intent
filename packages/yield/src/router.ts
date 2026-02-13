/**
 * Best Yield Router - Routes deposits to optimal yield sources
 */

import {
  type Address,
  encodeFunctionData,
  parseUnits,
  maxUint256,
} from "viem";
import { type YieldOpportunity, CONTRACTS, TOKENS, type TokenInfo } from "./config.js";
import { getBestYield, getTopYields } from "./aggregator.js";

// ===========================================
// TYPES
// ===========================================

export interface DepositRoute {
  opportunity: YieldOpportunity;
  amountIn: bigint;
  calls: EncodedCall[];
}

export interface EncodedCall {
  target: Address;
  allowFailure: boolean;
  callData: `0x${string}`;
  value?: bigint;
  description: string;
}

export interface MultiDepositRoute {
  routes: DepositRoute[];
  totalAmount: bigint;
  weightedApy: number;
}

// ===========================================
// ABIs
// ===========================================

const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const MORPHO_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
        name: "marketParams",
        type: "tuple",
      },
      { name: "assets", type: "uint256" },
      { name: "shares", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "data", type: "bytes" },
    ],
    name: "supply",
    outputs: [
      { name: "assetsSupplied", type: "uint256" },
      { name: "sharesSupplied", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const YEARN_VAULT_ABI = [
  {
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "deposit",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// ===========================================
// ENCODER HELPERS
// ===========================================

function encodeApprove(token: Address, spender: Address, amount: bigint): EncodedCall {
  return {
    target: token,
    allowFailure: false,
    callData: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, amount],
    }),
    description: `Approve spending`,
  };
}

function encodeMorphoDeposit(
  loanToken: Address,
  collateralToken: Address,
  amount: bigint,
  onBehalf: Address
): EncodedCall {
  const marketParams = {
    loanToken,
    collateralToken,
    oracle: "0x0000000000000000000000000000000000000000" as Address,
    irm: "0x0000000000000000000000000000000000000000" as Address,
    lltv: 0n,
  };

  return {
    target: CONTRACTS.MORPHO,
    allowFailure: false,
    callData: encodeFunctionData({
      abi: MORPHO_ABI,
      functionName: "supply",
      args: [marketParams, amount, 0n, onBehalf, "0x"],
    }),
    description: `Supply to Morpho`,
  };
}

function encodeYearnDeposit(vault: Address, amount: bigint, receiver: Address): EncodedCall {
  return {
    target: vault,
    allowFailure: false,
    callData: encodeFunctionData({
      abi: YEARN_VAULT_ABI,
      functionName: "deposit",
      args: [amount, receiver],
    }),
    description: `Deposit to Yearn vault`,
  };
}

// ===========================================
// ROUTER
// ===========================================

/**
 * Build deposit route for best yield
 */
export async function buildBestYieldRoute(
  asset: string,
  amount: string,
  recipient: Address
): Promise<DepositRoute | null> {
  const best = await getBestYield(asset);
  if (!best) return null;

  const token = TOKENS[asset.toUpperCase()];
  if (!token) return null;

  const amountParsed = parseUnits(amount, token.decimals);
  const calls: EncodedCall[] = [];

  // Build protocol-specific deposit
  switch (best.protocol) {
    case "morpho":
      // Approve + Supply
      calls.push(encodeApprove(token.address, CONTRACTS.MORPHO, amountParsed));
      calls.push(
        encodeMorphoDeposit(
          token.address,
          TOKENS.WETH.address, // Default collateral
          amountParsed,
          recipient
        )
      );
      break;

    case "yearn":
      // Approve + Deposit
      calls.push(encodeApprove(token.address, best.contractAddress, amountParsed));
      calls.push(encodeYearnDeposit(best.contractAddress, amountParsed, recipient));
      break;

    case "spectra":
      // TODO: Implement Spectra PT purchase
      console.warn("Spectra deposits not yet implemented");
      break;

    case "sushi-lp":
      // TODO: Implement LP deposit (need to handle both tokens)
      console.warn("Sushi LP deposits not yet implemented");
      break;
  }

  return {
    opportunity: best,
    amountIn: amountParsed,
    calls,
  };
}

/**
 * Build split deposit across top yields
 */
export async function buildSplitYieldRoute(
  asset: string,
  amount: string,
  recipient: Address,
  splits: number = 2
): Promise<MultiDepositRoute | null> {
  const topYields = await getTopYields(asset, splits);
  if (topYields.length === 0) return null;

  const token = TOKENS[asset.toUpperCase()];
  if (!token) return null;

  const totalAmount = parseUnits(amount, token.decimals);
  const splitAmount = totalAmount / BigInt(topYields.length);

  const routes: DepositRoute[] = [];
  let totalApy = 0;

  for (const opp of topYields) {
    const calls: EncodedCall[] = [];

    switch (opp.protocol) {
      case "morpho":
        calls.push(encodeApprove(token.address, CONTRACTS.MORPHO, splitAmount));
        calls.push(
          encodeMorphoDeposit(token.address, TOKENS.WETH.address, splitAmount, recipient)
        );
        break;

      case "yearn":
        calls.push(encodeApprove(token.address, opp.contractAddress, splitAmount));
        calls.push(encodeYearnDeposit(opp.contractAddress, splitAmount, recipient));
        break;

      default:
        continue; // Skip unimplemented protocols
    }

    if (calls.length > 0) {
      routes.push({
        opportunity: opp,
        amountIn: splitAmount,
        calls,
      });
      totalApy += opp.apy;
    }
  }

  const weightedApy = routes.length > 0 ? totalApy / routes.length : 0;

  return {
    routes,
    totalAmount,
    weightedApy,
  };
}

/**
 * Format deposit route for display
 */
export function formatRoute(route: DepositRoute, token: TokenInfo): string {
  const amount = Number(route.amountIn) / 10 ** token.decimals;
  return `${route.opportunity.protocol.toUpperCase()}: ${amount} ${token.symbol} @ ${(route.opportunity.apy * 100).toFixed(2)}% APY`;
}
