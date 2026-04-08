/**
 * Hyperliquid Configuration
 * API endpoints and types
 */

// ===========================================
// API ENDPOINTS
// ===========================================

export const HYPERLIQUID_API = {
  mainnet: 'https://api.hyperliquid.xyz',
  testnet: 'https://api.hyperliquid-testnet.xyz',
};

export const DEFAULT_API_URL = HYPERLIQUID_API.mainnet;

// ===========================================
// TYPES
// ===========================================

export interface VaultDetails {
  name: string;
  vaultAddress: string;
  leader: string;
  description: string;
  portfolio: VaultPortfolio;
  apr: number;
  followerState?: FollowerState;
}

export interface VaultPortfolio {
  accountValue: string;
  totalRawUsd: string;
  totalMarginUsed: string;
  withdrawable: string;
  positions: VaultPosition[];
}

export interface VaultPosition {
  coin: string;
  szi: string;
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  leverage: string;
  liquidationPx: string | null;
}

export interface FollowerState {
  equity: string;
  allTimePnl: string;
  pnlAfterFees: string;
}

export interface UserVaultEquity {
  vaultAddress: string;
  vaultName: string;
  equity: string;
  allTimePnl: string;
}

export interface BorrowLendUserState {
  token: number;
  tokenName: string;
  borrowed: string;
  supplied: string;
  supplyApy: number;
  borrowApy: number;
  healthFactor: string | null;
}

export interface BorrowLendReserveState {
  token: number;
  tokenName: string;
  totalSupply: string;
  totalBorrow: string;
  supplyApy: number;
  borrowApy: number;
  utilizationRate: number;
  availableLiquidity: string;
}

// HLP (Hyperliquid Liquidity Provider) specific
export interface HLPState {
  totalValue: string;
  apy: number;
  tvl: string;
  positions: HLPPosition[];
}

export interface HLPPosition {
  coin: string;
  exposure: string;
  pnl: string;
}

// ===========================================
// KNOWN VAULTS
// ===========================================

// HLP is the main protocol vault
export const HLP_VAULT_ADDRESS = '0xfefefefefefefefefefefefefefefefefefefefe'; // HLP vault on Hyperliquid

// Popular vaults (examples)
export const KNOWN_VAULTS = [
  {
    name: 'HLP',
    address: HLP_VAULT_ADDRESS,
    description: 'Hyperliquid Protocol Vault - provides liquidity for all perps',
    type: 'protocol' as const,
  },
  // Add other known vaults here
];

// ===========================================
// API REQUEST TYPES
// ===========================================

export type InfoRequestType =
  | 'vaultDetails'
  | 'userVaultEquities'
  | 'borrowLendUserState'
  | 'borrowLendReserveState'
  | 'allBorrowLendReserveStates'
  | 'allMids'
  | 'meta'
  | 'spotMeta';

export interface InfoRequest {
  type: InfoRequestType;
  [key: string]: unknown;
}
