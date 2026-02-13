/**
 * Katana Liquidation Bot
 * Monitor and execute Morpho Blue liquidations on Katana
 */

// Config
export {
  KATANA_CHAIN,
  MORPHO_BLUE,
  MORPHO_BLUE_ABI,
  ORACLE_ABI,
  ERC20_ABI,
  TOKENS,
  LIQUIDATION_INCENTIVE,
  MAX_CLOSE_FACTOR,
  MIN_PROFIT_USD,
  WAD,
  type Market,
} from './config.js';

// Scanner
export {
  createKatanaClient,
  getMarketState,
  getPosition,
  scanForLiquidatablePositions,
  calculateLiquidationOpportunity,
  formatPosition,
  formatOpportunity,
  type MarketParams,
  type Position,
  type MarketState,
  type LiquidationOpportunity,
} from './scanner.js';

// Executor
export {
  isProfitable,
  buildDirectLiquidationTx,
  buildFlashLiquidationTx,
  executeLiquidation,
  executeBatchLiquidations,
  formatResult,
  DEFAULT_CONFIG,
  FLASH_LIQUIDATOR_ABI,
  type LiquidationResult,
  type ExecutionConfig,
} from './executor.js';
