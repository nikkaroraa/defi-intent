/**
 * Katana Yield Hub - Configuration
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
// PROTOCOL CONTRACTS
// ===========================================

export const CONTRACTS = {
  // Morpho
  MORPHO: "0xd50f2dfffd62f94ee4aed9ca05c61d0753268abc" as Address,
  METAMORPHO_FACTORY: "0xd3f39505d0c48afed3549d625982fdc38ea9904b" as Address,

  // Sushi
  SUSHI_V2_FACTORY: "0x72d111b4d6f31b38919ae39779f570b747d6acd9" as Address,
  SUSHI_V3_FACTORY: "0x203e8740894c8955cb8950759876d7e7e45e04c1" as Address,

  // Multicall
  MULTICALL3: "0xcA11bde05977b3631167028862bE2a173976CA11" as Address,
} as const;

// ===========================================
// TOKENS
// ===========================================

export interface TokenInfo {
  address: Address;
  symbol: string;
  decimals: number;
  name: string;
}

export const TOKENS: Record<string, TokenInfo> = {
  ETH: { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", decimals: 18, name: "Ether" },
  WETH: { address: "0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62", symbol: "WETH", decimals: 18, name: "Wrapped ETH" },
  USDC: { address: "0x203a662b0bd271a6ed5a60edfbd04bfce608fd36", symbol: "USDC", decimals: 6, name: "USD Coin" },
  USDT: { address: "0x2dca96907fde857dd3d816880a0df407eeb2d2f2", symbol: "USDT", decimals: 6, name: "Tether" },
  WBTC: { address: "0x0913da6da4b42f538b445599b46bb4622342cf52", symbol: "WBTC", decimals: 8, name: "Wrapped BTC" },
  wstETH: { address: "0x7fb4d0f51544f24f385a421db6e7d4fc71ad8e5c", symbol: "wstETH", decimals: 18, name: "Wrapped stETH" },
  weETH: { address: "0x9893989433e7a383cb313953e4c2365107dc19a7", symbol: "weETH", decimals: 18, name: "Wrapped eETH" },
  AUSD: { address: "0x00000000efe302beaa2b3e6e1b18d08d69a9012a", symbol: "AUSD", decimals: 18, name: "Agora USD" },
};

// ===========================================
// YIELD TYPES
// ===========================================

export type Protocol = "morpho" | "yearn" | "spectra" | "sushi-lp";

export interface YieldOpportunity {
  id: string;
  protocol: Protocol;
  name: string;
  asset: string; // deposit token symbol
  assetAddress: Address;
  apy: number; // annual percentage yield (as decimal, e.g., 0.05 = 5%)
  tvl: bigint; // total value locked in wei
  contractAddress: Address;
  risk: "low" | "medium" | "high";
  description?: string;
  rewards?: string[]; // additional reward tokens
}

export interface DepositParams {
  opportunity: YieldOpportunity;
  amount: bigint;
  recipient: Address;
}
