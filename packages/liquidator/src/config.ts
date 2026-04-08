/**
 * Liquidator Configuration
 * Morpho Blue contracts and ABIs for Katana
 */

import { type Address } from 'viem';

// ===========================================
// CHAIN CONFIG
// ===========================================

export const CHAIN = {
  id: 1,
  name: 'Ethereum',
  rpc: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
};

// ===========================================
// MORPHO BLUE CONTRACTS (Ethereum Mainnet)
// ===========================================

export const MORPHO_BLUE = '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb' as Address;

// Known markets on Ethereum (market ID = keccak256 of market params)
export interface Market {
  id: `0x${string}`;
  name: string;
  loanToken: Address;
  collateralToken: Address;
  oracle: Address;
  irm: Address;
  lltv: bigint; // Liquidation LTV in WAD (1e18 = 100%)
}

// Common tokens on Ethereum mainnet
export const TOKENS: Record<string, { address: Address; decimals: number; symbol: string }> = {
  WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, symbol: 'WETH' },
  USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, symbol: 'USDC' },
  USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, symbol: 'USDT' },
  WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, symbol: 'WBTC' },
  DAI: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, symbol: 'DAI' },
  wstETH: { address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', decimals: 18, symbol: 'wstETH' },
};

// ===========================================
// MORPHO BLUE ABI (subset for liquidations)
// ===========================================

export const MORPHO_BLUE_ABI = [
  // View functions
  {
    name: 'market',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      { name: 'totalSupplyAssets', type: 'uint128' },
      { name: 'totalSupplyShares', type: 'uint128' },
      { name: 'totalBorrowAssets', type: 'uint128' },
      { name: 'totalBorrowShares', type: 'uint128' },
      { name: 'lastUpdate', type: 'uint128' },
      { name: 'fee', type: 'uint128' },
    ],
  },
  {
    name: 'position',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'id', type: 'bytes32' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      { name: 'supplyShares', type: 'uint256' },
      { name: 'borrowShares', type: 'uint128' },
      { name: 'collateral', type: 'uint128' },
    ],
  },
  {
    name: 'idToMarketParams',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      { name: 'loanToken', type: 'address' },
      { name: 'collateralToken', type: 'address' },
      { name: 'oracle', type: 'address' },
      { name: 'irm', type: 'address' },
      { name: 'lltv', type: 'uint256' },
    ],
  },
  // Liquidate function
  {
    name: 'liquidate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'borrower', type: 'address' },
      { name: 'seizedAssets', type: 'uint256' },
      { name: 'repaidShares', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [
      { name: 'assetsSeized', type: 'uint256' },
      { name: 'sharesRepaid', type: 'uint256' },
    ],
  },
] as const;

// Oracle ABI for price fetching
export const ORACLE_ABI = [
  {
    name: 'price',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ERC20 ABI subset
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// ===========================================
// LIQUIDATION PARAMETERS
// ===========================================

// Liquidation incentive factor (e.g., 1.05 = 5% bonus)
export const LIQUIDATION_INCENTIVE = BigInt(105); // 105% = 5% bonus
export const LIQUIDATION_INCENTIVE_DIVISOR = BigInt(100);

// Max close factor (how much of position can be liquidated)
export const MAX_CLOSE_FACTOR = BigInt(50); // 50% of debt
export const CLOSE_FACTOR_DIVISOR = BigInt(100);

// Gas estimates (in wei)
export const ESTIMATED_GAS_LIQUIDATE = BigInt(300000);
export const ESTIMATED_GAS_FLASH_LIQUIDATE = BigInt(500000);

// Minimum profit threshold (in USD, scaled by 1e6)
export const MIN_PROFIT_USD = BigInt(10_000000); // $10 minimum profit

// WAD constant (1e18)
export const WAD = BigInt(10) ** BigInt(18);
