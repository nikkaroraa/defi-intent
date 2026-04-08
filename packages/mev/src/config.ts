/**
 * MEV Bot Configuration
 * Katana DEX addresses and ABIs
 */

import { type Address } from 'viem';

// ===========================================
// CHAIN CONFIG
// ===========================================

export const CHAIN = {
  id: 1,
  name: 'Ethereum',
  rpc: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
  blockTime: 12000, // 12 seconds
};

// ===========================================
// TOKENS (Ethereum Mainnet)
// ===========================================

export interface Token {
  address: Address;
  symbol: string;
  decimals: number;
}

export const TOKENS: Record<string, Token> = {
  WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18 },
  USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
  USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
  WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', decimals: 8 },
  DAI: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', decimals: 18 },
};

// ===========================================
// UNISWAP / SUSHI V2 (Ethereum Mainnet)
// ===========================================

export const SUSHI_V2_FACTORY = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac' as Address;
export const SUSHI_V2_ROUTER = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F' as Address;

// Pairs are discovered dynamically via factory.getPair()
// No more hardcoded placeholder pairs
export const V2_PAIRS: Array<{ pair: Address; token0: string; token1: string }> = [];

// ===========================================
// UNISWAP / SUSHI V3 (Ethereum Mainnet)
// ===========================================

export const SUSHI_V3_FACTORY = '0xbACEB8eC6b9355Dfc0269C18bac9d6E2Bdc29C4F' as Address;
export const SUSHI_V3_ROUTER = '0x2E6cd2d30aa43f40aa81619571E4540289c57900' as Address;
export const SUSHI_V3_QUOTER = '0x64e8802FE490fa7cc61d3c7862aF1dE5BC49f4F3' as Address;

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
