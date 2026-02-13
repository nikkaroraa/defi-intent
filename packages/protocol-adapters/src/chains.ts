/**
 * Chain Configurations
 */

import { type Address, zeroAddress } from 'viem';

export interface ChainConfig {
  id: number;
  name: string;
  rpc: string;
  explorer: string;
  tokens: Record<string, TokenConfig>;
  dexes: DexConfig[];
}

export interface TokenConfig {
  address: Address;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
}

export interface DexConfig {
  name: string;
  type: 'uniswap-v2' | 'uniswap-v3' | 'fluid';
  router: Address;
  factory?: Address;
  quoter?: Address; // For V3
}

// ===========================================
// ETHEREUM MAINNET
// ===========================================

export const ETHEREUM: ChainConfig = {
  id: 1,
  name: 'Ethereum',
  rpc: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
  explorer: 'https://etherscan.io',
  tokens: {
    ETH: {
      address: zeroAddress,
      symbol: 'ETH',
      decimals: 18,
      name: 'Ether',
      logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    },
    WETH: {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      symbol: 'WETH',
      decimals: 18,
      name: 'Wrapped ETH',
      logoURI: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
    },
    USDC: {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
      logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    },
    USDT: {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      decimals: 6,
      name: 'Tether',
      logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    },
    DAI: {
      address: '0x6B175474E89094C44Da98b954EescdeCB5BE',
      symbol: 'DAI',
      decimals: 18,
      name: 'Dai Stablecoin',
      logoURI: 'https://assets.coingecko.com/coins/images/9956/small/dai-multi-collateral-mcd.png',
    },
    WBTC: {
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      symbol: 'WBTC',
      decimals: 8,
      name: 'Wrapped BTC',
      logoURI: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
    },
    UNI: {
      address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      symbol: 'UNI',
      decimals: 18,
      name: 'Uniswap',
      logoURI: 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg',
    },
  },
  dexes: [
    {
      name: 'Uniswap V2',
      type: 'uniswap-v2',
      router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    },
    {
      name: 'Uniswap V3',
      type: 'uniswap-v3',
      router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    },
    {
      name: 'SushiSwap',
      type: 'uniswap-v2',
      router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
      factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
    },
  ],
};

// ===========================================
// KATANA
// ===========================================

export const KATANA: ChainConfig = {
  id: 747474,
  name: 'Katana',
  rpc: process.env.KATANA_RPC_URL || 'https://rpc.katana.network',
  explorer: 'https://katanascan.com',
  tokens: {
    ETH: {
      address: zeroAddress,
      symbol: 'ETH',
      decimals: 18,
      name: 'Ether',
      logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    },
    WETH: {
      address: '0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62',
      symbol: 'WETH',
      decimals: 18,
      name: 'Wrapped ETH',
      logoURI: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
    },
    USDC: {
      address: '0x203a662b0bd271a6ed5a60edfbd04bfce608fd36',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
      logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    },
    USDT: {
      address: '0x2dca96907fde857dd3d816880a0df407eeb2d2f2',
      symbol: 'USDT',
      decimals: 6,
      name: 'Tether',
      logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    },
    WBTC: {
      address: '0x0913da6da4b42f538b445599b46bb4622342cf52',
      symbol: 'WBTC',
      decimals: 8,
      name: 'Wrapped BTC',
      logoURI: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
    },
  },
  dexes: [
    {
      name: 'Sushi V2',
      type: 'uniswap-v2',
      router: '0x69cc349932ae18ed406eeb917d79b9b3033fb68e',
      factory: '0x72d111b4d6f31b38919ae39779f570b747d6acd9',
    },
  ],
};

// ===========================================
// CHAIN REGISTRY
// ===========================================

export const CHAINS: Record<number, ChainConfig> = {
  1: ETHEREUM,
  747474: KATANA,
};

export function getChain(chainId: number): ChainConfig | undefined {
  return CHAINS[chainId];
}

export function getChainList(): ChainConfig[] {
  return Object.values(CHAINS);
}
