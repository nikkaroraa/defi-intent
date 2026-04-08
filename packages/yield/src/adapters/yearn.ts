/**
 * Yearn Yield Adapter
 * Fetches vault yields from Yearn via yDaemon API
 */

import { type Address } from "viem";
import { type YieldOpportunity } from "../config.js";

interface YearnVaultResponse {
  address: string;
  name: string;
  symbol: string;
  token: {
    address: string;
    symbol: string;
    decimals: number;
  };
  apr: {
    netAPR: number;
    forwardAPR?: {
      netAPR: number;
    };
  };
  tvl: {
    totalAssets: string;
    tvl: number;
  };
  version: string;
  kind: string;
}

const YDAEMON_URLS = [
  { chainId: 1, name: "Ethereum", url: "https://ydaemon.yearn.fi/1/vaults/all" },
  { chainId: 8453, name: "Base", url: "https://ydaemon.yearn.fi/8453/vaults/all" },
];

/**
 * Fetch Yearn vault yields from yDaemon
 */
export async function fetchYearnYields(): Promise<YieldOpportunity[]> {
  const allYields: YieldOpportunity[] = [];

  const fetches = YDAEMON_URLS.map(async (chain) => {
    try {
      const res = await fetch(chain.url);
      if (!res.ok) {
        console.error(`Yearn yDaemon failed for ${chain.name}:`, res.status);
        return [];
      }

      const vaults: YearnVaultResponse[] = await res.json();

      return vaults
        .filter((v) => v.tvl.tvl > 50_000 && v.apr.netAPR > 0)
        .map((vault): YieldOpportunity => {
          const apy = vault.apr.forwardAPR?.netAPR || vault.apr.netAPR;

          return {
            id: `yearn-${vault.address.slice(0, 10)}-${chain.chainId}`,
            protocol: "yearn",
            name: vault.name || `Yearn ${vault.token.symbol}`,
            asset: vault.token.symbol,
            assetAddress: vault.token.address as Address,
            apy,
            tvl: BigInt(Math.round(vault.tvl.tvl)),
            contractAddress: vault.address as Address,
            risk: apy > 0.15 ? "high" : apy > 0.05 ? "medium" : "low",
            description: `Yearn ${vault.kind || "vault"} on ${chain.name} (v${vault.version})`,
          };
        });
    } catch (err) {
      console.error(`Yearn fetch error for ${chain.name}:`, err);
      return [];
    }
  });

  const results = await Promise.allSettled(fetches);
  for (const result of results) {
    if (result.status === "fulfilled") {
      allYields.push(...result.value);
    }
  }

  return allYields;
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
