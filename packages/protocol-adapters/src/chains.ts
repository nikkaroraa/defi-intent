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
// BASE
// ===========================================

export const BASE: ChainConfig = {
  id: 8453,
  name: 'Base',
  rpc: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  explorer: 'https://basescan.org',
  tokens: {
    ETH: {
      address: zeroAddress,
      symbol: 'ETH',
      decimals: 18,
      name: 'Ether',
      logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    },
    WETH: {
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      decimals: 18,
      name: 'Wrapped ETH',
      logoURI: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
    },
    USDC: {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
      logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    },
    USDbC: {
      address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      symbol: 'USDbC',
      decimals: 6,
      name: 'USD Base Coin',
      logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    },
    DAI: {
      address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      symbol: 'DAI',
      decimals: 18,
      name: 'Dai Stablecoin',
      logoURI: 'https://assets.coingecko.com/coins/images/9956/small/dai-multi-collateral-mcd.png',
    },
    cbETH: {
      address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
      symbol: 'cbETH',
      decimals: 18,
      name: 'Coinbase Wrapped ETH',
      logoURI: 'https://assets.coingecko.com/coins/images/27008/small/cbeth.png',
    },
  },
  dexes: [
    {
      name: 'Aerodrome',
      type: 'uniswap-v2', // Similar to V2 but with different interface
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
      factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da',
    },
    {
      name: 'Uniswap V2',
      type: 'uniswap-v2',
      router: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
      factory: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6',
    },
    {
      name: 'Uniswap V3',
      type: 'uniswap-v3',
      router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
      quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    },
    {
      name: 'SushiSwap',
      type: 'uniswap-v2',
      router: '0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891',
      factory: '0x71524B4f93c58fcbF659783284E38825f0622859',
    },
  ],
};

// ===========================================
// CHAIN REGISTRY
// ===========================================

export const CHAINS: Record<number, ChainConfig> = {
  1: ETHEREUM,
  8453: BASE,
  747474: KATANA,
};

export function getChain(chainId: number): ChainConfig | undefined {
  return CHAINS[chainId];
}

export function getChainList(): ChainConfig[] {
  return Object.values(CHAINS);
}
