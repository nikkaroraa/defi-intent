/**
 * Hyperliquid API Client
 * Fetch vault info, positions, and yields
 */

import {
  DEFAULT_API_URL,
  type VaultDetails,
  type UserVaultEquity,
  type BorrowLendUserState,
  type BorrowLendReserveState,
  type InfoRequest,
} from './config.js';

// ===========================================
// CLIENT CLASS
// ===========================================

export class HyperliquidClient {
  private apiUrl: string;

  constructor(apiUrl: string = DEFAULT_API_URL) {
    this.apiUrl = apiUrl;
  }

  /**
   * Make a POST request to the info endpoint
   */
  private async infoRequest<T>(body: InfoRequest): Promise<T> {
    const response = await fetch(`${this.apiUrl}/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`);
    }

    return response.json();
  }

  // ===========================================
  // VAULT METHODS
  // ===========================================

  /**
   * Get details for a specific vault
   */
  async getVaultDetails(
    vaultAddress: string,
    userAddress?: string
  ): Promise<VaultDetails> {
    const body: InfoRequest = {
      type: 'vaultDetails',
      vaultAddress,
    };

    if (userAddress) {
      body.user = userAddress;
    }

    return this.infoRequest<VaultDetails>(body);
  }

  /**
   * Get all vault deposits for a user
   */
  async getUserVaultEquities(userAddress: string): Promise<UserVaultEquity[]> {
    return this.infoRequest<UserVaultEquity[]>({
      type: 'userVaultEquities',
      user: userAddress,
    });
  }

  // ===========================================
  // BORROW/LEND METHODS
  // ===========================================

  /**
   * Get user's borrow/lend state
   */
  async getBorrowLendUserState(userAddress: string): Promise<BorrowLendUserState[]> {
    return this.infoRequest<BorrowLendUserState[]>({
      type: 'borrowLendUserState',
      user: userAddress,
    });
  }

  /**
   * Get reserve state for a specific token
   */
  async getBorrowLendReserveState(tokenIndex: number): Promise<BorrowLendReserveState> {
    return this.infoRequest<BorrowLendReserveState>({
      type: 'borrowLendReserveState',
      token: tokenIndex,
    });
  }

  /**
   * Get all borrow/lend reserve states
   */
  async getAllBorrowLendReserveStates(): Promise<BorrowLendReserveState[]> {
    return this.infoRequest<BorrowLendReserveState[]>({
      type: 'allBorrowLendReserveStates',
    });
  }

  // ===========================================
  // MARKET DATA METHODS
  // ===========================================

  /**
   * Get all mid prices
   */
  async getAllMids(): Promise<Record<string, string>> {
    return this.infoRequest<Record<string, string>>({
      type: 'allMids',
    });
  }

  /**
   * Get perpetuals metadata
   */
  async getMeta(): Promise<unknown> {
    return this.infoRequest({
      type: 'meta',
    });
  }

  /**
   * Get spot metadata
   */
  async getSpotMeta(): Promise<unknown> {
    return this.infoRequest({
      type: 'spotMeta',
    });
  }
}

// ===========================================
// FACTORY FUNCTION
// ===========================================

export function createHyperliquidClient(
  network: 'mainnet' | 'testnet' = 'mainnet'
): HyperliquidClient {
  const apiUrl =
    network === 'mainnet'
      ? 'https://api.hyperliquid.xyz'
      : 'https://api.hyperliquid-testnet.xyz';

  return new HyperliquidClient(apiUrl);
}
