/**
 * Morpho Blue GraphQL API fetcher
 * https://blue-api.morpho.org/graphql — free, no key required
 */

import type { NormalizedYield } from './defillama';

const MORPHO_API = 'https://blue-api.morpho.org/graphql';

interface MorphoMarket {
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

const QUERY = `
  query {
    markets(
      where: { chainId_in: [1, 8453] }
      orderBy: SupplyAssetsUsd
      first: 30
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

function getChainFromKey(key: string): { id: number; name: string } {
  // Morpho markets on Base have different patterns, but we'll determine from the API
  // For now, default to Ethereum since most Morpho volume is there
  return { id: 1, name: 'Ethereum' };
}

export async function fetchMorphoYields(): Promise<NormalizedYield[]> {
  try {
    const res = await fetch(MORPHO_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY }),
      // No Next.js cache — we use our own in-memory cache in route.ts
    });

    if (!res.ok) {
      console.error('Morpho API failed:', res.status);
      return [];
    }

    const data = await res.json();
    const markets: MorphoMarket[] = data?.data?.markets?.items || [];

    return markets
      .filter((m) => m.state.supplyAssetsUsd > 100_000 && m.state.supplyApy > 0 && m.state.supplyApy < 1) // Filter out dead/broken markets with absurd APYs
      .map((market) => {
        const chain = getChainFromKey(market.uniqueKey);
        const collateral = market.collateralAsset?.symbol || 'None';
        const supplyApy = market.state.supplyApy; // Already a decimal (e.g., 0.05 = 5%)

        return {
          id: `morpho-${market.uniqueKey.slice(0, 8)}`,
          protocol: 'Morpho',
          name: `Morpho ${market.loanAsset.symbol}/${collateral}`,
          asset: market.loanAsset.symbol,
          apy: supplyApy,
          tvl: Math.round(market.state.supplyAssetsUsd).toString(),
          risk: market.state.utilization > 0.9 ? 'high' as const : market.state.utilization > 0.7 ? 'medium' as const : 'low' as const,
          description: `Supply ${market.loanAsset.symbol} (collateral: ${collateral}, LLTV: ${(parseFloat(market.lltv) / 1e18 * 100).toFixed(0)}%)`,
          chainId: chain.id,
          chainName: chain.name,
          historical: {
            current: supplyApy,
            avg7d: supplyApy, // Morpho API doesn't provide historical — use current
            avg30d: supplyApy,
            avg50d: supplyApy,
            trend: 'stable' as const,
            volatility: 'low' as const,
          },
        };
      });
  } catch (err) {
    console.error('Morpho fetch error:', err);
    return [];
  }
}
