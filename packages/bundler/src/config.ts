/**
 * Katana Bundler - Configuration
 */

import { type Address, type Chain } from "viem";

// ===========================================
// KATANA CHAIN
// ===========================================

export const katana: Chain = {
  id: 747474,
  name: "Katana",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["https://rpc.katana.network"] },
  },
  blockExplorers: {
    default: { name: "KatanaScan", url: "https://katanascan.com" },
  },
};

export const KATANA_RPC = process.env.KATANA_RPC_URL || "https://rpc.katana.network";

// ===========================================
// CORE CONTRACTS
// ===========================================

export const CONTRACTS = {
  // Multicall3 (standard deterministic address)
  MULTICALL3: "0xcA11bde05977b3631167028862bE2a173976CA11" as Address,

  // Permit2 (canonical address - verified deployed on Katana)
  PERMIT2: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address,

  // Sushi
  SUSHI_V2_ROUTER: "0x69cc349932ae18ed406eeb917d79b9b3033fb68e" as Address,
  SUSHI_V3_ROUTER: "0x4e1d81a3e627b9294532e990109e4c21d217376c" as Address,
  SUSHI_ROUTE_PROCESSOR: "0x3ced11c610556e5292fbc2e75d68c3899098c14c" as Address,

  // Morpho
  MORPHO: "0xd50f2dfffd62f94ee4aed9ca05c61d0753268abc" as Address,
  MORPHO_BUNDLER: "0xa8c5e23c9c0df2b6ff716486c6bbebb6661548c8" as Address,

  // Yearn (TODO: find vault addresses)
  // YEARN_USDC_VAULT: "0x..." as Address,

  // Bridge
  UNIFIED_BRIDGE: "0x2a3dd3eb832af982ec71669e178424b10dca2ede" as Address,
} as const;

// ===========================================
// TOKENS
// ===========================================

export interface TokenInfo {
  address: Address;
  symbol: string;
  decimals: number;
}

export const TOKENS: Record<string, TokenInfo> = {
  ETH: { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", decimals: 18 },
  WETH: { address: "0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62", symbol: "WETH", decimals: 18 },
  USDC: { address: "0x203a662b0bd271a6ed5a60edfbd04bfce608fd36", symbol: "USDC", decimals: 6 },
  USDT: { address: "0x2dca96907fde857dd3d816880a0df407eeb2d2f2", symbol: "USDT", decimals: 6 },
  WBTC: { address: "0x0913da6da4b42f538b445599b46bb4622342cf52", symbol: "WBTC", decimals: 8 },
  wstETH: { address: "0x7fb4d0f51544f24f385a421db6e7d4fc71ad8e5c", symbol: "wstETH", decimals: 18 },
};

export const WRAPPED_NATIVE = TOKENS.WETH.address;

// ===========================================
// ABIs
// ===========================================

export const MULTICALL3_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
        name: "calls",
        type: "tuple[]",
      },
    ],
    name: "aggregate3",
    outputs: [
      {
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
        name: "returnData",
        type: "tuple[]",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "getBlockNumber",
    outputs: [{ name: "blockNumber", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ERC20_ABI = [
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
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Sushi V2 Router
export const SUSHI_V2_ROUTER_ABI = [
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForTokens",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "swapExactETHForTokens",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

// Morpho Blue
export const MORPHO_ABI = [
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
      { name: "receiver", type: "address" },
    ],
    name: "withdraw",
    outputs: [
      { name: "assetsWithdrawn", type: "uint256" },
      { name: "sharesWithdrawn", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
