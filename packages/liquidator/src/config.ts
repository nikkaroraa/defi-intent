/**
 * Liquidator Configuration
 * Morpho Blue contracts and ABIs for Katana
 */

import { type Address } from 'viem';

// ===========================================
// CHAIN CONFIG
// ===========================================

export const KATANA_CHAIN = {
  id: 747474,
  name: 'Katana',
  rpc: process.env.KATANA_RPC_URL || 'https://rpc.katana.network',
};

// ===========================================
// MORPHO BLUE CONTRACTS
// ===========================================

export const MORPHO_BLUE = '0x0000000000000000000000000000000000000000' as Address; // TODO: Get actual address
export const MORPHO_ORACLE = '0x0000000000000000000000000000000000000000' as Address;

// Known markets on Katana (market ID = keccak256 of market params)
export interface Market {
  id: `0x${string}`;
  name: string;
  loanToken: Address;
  collateralToken: Address;
  oracle: Address;
  irm: Address;
  lltv: bigint; // Liquidation LTV in WAD (1e18 = 100%)
}

// Common tokens on Katana
export const TOKENS: Record<string, { address: Address; decimals: number; symbol: string }> = {
  WETH: { address: '0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62', decimals: 18, symbol: 'WETH' },
  USDC: { address: '0x203a662b0bd271a6ed5a60edfbd04bfce608fd36', decimals: 6, symbol: 'USDC' },
  USDT: { address: '0x2dca96907fde857dd3d816880a0df407eeb2d2f2', decimals: 6, symbol: 'USDT' },
  WBTC: { address: '0x0913da6da4b42f538b445599b46bb4622342cf52', decimals: 8, symbol: 'WBTC' },
  DAI: { address: '0x4b6b9b31c72836806b0b1104cf1cdab8a0e3bd66', decimals: 18, symbol: 'DAI' },
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
