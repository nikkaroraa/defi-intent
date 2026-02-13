/**
 * Hyperliquid Integration
 * HLP, vaults, and yield tracking
 */

// Config
export {
  HYPERLIQUID_API,
  DEFAULT_API_URL,
  KNOWN_VAULTS,
  HLP_VAULT_ADDRESS,
  type VaultDetails,
  type VaultPortfolio,
  type VaultPosition,
  type FollowerState,
  type UserVaultEquity,
  type BorrowLendUserState,
  type BorrowLendReserveState,
  type HLPState,
  type HLPPosition,
  type InfoRequest,
  type InfoRequestType,
} from './config.js';

// Client
export {
  HyperliquidClient,
  createHyperliquidClient,
} from './client.js';

// Vaults
export {
  getHyperliquidYields,
  getUserVaultPositions,
  compareYields,
  getHLPInfo,
  formatVaultYield,
  formatYieldComparison,
  formatHLPInfo,
  type VaultYieldInfo,
  type UserVaultPosition,
  type YieldComparison,
  type HLPInfo,
} from './vaults.js';
