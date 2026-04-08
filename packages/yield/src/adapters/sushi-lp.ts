/**
 * Sushi LP Yield Adapter
 * Fetches LP yields from Sushi V2/V3 across chains
 */

import { createPublicClient, http, type Address, formatUnits } from "viem";
import { l2Chain, L2_RPC, CONTRACTS, TOKENS, type YieldOpportunity } from "../config.js";

// V2 Pair ABI (minimal)
const PAIR_ABI = [
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Known Sushi LP pools across chains
const SUSHI_POOLS: {
  id: string;
  name: string;
  pairAddress: Address;
  token0: string;
  token1: string;
  version: "v2" | "v3";
  fee?: number; // for v3
  estimatedApy: number; // from trading fees
}[] = [
  {
    id: "sushi-weth-usdc-v2",
    name: "WETH/USDC LP (V2)",
    pairAddress: "0xf9B1AE5F1929F9A4De548e98e0393ae1A9d1D0f8" as Address,
    token0: "WETH",
    token1: "USDC",
    version: "v2",
    estimatedApy: 0.082, // 8.2% from fees
  },
  {
    id: "sushi-weth-usdc-v3-005",
    name: "WETH/USDC LP (V3 0.05%)",
    pairAddress: "0x2A2C512beAA8eB15495726C235472D82EFFB7A6B" as Address,
    token0: "WETH",
    token1: "USDC",
    version: "v3",
    fee: 500,
    estimatedApy: 0.125, // 12.5% from fees (concentrated liquidity)
  },
  {
    id: "sushi-wbtc-usdc-v2",
    name: "WBTC/USDC LP (V2)",
    pairAddress: "0x0000000000000000000000000000000000000020" as Address, // TODO: real address
    token0: "WBTC",
    token1: "USDC",
    version: "v2",
    estimatedApy: 0.065, // 6.5%
  },
];

/**
 * Fetch Sushi LP yields
 */
export async function fetchSushiLPYields(): Promise<YieldOpportunity[]> {
  const client = createPublicClient({
    chain: l2Chain,
    transport: http(L2_RPC),
  });

  const opportunities: YieldOpportunity[] = [];

  for (const pool of SUSHI_POOLS) {
    let tvl = 0n;

    // Try to get real TVL for non-placeholder pools
    if (!pool.pairAddress.startsWith("0x000000000000000000000000000000000000002")) {
      try {
        const reserves = await client.readContract({
          address: pool.pairAddress,
          abi: PAIR_ABI,
          functionName: "getReserves",
        });
        // Simplified TVL calculation (just reserves, not USD value)
        tvl = reserves[0] + reserves[1];
      } catch {
        // Pool might not exist yet
      }
    }

    const feeStr = pool.fee ? ` ${pool.fee / 10000}%` : "";

    opportunities.push({
      id: pool.id,
      protocol: "sushi-lp",
      name: pool.name,
      asset: `${pool.token0}/${pool.token1}`,
      assetAddress: pool.pairAddress,
      apy: pool.estimatedApy,
      tvl,
      contractAddress: pool.pairAddress,
      risk: pool.version === "v3" ? "high" : "medium", // V3 has IL risk with concentration
      description: `Provide liquidity to ${pool.token0}/${pool.token1}${feeStr} pool. Earn trading fees.`,
      rewards: ["SUSHI"], // Potential farm rewards
    });
  }

  return opportunities;
}

/**
 * Get best Sushi LP yield for an asset
 */
export async function getBestSushiLPYield(asset: string): Promise<YieldOpportunity | null> {
  const yields = await fetchSushiLPYields();
  // For LP, check if asset is in the pair
  const filtered = yields.filter((y) => y.asset.toUpperCase().includes(asset.toUpperCase()));

  if (filtered.length === 0) return null;

  return filtered.reduce((best, current) => (current.apy > best.apy ? current : best));
}
