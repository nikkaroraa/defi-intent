/**
 * Yearn Yield Adapter
 * Fetches vault yields from Yearn on Katana
 */

import { createPublicClient, http, type Address } from "viem";
import { katana, KATANA_RPC, TOKENS, type YieldOpportunity } from "../config.js";

// Known Yearn vaults on Katana (placeholder addresses - need real deployment)
const YEARN_VAULTS: {
  id: string;
  name: string;
  address: Address;
  asset: string;
  assetAddress: Address;
  estimatedApy: number;
  strategy: string;
}[] = [
  {
    id: "yearn-usdc",
    name: "Yearn USDC Vault",
    address: "0x0000000000000000000000000000000000000001" as Address, // TODO: real address
    asset: "USDC",
    assetAddress: TOKENS.USDC.address,
    estimatedApy: 0.062, // 6.2%
    strategy: "Multi-strategy USDC optimization",
  },
  {
    id: "yearn-weth",
    name: "Yearn WETH Vault",
    address: "0x0000000000000000000000000000000000000002" as Address, // TODO: real address
    asset: "WETH",
    assetAddress: TOKENS.WETH.address,
    estimatedApy: 0.035, // 3.5%
    strategy: "ETH staking + lending optimization",
  },
  {
    id: "yearn-wbtc",
    name: "Yearn WBTC Vault",
    address: "0x0000000000000000000000000000000000000003" as Address, // TODO: real address
    asset: "WBTC",
    assetAddress: TOKENS.WBTC.address,
    estimatedApy: 0.028, // 2.8%
    strategy: "BTC lending optimization",
  },
];

/**
 * Fetch Yearn vault yields
 */
export async function fetchYearnYields(): Promise<YieldOpportunity[]> {
  const opportunities: YieldOpportunity[] = [];

  for (const vault of YEARN_VAULTS) {
    // Skip placeholder vaults (address starts with 0x0000000000000000000000000000000000000)
    if (vault.address.startsWith("0x000000000000000000000000000000000000000")) {
      // Still include with a note that it's not yet deployed
      opportunities.push({
        id: vault.id,
        protocol: "yearn",
        name: vault.name,
        asset: vault.asset,
        assetAddress: vault.assetAddress,
        apy: vault.estimatedApy,
        tvl: 0n,
        contractAddress: vault.address,
        risk: "medium",
        description: `${vault.strategy} (Coming soon)`,
      });
      continue;
    }

    // In production, query real vault for APY
    opportunities.push({
      id: vault.id,
      protocol: "yearn",
      name: vault.name,
      asset: vault.asset,
      assetAddress: vault.assetAddress,
      apy: vault.estimatedApy,
      tvl: 0n,
      contractAddress: vault.address,
      risk: "medium",
      description: vault.strategy,
    });
  }

  return opportunities;
}

/**
 * Get best Yearn yield for an asset
 */
export async function getBestYearnYield(asset: string): Promise<YieldOpportunity | null> {
  const yields = await fetchYearnYields();
  const filtered = yields.filter((y) => y.asset.toUpperCase() === asset.toUpperCase());

  if (filtered.length === 0) return null;

  return filtered.reduce((best, current) => (current.apy > best.apy ? current : best));
}
