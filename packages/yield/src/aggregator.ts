/**
 * Yield Aggregator - Unified interface for all yield sources
 */

import { type YieldOpportunity, type Protocol } from "./config.js";
import { fetchMorphoYields } from "./adapters/morpho.js";
import { fetchYearnYields } from "./adapters/yearn.js";
import { fetchSpectraYields } from "./adapters/spectra.js";
import { fetchSushiLPYields } from "./adapters/sushi-lp.js";

// ===========================================
// AGGREGATOR
// ===========================================

export interface AggregatorOptions {
  protocols?: Protocol[];
  minApy?: number;
  maxRisk?: "low" | "medium" | "high";
  asset?: string;
}

/**
 * Fetch all yield opportunities across protocols
 */
export async function fetchAllYields(options: AggregatorOptions = {}): Promise<YieldOpportunity[]> {
  const { protocols, minApy, maxRisk, asset } = options;

  // Determine which protocols to query
  const enabledProtocols: Protocol[] = protocols || ["morpho", "yearn", "spectra", "sushi-lp"];

  // Fetch from all enabled protocols in parallel
  const fetchers: Promise<YieldOpportunity[]>[] = [];

  if (enabledProtocols.includes("morpho")) {
    fetchers.push(fetchMorphoYields());
  }
  if (enabledProtocols.includes("yearn")) {
    fetchers.push(fetchYearnYields());
  }
  if (enabledProtocols.includes("spectra")) {
    fetchers.push(fetchSpectraYields());
  }
  if (enabledProtocols.includes("sushi-lp")) {
    fetchers.push(fetchSushiLPYields());
  }

  const results = await Promise.all(fetchers);
  let opportunities = results.flat();

  // Apply filters
  if (minApy !== undefined) {
    opportunities = opportunities.filter((y) => y.apy >= minApy);
  }

  if (maxRisk) {
    const riskOrder = { low: 1, medium: 2, high: 3 };
    const maxRiskLevel = riskOrder[maxRisk];
    opportunities = opportunities.filter((y) => riskOrder[y.risk] <= maxRiskLevel);
  }

  if (asset) {
    const assetUpper = asset.toUpperCase();
    opportunities = opportunities.filter(
      (y) =>
        y.asset.toUpperCase() === assetUpper ||
        y.asset.toUpperCase().includes(assetUpper)
    );
  }

  // Sort by APY descending
  opportunities.sort((a, b) => b.apy - a.apy);

  return opportunities;
}

/**
 * Get the single best yield opportunity for an asset
 */
export async function getBestYield(asset: string): Promise<YieldOpportunity | null> {
  const opportunities = await fetchAllYields({ asset });

  if (opportunities.length === 0) return null;

  return opportunities[0]; // Already sorted by APY
}

/**
 * Get top N yield opportunities for an asset
 */
export async function getTopYields(asset: string, n: number = 3): Promise<YieldOpportunity[]> {
  const opportunities = await fetchAllYields({ asset });

  return opportunities.slice(0, n);
}

/**
 * Get yield opportunities grouped by protocol
 */
export async function getYieldsByProtocol(): Promise<Record<Protocol, YieldOpportunity[]>> {
  const all = await fetchAllYields();

  const grouped: Record<Protocol, YieldOpportunity[]> = {
    morpho: [],
    yearn: [],
    spectra: [],
    "sushi-lp": [],
  };

  for (const opp of all) {
    grouped[opp.protocol].push(opp);
  }

  return grouped;
}

/**
 * Get yield opportunities for multiple assets (for portfolio)
 */
export async function getYieldsForAssets(assets: string[]): Promise<Record<string, YieldOpportunity[]>> {
  const all = await fetchAllYields();

  const result: Record<string, YieldOpportunity[]> = {};

  for (const asset of assets) {
    const assetUpper = asset.toUpperCase();
    result[asset] = all.filter(
      (y) =>
        y.asset.toUpperCase() === assetUpper ||
        y.asset.toUpperCase().includes(assetUpper)
    );
  }

  return result;
}
