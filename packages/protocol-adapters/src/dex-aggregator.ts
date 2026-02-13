/**
 * Multi-DEX Aggregator
 * Compares quotes across Uniswap V2, V3, Sushi, and returns best execution
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
import { type ChainConfig, type DexConfig, type TokenConfig, getChain } from './chains.js';

// ===========================================
// TYPES
// ===========================================

export interface DexQuote {
  dex: string;
  dexType: string;
  amountOut: bigint;
  amountOutMin: bigint;
  path: Address[];
  route: string;
  priceImpact: number;
  gasEstimate?: bigint;
}

export interface AggregatedQuote {
  chainId: number;
  tokenIn: TokenConfig;
  tokenOut: TokenConfig;
  amountIn: bigint;
  best: DexQuote;
  allQuotes: DexQuote[];
  txs: SwapTx[];
}

export interface SwapTx {
  to: Address;
  data: Hex;
  value: string;
  description: string;
}

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
    name: 'swapExactTokensForTokens',
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
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

const V3_QUOTER_ABI = [
  {
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'sqrtPriceLimitX96', type: 'uint160' },
    ],
    name: 'quoteExactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const V3_ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'exactInputSingle',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
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

// V3 fee tiers
const V3_FEE_TIERS = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

// ===========================================
// QUOTE FETCHERS
// ===========================================

async function getV2Quote(
  client: ReturnType<typeof createPublicClient>,
  dex: DexConfig,
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  weth: Address
): Promise<DexQuote | null> {
  const fromAddr = tokenIn === zeroAddress ? weth : tokenIn;
  const toAddr = tokenOut === zeroAddress ? weth : tokenOut;

  // Try direct path
  let path: Address[] = [fromAddr, toAddr];
  let amountOut: bigint;

  try {
    const amounts = await client.readContract({
      address: dex.router,
      abi: V2_ROUTER_ABI,
      functionName: 'getAmountsOut',
      args: [amountIn, path],
    });
    amountOut = amounts[amounts.length - 1];
  } catch {
    // Try via WETH
    if (fromAddr !== weth && toAddr !== weth) {
      try {
        path = [fromAddr, weth, toAddr];
        const amounts = await client.readContract({
          address: dex.router,
          abi: V2_ROUTER_ABI,
          functionName: 'getAmountsOut',
          args: [amountIn, path],
        });
        amountOut = amounts[amounts.length - 1];
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }

  const amountOutMin = (amountOut * 995n) / 1000n; // 0.5% slippage

  return {
    dex: dex.name,
    dexType: dex.type,
    amountOut,
    amountOutMin,
    path,
    route: path.map((a) => a.slice(0, 6)).join(' → '),
    priceImpact: 0.3,
  };
}

async function getV3Quote(
  client: ReturnType<typeof createPublicClient>,
  dex: DexConfig,
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  weth: Address
): Promise<DexQuote | null> {
  if (!dex.quoter) return null;

  const fromAddr = tokenIn === zeroAddress ? weth : tokenIn;
  const toAddr = tokenOut === zeroAddress ? weth : tokenOut;

  let bestAmountOut = 0n;
  let bestFee = 3000;

  // Try all fee tiers
  for (const fee of V3_FEE_TIERS) {
    try {
      const amountOut = await client.readContract({
        address: dex.quoter,
        abi: V3_QUOTER_ABI,
        functionName: 'quoteExactInputSingle',
        args: [fromAddr, toAddr, fee, amountIn, 0n],
      });

      if (amountOut > bestAmountOut) {
        bestAmountOut = amountOut;
        bestFee = fee;
      }
    } catch {
      // Fee tier doesn't exist for this pair
    }
  }

  if (bestAmountOut === 0n) return null;

  const amountOutMin = (bestAmountOut * 995n) / 1000n;

  return {
    dex: `${dex.name} (${bestFee / 10000}%)`,
    dexType: dex.type,
    amountOut: bestAmountOut,
    amountOutMin,
    path: [fromAddr, toAddr],
    route: `${fromAddr.slice(0, 6)} → ${toAddr.slice(0, 6)} (${bestFee / 10000}%)`,
    priceImpact: bestFee / 10000,
  };
}

// ===========================================
// AGGREGATOR
// ===========================================

export async function getAggregatedQuote(
  chainId: number,
  tokenInSymbol: string,
  tokenOutSymbol: string,
  amountIn: string,
  recipient: Address,
  slippagePercent: number = 0.5
): Promise<AggregatedQuote | null> {
  const chain = getChain(chainId);
  if (!chain) return null;

  const tokenIn = chain.tokens[tokenInSymbol.toUpperCase()];
  const tokenOut = chain.tokens[tokenOutSymbol.toUpperCase()];
  if (!tokenIn || !tokenOut) return null;

  const amountInWei = parseUnits(amountIn, tokenIn.decimals);
  const weth = chain.tokens.WETH.address;

  const client = createPublicClient({
    transport: http(chain.rpc, { timeout: 15000 }),
  });

  // Get quotes from all DEXs in parallel
  const quotePromises: Promise<DexQuote | null>[] = [];

  for (const dex of chain.dexes) {
    if (dex.type === 'uniswap-v2') {
      quotePromises.push(getV2Quote(client, dex, tokenIn.address, tokenOut.address, amountInWei, weth));
    } else if (dex.type === 'uniswap-v3') {
      quotePromises.push(getV3Quote(client, dex, tokenIn.address, tokenOut.address, amountInWei, weth));
    }
  }

  const results = await Promise.all(quotePromises);
  const quotes = results.filter((q): q is DexQuote => q !== null);

  if (quotes.length === 0) return null;

  // Sort by amountOut descending
  quotes.sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1));
  const best = quotes[0];

  // Build transactions for best quote
  const txs = buildSwapTxs(chain, best, tokenIn, tokenOut, amountInWei, recipient);

  return {
    chainId,
    tokenIn,
    tokenOut,
    amountIn: amountInWei,
    best,
    allQuotes: quotes,
    txs,
  };
}

// ===========================================
// TX BUILDER
// ===========================================

function buildSwapTxs(
  chain: ChainConfig,
  quote: DexQuote,
  tokenIn: TokenConfig,
  tokenOut: TokenConfig,
  amountIn: bigint,
  recipient: Address
): SwapTx[] {
  const txs: SwapTx[] = [];
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
  const isETHIn = tokenIn.address === zeroAddress;
  const isETHOut = tokenOut.address === zeroAddress;

  // Find the DEX config
  const dex = chain.dexes.find((d) => quote.dex.startsWith(d.name));
  if (!dex) return txs;

  if (quote.dexType === 'uniswap-v2') {
    if (isETHIn) {
      // ETH → Token
      const data = encodeFunctionData({
        abi: V2_ROUTER_ABI,
        functionName: 'swapExactETHForTokens',
        args: [quote.amountOutMin, quote.path, recipient, deadline],
      });
      txs.push({
        to: dex.router,
        data,
        value: amountIn.toString(),
        description: `Swap ETH → ${tokenOut.symbol} via ${dex.name}`,
      });
    } else if (isETHOut) {
      // Token → ETH
      txs.push({
        to: tokenIn.address,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [dex.router, amountIn],
        }),
        value: '0',
        description: `Approve ${tokenIn.symbol}`,
      });
      txs.push({
        to: dex.router,
        data: encodeFunctionData({
          abi: V2_ROUTER_ABI,
          functionName: 'swapExactTokensForETH',
          args: [amountIn, quote.amountOutMin, quote.path, recipient, deadline],
        }),
        value: '0',
        description: `Swap ${tokenIn.symbol} → ETH via ${dex.name}`,
      });
    } else {
      // Token → Token
      txs.push({
        to: tokenIn.address,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [dex.router, amountIn],
        }),
        value: '0',
        description: `Approve ${tokenIn.symbol}`,
      });
      txs.push({
        to: dex.router,
        data: encodeFunctionData({
          abi: V2_ROUTER_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [amountIn, quote.amountOutMin, quote.path, recipient, deadline],
        }),
        value: '0',
        description: `Swap ${tokenIn.symbol} → ${tokenOut.symbol} via ${dex.name}`,
      });
    }
  } else if (quote.dexType === 'uniswap-v3') {
    // Extract fee from quote.dex string (e.g., "Uniswap V3 (0.3%)")
    const feeMatch = quote.dex.match(/\((\d+\.?\d*)%\)/);
    const fee = feeMatch ? Math.round(parseFloat(feeMatch[1]) * 10000) : 3000;

    if (!isETHIn) {
      txs.push({
        to: tokenIn.address,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [dex.router, amountIn],
        }),
        value: '0',
        description: `Approve ${tokenIn.symbol}`,
      });
    }

    const params = {
      tokenIn: isETHIn ? chain.tokens.WETH.address : tokenIn.address,
      tokenOut: isETHOut ? chain.tokens.WETH.address : tokenOut.address,
      fee,
      recipient,
      deadline,
      amountIn,
      amountOutMinimum: quote.amountOutMin,
      sqrtPriceLimitX96: 0n,
    };

    txs.push({
      to: dex.router,
      data: encodeFunctionData({
        abi: V3_ROUTER_ABI,
        functionName: 'exactInputSingle',
        args: [params],
      }),
      value: isETHIn ? amountIn.toString() : '0',
      description: `Swap ${tokenIn.symbol} → ${tokenOut.symbol} via ${dex.name}`,
    });
  }

  return txs;
}

// ===========================================
// HELPERS
// ===========================================

export function formatAggregatedQuote(quote: AggregatedQuote): string {
  const amountInStr = formatUnits(quote.amountIn, quote.tokenIn.decimals);
  const amountOutStr = formatUnits(quote.best.amountOut, quote.tokenOut.decimals);
  const rate = Number(amountOutStr) / Number(amountInStr);

  const lines = [
    `Best: ${quote.best.dex}`,
    `${amountInStr} ${quote.tokenIn.symbol} → ${amountOutStr} ${quote.tokenOut.symbol}`,
    `Rate: 1 ${quote.tokenIn.symbol} = ${rate.toFixed(6)} ${quote.tokenOut.symbol}`,
    ``,
    `All quotes:`,
    ...quote.allQuotes.map(
      (q) => `  ${q.dex}: ${formatUnits(q.amountOut, quote.tokenOut.decimals)} ${quote.tokenOut.symbol}`
    ),
  ];

  return lines.join('\n');
}
