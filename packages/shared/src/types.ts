// Intent types for the DeFi Intent Layer

export type IntentType = 
  | 'deposit' 
  | 'withdraw' 
  | 'swap' 
  | 'stake' 
  | 'borrow' 
  | 'repay' 
  | 'query';

export type QueryType = 
  | 'positions' 
  | 'yields' 
  | 'risk' 
  | 'balance';

export interface Intent {
  type: IntentType;
  
  // For actions
  tokenIn?: string;      // "USDC", "ETH", etc.
  tokenOut?: string;     // For swaps
  amount?: string;       // "100", "half", "all"
  protocol?: string;     // "morpho", "sushi", "yearn", "best"
  
  // For queries
  query?: QueryType;
  
  // Metadata
  confidence: number;    // 0-1 how sure we are about parsing
  rawInput: string;      // Original user message
}

export interface ParseResult {
  success: boolean;
  intent?: Intent;
  error?: string;
}

// Token types
export interface TokenBalance {
  symbol: string;
  name: string;
  address: string;
  balance: string;
  balanceFormatted: string;
  decimals: number;
  usdValue?: string;
  logoURI?: string;
}

// Chat message types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  intent?: Intent;
  data?: any;
}

// Chain configuration
export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// DeFi Intent chain config
export const KATANA_CHAIN: ChainConfig = {
  id: 1911, // DeFi Intent mainnet
  name: 'DeFi Intent',
  rpcUrl: 'https://rpc.example.network',
  explorerUrl: 'https://explorer.defi-intent.network',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
};

// Common token addresses across chains
export const KATANA_TOKENS: Record<string, { address: string; decimals: number; name: string }> = {
  ETH: {
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    name: 'Ether',
  },
  WETH: {
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    name: 'Wrapped Ether',
  },
  USDC: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    name: 'USD Coin',
  },
  USDT: {
    address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    decimals: 6,
    name: 'Tether USD',
  },
  AUSD: {
    address: '0xCa72827a3D211CfD8F6b00Ac98824872b72CAb49',
    decimals: 18,
    name: 'DeFi Intent USD',
  },
};
