/**
 * MEV Bot Configuration
 * Katana DEX addresses and ABIs
 */

import { type Address } from 'viem';

// ===========================================
// CHAIN CONFIG
// ===========================================

export const KATANA_CHAIN = {
  id: 747474,
  name: 'Katana',
  rpc: process.env.KATANA_RPC_URL || 'https://rpc.katana.network',
  blockTime: 2000, // 2 seconds
};

// ===========================================
// TOKENS
// ===========================================

export interface Token {
  address: Address;
  symbol: string;
  decimals: number;
}

export const TOKENS: Record<string, Token> = {
  WETH: { address: '0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62', symbol: 'WETH', decimals: 18 },
  USDC: { address: '0x203a662b0bd271a6ed5a60edfbd04bfce608fd36', symbol: 'USDC', decimals: 6 },
  USDT: { address: '0x2dca96907fde857dd3d816880a0df407eeb2d2f2', symbol: 'USDT', decimals: 6 },
  WBTC: { address: '0x0913da6da4b42f538b445599b46bb4622342cf52', symbol: 'WBTC', decimals: 8 },
  DAI: { address: '0x4b6b9b31c72836806b0b1104cf1cdab8a0e3bd66', symbol: 'DAI', decimals: 18 },
};

// ===========================================
// SUSHI V2
// ===========================================

export const SUSHI_V2_FACTORY = '0xFbc12984689e5f15626Bad03Ad60160Fe98B303C' as Address;
export const SUSHI_V2_ROUTER = '0x69cc349932ae18ed406eeb917d79b9b3033fb68e' as Address;

// Known V2 pairs
export const V2_PAIRS: Array<{ pair: Address; token0: string; token1: string }> = [
  { pair: '0x0000000000000000000000000000000000000001' as Address, token0: 'WETH', token1: 'USDC' },
  { pair: '0x0000000000000000000000000000000000000002' as Address, token0: 'WETH', token1: 'USDT' },
  { pair: '0x0000000000000000000000000000000000000003' as Address, token0: 'WBTC', token1: 'WETH' },
  { pair: '0x0000000000000000000000000000000000000004' as Address, token0: 'USDC', token1: 'USDT' },
  { pair: '0x0000000000000000000000000000000000000005' as Address, token0: 'DAI', token1: 'USDC' },
];

// ===========================================
// SUSHI V3
// ===========================================

export const SUSHI_V3_FACTORY = '0x0000000000000000000000000000000000000000' as Address;
export const SUSHI_V3_ROUTER = '0x0000000000000000000000000000000000000000' as Address;
export const SUSHI_V3_QUOTER = '0x0000000000000000000000000000000000000000' as Address;

// V3 fee tiers
export const V3_FEE_TIERS = [500, 3000, 10000] as const; // 0.05%, 0.3%, 1%

// ===========================================
// ABIs
// ===========================================

export const V2_PAIR_ABI = [
  {
    name: 'getReserves',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' },
    ],
  },
  {
    name: 'token0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'token1',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'swap',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount0Out', type: 'uint256' },
      { name: 'amount1Out', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

export const V2_FACTORY_ABI = [
  {
    name: 'getPair',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
    ],
    outputs: [{ name: 'pair', type: 'address' }],
  },
  {
    name: 'allPairs',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'allPairsLength',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const V2_ROUTER_ABI = [
  {
    name: 'getAmountsOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactTokensForTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const;

export const V3_QUOTER_ABI = [
  {
    name: 'quoteExactInputSingle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const;

// ===========================================
// MEV PARAMETERS
// ===========================================

export const MIN_PROFIT_WEI = BigInt(10) ** BigInt(15); // 0.001 ETH minimum profit
export const MAX_GAS_PRICE = BigInt(100_000000000); // 100 gwei max
export const SLIPPAGE_BPS = 50; // 0.5% slippage tolerance

// Multicall3 for batch queries
export const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11' as Address;
