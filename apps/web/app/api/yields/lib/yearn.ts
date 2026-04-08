/**
 * Yearn yDaemon API fetcher
 * https://ydaemon.yearn.fi — free, no key required
 */

import type { NormalizedYield } from './defillama';

interface YearnVault {
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
  category: string;
}

const CHAIN_CONFIGS = [
  { chainId: 1, name: 'Ethereum', url: 'https://ydaemon.yearn.fi/1/vaults/all' },
  { chainId: 8453, name: 'Base', url: 'https://ydaemon.yearn.fi/8453/vaults/all' },
];

export async function fetchYearnYields(): Promise<NormalizedYield[]> {
  const results: NormalizedYield[] = [];

  const fetches = CHAIN_CONFIGS.map(async (chain) => {
    try {
      const res = await fetch(chain.url);

      if (!res.ok) {
        console.error(`Yearn API failed for chain ${chain.chainId}:`, res.status);
        return [];
      }

      const vaults: YearnVault[] = await res.json();

      return vaults
        .filter((v) => v.tvl.tvl > 50_000 && v.apr.netAPR > 0)
        .map((vault): NormalizedYield => {
          const apy = vault.apr.forwardAPR?.netAPR || vault.apr.netAPR;

          return {
            id: `yearn-${vault.address.slice(0, 8)}-${chain.chainId}`,
            protocol: 'Yearn',
            name: vault.name || `Yearn ${vault.token.symbol}`,
            asset: vault.token.symbol,
            apy,
            tvl: Math.round(vault.tvl.tvl).toString(),
            risk: apy > 0.15 ? 'high' : apy > 0.05 ? 'medium' : 'low',
            description: `Yearn ${vault.kind || 'vault'} on ${chain.name} (v${vault.version})`,
            chainId: chain.chainId,
            chainName: chain.name,
            historical: {
              current: apy,
              avg7d: apy,
              avg30d: apy,
              avg50d: apy,
              trend: 'stable',
              volatility: 'low',
            },
          };
        });
    } catch (err) {
      console.error(`Yearn fetch error for chain ${chain.chainId}:`, err);
      return [];
    }
  });

  const chainResults = await Promise.allSettled(fetches);
  for (const result of chainResults) {
    if (result.status === 'fulfilled') {
      results.push(...result.value);
    }
  }

  return results;
}
