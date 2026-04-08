import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { fetchDefiLlamaYields, type NormalizedYield } from './lib/defillama';
import { fetchMorphoYields } from './lib/morpho';
import { fetchYearnYields } from './lib/yearn';

// Simple in-memory cache with TTL
let cache: { data: NormalizedYield[]; timestamp: number } | null = null;
const CACHE_TTL = 60_000; // 60 seconds

async function getAllYields(): Promise<NormalizedYield[]> {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  // Fetch from all sources in parallel
  const [defiLlamaResult, morphoResult, yearnResult] = await Promise.allSettled([
    fetchDefiLlamaYields(),
    fetchMorphoYields(),
    fetchYearnYields(),
  ]);

  const defiLlama = defiLlamaResult.status === 'fulfilled' ? defiLlamaResult.value : [];
  const morpho = morphoResult.status === 'fulfilled' ? morphoResult.value : [];
  const yearn = yearnResult.status === 'fulfilled' ? yearnResult.value : [];

  // Merge and deduplicate — prefer Morpho/Yearn direct APIs over DeFi Llama for those protocols
  const directProtocols = new Set<string>();

  // Track which protocols we got direct data for
  if (morpho.length > 0) directProtocols.add('Morpho');
  if (yearn.length > 0) directProtocols.add('Yearn');

  // Filter DeFi Llama results to avoid duplicates with direct API data
  const filteredDeFiLlama = defiLlama.filter(
    (y) => !directProtocols.has(y.protocol)
  );

  const allYields = [...filteredDeFiLlama, ...morpho, ...yearn];

  // Sort by APY descending
  allYields.sort((a, b) => b.apy - a.apy);

  cache = { data: allYields, timestamp: now };
  return allYields;
}

function jsonCached(data: any, maxAge = 60) {
  return NextResponse.json(data, {
    headers: { 'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}` },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId');
    const asset = searchParams.get('asset');
    const type = searchParams.get('type');

    let yields = await getAllYields();

    // Return Spectra-style fixed vs variable comparisons
    // Build from real data by finding matching protocols
    if (type === 'comparison') {
      const stableYields = yields.filter(
        (y) => ['USDC', 'USDT', 'DAI'].includes(y.asset)
      );
      const comparisons = buildComparisons(stableYields, asset || undefined);
      return jsonCached({ comparisons });
    }

    // Filter by type
    if (type === 'fixed') {
      yields = yields.filter((y) => y.isFixed);
      return jsonCached({ yields });
    }

    if (type === 'variable') {
      yields = yields.filter((y) => !y.isFixed && !y.isYieldToken);
      return jsonCached({ yields });
    }

    // Apply filters
    if (chainId) {
      yields = yields.filter((y) => y.chainId === parseInt(chainId));
    }

    if (asset) {
      yields = yields.filter(
        (y) =>
          y.asset.toUpperCase().includes(asset.toUpperCase()) ||
          y.asset.toUpperCase() === asset.toUpperCase()
      );
    }

    // Sort by 30d average APY (sustained yield)
    yields.sort((a, b) => b.historical.avg30d - a.historical.avg30d);

    return jsonCached({ yields });
  } catch (error) {
    console.error('Yields API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch yields', yields: [] },
      { status: 500 }
    );
  }
}

/**
 * Build fixed vs variable comparisons from real yield data.
 * Groups by asset and compares the highest fixed-rate protocol
 * against the highest variable-rate protocol.
 */
function buildComparisons(yields: NormalizedYield[], filterAsset?: string) {
  const assetGroups = new Map<string, NormalizedYield[]>();

  for (const y of yields) {
    const key = y.asset.toUpperCase();
    if (!assetGroups.has(key)) assetGroups.set(key, []);
    assetGroups.get(key)!.push(y);
  }

  const comparisons = [];
  const entries = Array.from(assetGroups.entries());
  for (const [asset, group] of entries) {
    if (filterAsset && asset !== filterAsset.toUpperCase()) continue;
    if (group.length < 2) continue;

    // Sort by APY descending
    group.sort((a: NormalizedYield, b: NormalizedYield) => b.apy - a.apy);
    const best = group[0];
    const second = group[1];

    comparisons.push({
      asset,
      fixedAPY: best.apy,
      variableAPY: second.apy,
      bestProtocol: best.protocol,
      secondProtocol: second.protocol,
      recommendation: best.apy > second.apy * 1.1 ? 'fixed' : 'variable',
      reason: `${best.protocol} (${(best.apy * 100).toFixed(1)}%) vs ${second.protocol} (${(second.apy * 100).toFixed(1)}%)`,
    });
  }

  return comparisons;
}
