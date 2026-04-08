/**
 * Morpho Yield Adapter
 * Fetches lending yields from Morpho Blue markets via GraphQL API
 */

import { type Address } from "viem";
import { type YieldOpportunity } from "../config.js";

const MORPHO_API = "https://blue-api.morpho.org/graphql";

// Real Morpho Blue contract on Ethereum mainnet
export const MORPHO_BLUE_ADDRESS = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb" as Address;

interface MorphoMarketResponse {
  uniqueKey: string;
  loanAsset: {
    symbol: string;
    address: string;
    decimals: number;
  };
  collateralAsset: {
    symbol: string;
    address: string;
  } | null;
  state: {
    supplyApy: number;
    borrowApy: number;
    supplyAssetsUsd: number;
    borrowAssetsUsd: number;
    utilization: number;
  };
  lltv: string;
}

const MARKETS_QUERY = `
  query {
    markets(
      where: { chainId_in: [1, 8453] }
      orderBy: SupplyAssetsUsd
      first: 20
    ) {
      items {
        uniqueKey
        loanAsset {
          symbol
          address
          decimals
        }
        collateralAsset {
          symbol
          address
        }
        state {
          supplyApy
          borrowApy
          supplyAssetsUsd
          borrowAssetsUsd
          utilization
        }
        lltv
      }
    }
  }
`;

/**
 * Fetch Morpho lending yields from the Morpho Blue API
 */
export async function fetchMorphoYields(): Promise<YieldOpportunity[]> {
  try {
    const res = await fetch(MORPHO_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: MARKETS_QUERY }),
    });

    if (!res.ok) {
      console.error("Morpho API failed:", res.status);
      return [];
    }

    const data = await res.json();
    const markets: MorphoMarketResponse[] = data?.data?.markets?.items || [];

    return markets
      .filter((m) => m.state.supplyAssetsUsd > 100_000 && m.state.supplyApy > 0)
      .map((market): YieldOpportunity => {
        const collateral = market.collateralAsset?.symbol || "None";
        const lltv = parseFloat(market.lltv) / 1e18;

        return {
          id: `morpho-${market.uniqueKey.slice(0, 10)}`,
          protocol: "morpho",
          name: `${market.loanAsset.symbol}/${collateral}`,
          asset: market.loanAsset.symbol,
          assetAddress: market.loanAsset.address as Address,
          apy: market.state.supplyApy,
          tvl: BigInt(Math.round(market.state.supplyAssetsUsd)),
          contractAddress: MORPHO_BLUE_ADDRESS,
          risk: market.state.utilization > 0.9 ? "high" : market.state.utilization > 0.7 ? "medium" : "low",
          description: `Lend ${market.loanAsset.symbol} against ${collateral} (LLTV: ${(lltv * 100).toFixed(0)}%)`,
        };
      });
  } catch (err) {
    console.error("Morpho fetch error:", err);
    return [];
  }
}

/**
 * Get best Morpho yield for an asset
 */
export async function getBestMorphoYield(asset: string): Promise<YieldOpportunity | null> {
  const yields = await fetchMorphoYields();
  const filtered = yields.filter((y) => y.asset.toUpperCase() === asset.toUpperCase());

  if (filtered.length === 0) return null;

  return filtered.reduce((best, current) => (current.apy > best.apy ? current : best));
}
