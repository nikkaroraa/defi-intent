/**
 * Sushi Swap Adapter for DeFi Intent
 * Quote swaps and build calldata for execution
 */

import {
  createPublicClient,
  http,
  encodeFunctionData,
  parseUnits,
  formatUnits,
  type Address,
  type Hex,
  zeroAddress,
} from 'viem';

// ===========================================
// KATANA CONFIG
// ===========================================

const l2Chain = {
  id: 747474,
  name: 'DeFi Intent',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: { default: { http: ['https://rpc.example.network'] } },
} as const;

const L2_RPC = process.env.L2_RPC_URL || 'https://rpc.example.network';

// ===========================================
// CONTRACTS
// ===========================================

export const SUSHI_CONTRACTS = {
  V2_FACTORY: '0x72d111b4d6f31b38919ae39779f570b747d6acd9' as Address,
  V2_ROUTER: '0x69cc349932ae18ed406eeb917d79b9b3033fb68e' as Address,
  V3_FACTORY: '0x203e8740894c8955cb8950759876d7e7e45e04c1' as Address,
  V3_ROUTER: '0x4e1d81a3e627b9294532e990109e4c21d217376c' as Address,
  ROUTE_PROCESSOR: '0x3ced11c610556e5292fbc2e75d68c3899098c14c' as Address,
  MULTICALL3: '0xcA11bde05977b3631167028862bE2a173976CA11' as Address,
};

// ===========================================
// TOKENS
// ===========================================

export interface Token {
  address: Address;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
}

export const TOKENS: Record<string, Token> = {
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
  wstETH: {
    address: '0x7fb4d0f51544f24f385a421db6e7d4fc71ad8e5c',
    symbol: 'wstETH',
    decimals: 18,
    name: 'Wrapped stETH',
    logoURI: 'https://assets.coingecko.com/coins/images/18834/small/wstETH.png',
  },
};

const WETH = TOKENS.WETH.address;

// ===========================================
// ABIs
// ===========================================

const V2_ROUTER_ABI = [
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    name: 'getAmountsOut',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactETHForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForETH',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const WETH_ABI = [
  {
    inputs: [],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'wad', type: 'uint256' }],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ===========================================
// TYPES
// ===========================================

export interface SwapQuote {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: bigint;
  amountOut: bigint;
  amountOutMin: bigint; // with slippage
  path: Address[];
  priceImpact: number;
  route: string; // human readable
}

export interface SwapTransaction {
  to: Address;
  data: Hex;
  value: bigint;
  description: string;
}

// ===========================================
// CLIENT
// ===========================================

let client: ReturnType<typeof createPublicClient> | null = null;

function getClient() {
  if (!client) {
    client = createPublicClient({
      chain: l2Chain,
      transport: http(L2_RPC, { timeout: 15000 }),
    });
  }
  return client;
}

// ===========================================
// QUOTE
// ===========================================

/**
 * Get swap quote for token pair
 */
export async function getSwapQuote(
  tokenInSymbol: string,
  tokenOutSymbol: string,
  amountIn: string,
  slippagePercent: number = 0.5
): Promise<SwapQuote | null> {
  const tokenIn = TOKENS[tokenInSymbol.toUpperCase()];
  const tokenOut = TOKENS[tokenOutSymbol.toUpperCase()];

  if (!tokenIn || !tokenOut) {
    console.error('Unknown token:', tokenInSymbol, tokenOutSymbol);
    return null;
  }

  const amountInWei = parseUnits(amountIn, tokenIn.decimals);
  const client = getClient();

  // Build path - normalize ETH to WETH for routing
  const fromAddress = tokenIn.address === zeroAddress ? WETH : tokenIn.address;
  const toAddress = tokenOut.address === zeroAddress ? WETH : tokenOut.address;

  // Try direct path first, then via WETH
  let path: Address[];
  let amountOut: bigint;

  try {
    // Direct path
    path = [fromAddress, toAddress];
    const amounts = await client.readContract({
      address: SUSHI_CONTRACTS.V2_ROUTER,
      abi: V2_ROUTER_ABI,
      functionName: 'getAmountsOut',
      args: [amountInWei, path],
    });
    amountOut = amounts[amounts.length - 1];
  } catch {
    // Try via WETH if not already using WETH
    if (fromAddress !== WETH && toAddress !== WETH) {
      try {
        path = [fromAddress, WETH, toAddress];
        const amounts = await client.readContract({
          address: SUSHI_CONTRACTS.V2_ROUTER,
          abi: V2_ROUTER_ABI,
          functionName: 'getAmountsOut',
          args: [amountInWei, path],
        });
        amountOut = amounts[amounts.length - 1];
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }

  // Calculate slippage
  const slippageMultiplier = BigInt(Math.floor((100 - slippagePercent) * 100));
  const amountOutMin = (amountOut * slippageMultiplier) / 10000n;

  // Estimate price impact (simplified)
  const priceImpact = 0.3; // Assume 0.3% for now

  // Build route string
  const routeSymbols = path.map((addr) => {
    const token = Object.values(TOKENS).find(
      (t) => t.address.toLowerCase() === addr.toLowerCase()
    );
    return token?.symbol || addr.slice(0, 6);
  });

  return {
    tokenIn,
    tokenOut,
    amountIn: amountInWei,
    amountOut,
    amountOutMin,
    path,
    priceImpact,
    route: routeSymbols.join(' → '),
  };
}

// ===========================================
// BUILD SWAP TX
// ===========================================

/**
 * Build swap transaction(s)
 * Returns array of transactions (approve + swap, or just swap for ETH)
 */
export function buildSwapTx(
  quote: SwapQuote,
  recipient: Address,
  deadline?: number
): SwapTransaction[] {
  const txs: SwapTransaction[] = [];
  const deadlineTs = BigInt(deadline || Math.floor(Date.now() / 1000) + 1800); // 30 min default

  const isETHIn = quote.tokenIn.address === zeroAddress;
  const isETHOut = quote.tokenOut.address === zeroAddress;

  if (isETHIn) {
    // ETH → Token: swapExactETHForTokens
    const data = encodeFunctionData({
      abi: V2_ROUTER_ABI,
      functionName: 'swapExactETHForTokens',
      args: [quote.amountOutMin, quote.path, recipient, deadlineTs],
    });

    txs.push({
      to: SUSHI_CONTRACTS.V2_ROUTER,
      data,
      value: quote.amountIn,
      description: `Swap ${formatUnits(quote.amountIn, 18)} ETH → ${quote.tokenOut.symbol}`,
    });
  } else if (isETHOut) {
    // Token → ETH: approve + swapExactTokensForETH
    const approveData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [SUSHI_CONTRACTS.V2_ROUTER, quote.amountIn],
    });

    txs.push({
      to: quote.tokenIn.address,
      data: approveData,
      value: 0n,
      description: `Approve ${quote.tokenIn.symbol}`,
    });

    const swapData = encodeFunctionData({
      abi: V2_ROUTER_ABI,
      functionName: 'swapExactTokensForETH',
      args: [quote.amountIn, quote.amountOutMin, quote.path, recipient, deadlineTs],
    });

    txs.push({
      to: SUSHI_CONTRACTS.V2_ROUTER,
      data: swapData,
      value: 0n,
      description: `Swap ${quote.tokenIn.symbol} → ETH`,
    });
  } else {
    // Token → Token: approve + swapExactTokensForTokens
    const approveData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [SUSHI_CONTRACTS.V2_ROUTER, quote.amountIn],
    });

    txs.push({
      to: quote.tokenIn.address,
      data: approveData,
      value: 0n,
      description: `Approve ${quote.tokenIn.symbol}`,
    });

    const swapData = encodeFunctionData({
      abi: V2_ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [quote.amountIn, quote.amountOutMin, quote.path, recipient, deadlineTs],
    });

    txs.push({
      to: SUSHI_CONTRACTS.V2_ROUTER,
      data: swapData,
      value: 0n,
      description: `Swap ${quote.tokenIn.symbol} → ${quote.tokenOut.symbol}`,
    });
  }

  return txs;
}

// ===========================================
// HELPER: Get all tokens
// ===========================================

export function getTokenList(): Token[] {
  return Object.values(TOKENS);
}

export function getToken(symbol: string): Token | undefined {
  return TOKENS[symbol.toUpperCase()];
}

// ===========================================
// FORMAT HELPERS
// ===========================================

export function formatQuote(quote: SwapQuote): string {
  const amountInStr = formatUnits(quote.amountIn, quote.tokenIn.decimals);
  const amountOutStr = formatUnits(quote.amountOut, quote.tokenOut.decimals);
  const rate = Number(amountOutStr) / Number(amountInStr);

  return `${amountInStr} ${quote.tokenIn.symbol} → ${amountOutStr} ${quote.tokenOut.symbol} (1 ${quote.tokenIn.symbol} = ${rate.toFixed(6)} ${quote.tokenOut.symbol})`;
}
