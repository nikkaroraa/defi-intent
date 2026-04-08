import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { base } from 'viem/chains';
import type { TokenBalance } from '@defi-intent/shared';

// DeFi Intent is a Base L3, so we'll use Base as a fallback for now
// Will update RPC when DeFi Intent mainnet details are confirmed
const L2_RPC = process.env.L2_RPC_URL || 'https://mainnet.base.org';

// ERC20 ABI for balance and decimals
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Token list with logos - common tokens on Base/DeFi Intent
const TOKEN_LIST: Array<{
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}> = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ether',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  },
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
  {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
  },
];

export async function fetchTokenBalances(
  walletAddress: Address,
  rpcUrl: string = L2_RPC
): Promise<TokenBalance[]> {
  const client = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  const balances: TokenBalance[] = [];

  // Fetch ETH balance
  try {
    const ethBalance = await client.getBalance({ address: walletAddress });
    const ethToken = TOKEN_LIST.find(t => t.symbol === 'ETH')!;
    
    balances.push({
      symbol: 'ETH',
      name: 'Ether',
      address: '0x0000000000000000000000000000000000000000',
      balance: ethBalance.toString(),
      balanceFormatted: formatUnits(ethBalance, 18),
      decimals: 18,
      logoURI: ethToken.logoURI,
    });
  } catch (e) {
    console.error('Failed to fetch ETH balance:', e);
  }

  // Fetch ERC20 balances
  for (const token of TOKEN_LIST.filter(t => t.symbol !== 'ETH')) {
    try {
      const balance = await client.readContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
      });

      // Only include tokens with non-zero balance
      if (balance > 0n) {
        balances.push({
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          balance: balance.toString(),
          balanceFormatted: formatUnits(balance, token.decimals),
          decimals: token.decimals,
          logoURI: token.logoURI,
        });
      }
    } catch (e) {
      console.error(`Failed to fetch ${token.symbol} balance:`, e);
    }
  }

  return balances;
}

export function formatBalancesForChat(balances: TokenBalance[]): string {
  if (balances.length === 0) {
    return "You don't have any tokens in this wallet.";
  }

  const lines = ['**Your Balances:**', ''];
  
  for (const token of balances) {
    const amount = parseFloat(token.balanceFormatted);
    if (amount > 0) {
      const formatted = amount < 0.0001 
        ? '<0.0001' 
        : amount.toLocaleString('en-US', { maximumFractionDigits: 4 });
      lines.push(`• **${token.symbol}**: ${formatted}`);
    }
  }

  return lines.join('\n');
}
