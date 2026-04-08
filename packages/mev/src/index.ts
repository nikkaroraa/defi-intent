/**
 * Katana MEV Bot
 * Detect and execute MEV opportunities on Katana L2
 */

// Config
export {
  CHAIN,
  TOKENS,
  SUSHI_V2_FACTORY,
  SUSHI_V2_ROUTER,
  SUSHI_V3_FACTORY,
  SUSHI_V3_QUOTER,
  V2_PAIR_ABI,
  V2_FACTORY_ABI,
  V2_ROUTER_ABI,
  V3_QUOTER_ABI,
  V3_FEE_TIERS,
  MIN_PROFIT_WEI,
  MAX_GAS_PRICE,
  SLIPPAGE_BPS,
  type Token,
} from './config.js';

// Arbitrage
export {
  createClient,
  getV2Pair,
  getAllV2Pairs,
  getV2Reserves,
  getPoolStates,
  getV2AmountOut,
  findOptimalInput,
  findV2Arbitrage,
  scanForArbitrage,
  formatOpportunity,
  formatPoolState,
  type PoolState,
  type ArbitrageOpportunity,
  type PriceQuote,
} from './arbitrage.js';

// Backrunning
export {
  getRecentSwaps,
  estimateSwapVolume,
  filterLargeSwaps,
  analyzeBackrunOpportunity,
  monitorBlocks,
  formatSwapEvent,
  formatBackrunOpportunity,
  type SwapEvent,
  type BackrunOpportunity,
} from './backrun.js';

// Executor
export {
  verifyProfitability,
  buildV2SwapTx,
  buildArbitrageTxs,
  executeArbitrage,
  buildFlashArbTx,
  formatResult,
  DEFAULT_CONFIG,
  FLASH_ARB_ABI,
  type ExecutionResult,
  type ExecutionConfig,
} from './executor.js';
