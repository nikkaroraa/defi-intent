/**
 * @katana-intent/yield
 * Unified yield aggregator for Katana L2
 */

// Config
export * from "./config.js";

// Adapters
export * from "./adapters/index.js";

// Aggregator
export {
  fetchAllYields,
  getBestYield,
  getTopYields,
  getYieldsByProtocol,
  getYieldsForAssets,
  type AggregatorOptions,
} from "./aggregator.js";

// Router
export {
  buildBestYieldRoute,
  buildSplitYieldRoute,
  formatRoute,
  type DepositRoute,
  type MultiDepositRoute,
  type EncodedCall,
} from "./router.js";

// Historical
export {
  fetchYieldsWithHistory,
  generateSimulatedHistory,
  generateRebalanceSuggestions,
  formatHistoricalAPY,
  formatRebalanceSuggestion,
  type HistoricalAPY,
  type YieldWithHistory,
  type RebalanceSuggestion,
} from "./historical.js";

// Rebalancer
export {
  fetchMultiChainYields,
  compareAssetYields,
  analyzePortfolio,
  rankYieldsGlobally,
  formatChainYields,
  formatMultiChainComparison,
  formatRankedYields,
  type ChainYields,
  type MultiChainComparison,
  type Portfolio,
  type PortfolioPosition,
  type RankedYield,
} from "./rebalancer.js";
