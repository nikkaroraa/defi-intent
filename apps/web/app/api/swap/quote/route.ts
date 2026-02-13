import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  http,
  encodeFunctionData,
  parseUnits,
  formatUnits,
  type Address,
  zeroAddress,
} from 'viem';

// ===========================================
// CHAIN CONFIGS
// ===========================================

interface ChainConfig {
  id: number;
  name: string;
  rpc: string;
  weth: Address;
  tokens: Record<string, { address: Address; decimals: number }>;
  dexes: Array<{
    name: string;
    type: 'v2' | 'v3';
    router: Address;
    quoter?: Address;
  }>;
}

const CHAINS: Record<number, ChainConfig> = {
  1: {
    id: 1,
    name: 'Ethereum',
    rpc: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
    weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    tokens: {
      ETH: { address: zeroAddress, decimals: 18 },
      WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
      USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
      USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
      WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
      DAI: { address: '0x6B175474E89094C44Da98b954EesdeC B5BE', decimals: 18 },
    },
    dexes: [
      { name: 'Uniswap V2', type: 'v2', router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D' },
      {
        name: 'Uniswap V3',
        type: 'v3',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
      },
      { name: 'SushiSwap', type: 'v2', router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F' },
    ],
  },
  747474: {
    id: 747474,
    name: 'Katana',
    rpc: process.env.KATANA_RPC_URL || 'https://rpc.katana.network',
    weth: '0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62',
    tokens: {
      ETH: { address: zeroAddress, decimals: 18 },
      WETH: { address: '0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62', decimals: 18 },
      USDC: { address: '0x203a662b0bd271a6ed5a60edfbd04bfce608fd36', decimals: 6 },
      USDT: { address: '0x2dca96907fde857dd3d816880a0df407eeb2d2f2', decimals: 6 },
      WBTC: { address: '0x0913da6da4b42f538b445599b46bb4622342cf52', decimals: 8 },
    },
    dexes: [{ name: 'Sushi V2', type: 'v2', router: '0x69cc349932ae18ed406eeb917d79b9b3033fb68e' }],
  },
};

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

// ===========================================
// QUOTE FETCHERS
// ===========================================

interface Quote {
  dex: string;
  amountOut: bigint;
  path: Address[];
  fee?: number;
}

async function getV2Quote(
  client: ReturnType<typeof createPublicClient>,
  router: Address,
  dexName: string,
  fromAddr: Address,
  toAddr: Address,
  weth: Address,
  amountIn: bigint
): Promise<Quote | null> {
  let path: Address[] = [fromAddr, toAddr];

  try {
    const amounts = await client.readContract({
      address: router,
      abi: V2_ROUTER_ABI,
      functionName: 'getAmountsOut',
      args: [amountIn, path],
    });
    return { dex: dexName, amountOut: amounts[amounts.length - 1], path };
  } catch {
    // Try via WETH
    if (fromAddr !== weth && toAddr !== weth) {
      try {
        path = [fromAddr, weth, toAddr];
        const amounts = await client.readContract({
          address: router,
          abi: V2_ROUTER_ABI,
          functionName: 'getAmountsOut',
          args: [amountIn, path],
        });
        return { dex: dexName, amountOut: amounts[amounts.length - 1], path };
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function getV3Quote(
  client: ReturnType<typeof createPublicClient>,
  quoter: Address,
  dexName: string,
  fromAddr: Address,
  toAddr: Address,
  amountIn: bigint
): Promise<Quote | null> {
  const fees = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
  let bestOut = 0n;
  let bestFee = 3000;

  for (const fee of fees) {
    try {
      const out = await client.readContract({
        address: quoter,
        abi: V3_QUOTER_ABI,
        functionName: 'quoteExactInputSingle',
        args: [fromAddr, toAddr, fee, amountIn, 0n],
      });
      if (out > bestOut) {
        bestOut = out;
        bestFee = fee;
      }
    } catch {}
  }

  if (bestOut === 0n) return null;

  return {
    dex: `${dexName} (${bestFee / 10000}%)`,
    amountOut: bestOut,
    path: [fromAddr, toAddr],
    fee: bestFee,
  };
}

// ===========================================
// HANDLER
// ===========================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chainId = parseInt(searchParams.get('chainId') || '747474');
  const tokenInSymbol = searchParams.get('tokenIn')?.toUpperCase();
  const tokenOutSymbol = searchParams.get('tokenOut')?.toUpperCase();
  const amount = searchParams.get('amount');
  const recipient = searchParams.get('recipient') as Address;

  if (!tokenInSymbol || !tokenOutSymbol || !amount || !recipient) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const chain = CHAINS[chainId];
  if (!chain) {
    return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 });
  }

  const tokenIn = chain.tokens[tokenInSymbol];
  const tokenOut = chain.tokens[tokenOutSymbol];
  if (!tokenIn || !tokenOut) {
    return NextResponse.json({ error: 'Unknown token' }, { status: 400 });
  }

  try {
    const client = createPublicClient({
      transport: http(chain.rpc, { timeout: 15000 }),
    });

    const amountInWei = parseUnits(amount, tokenIn.decimals);
    const fromAddr = tokenIn.address === zeroAddress ? chain.weth : tokenIn.address;
    const toAddr = tokenOut.address === zeroAddress ? chain.weth : tokenOut.address;

    // Get quotes from all DEXs
    const quotePromises = chain.dexes.map(async (dex) => {
      if (dex.type === 'v2') {
        return getV2Quote(client, dex.router, dex.name, fromAddr, toAddr, chain.weth, amountInWei);
      } else if (dex.type === 'v3' && dex.quoter) {
        return getV3Quote(client, dex.quoter, dex.name, fromAddr, toAddr, amountInWei);
      }
      return null;
    });

    const results = await Promise.all(quotePromises);
    const quotes = results.filter((q): q is Quote => q !== null);

    if (quotes.length === 0) {
      return NextResponse.json({ error: 'No route found' }, { status: 404 });
    }

    // Sort by amountOut
    quotes.sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1));
    const best = quotes[0];

    // Calculate slippage
    const amountOutMin = (best.amountOut * 995n) / 1000n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

    // Build transactions
    const txs: Array<{ to: Address; data: `0x${string}`; value: string }> = [];
    const isETHIn = tokenIn.address === zeroAddress;
    const isETHOut = tokenOut.address === zeroAddress;

    // Find the dex config
    const dexConfig = chain.dexes.find((d) => best.dex.startsWith(d.name));
    if (!dexConfig) {
      return NextResponse.json({ error: 'DEX config not found' }, { status: 500 });
    }

    if (best.fee) {
      // V3 swap
      if (!isETHIn) {
        txs.push({
          to: tokenIn.address,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [dexConfig.router, amountInWei],
          }),
          value: '0',
        });
      }

      const params = {
        tokenIn: fromAddr,
        tokenOut: toAddr,
        fee: best.fee,
        recipient,
        deadline,
        amountIn: amountInWei,
        amountOutMinimum: amountOutMin,
        sqrtPriceLimitX96: 0n,
      };

      txs.push({
        to: dexConfig.router,
        data: encodeFunctionData({
          abi: V3_ROUTER_ABI,
          functionName: 'exactInputSingle',
          args: [params],
        }),
        value: isETHIn ? amountInWei.toString() : '0',
      });
    } else {
      // V2 swap
      if (isETHIn) {
        txs.push({
          to: dexConfig.router,
          data: encodeFunctionData({
            abi: V2_ROUTER_ABI,
            functionName: 'swapExactETHForTokens',
            args: [amountOutMin, best.path, recipient, deadline],
          }),
          value: amountInWei.toString(),
        });
      } else if (isETHOut) {
        txs.push({
          to: tokenIn.address,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [dexConfig.router, amountInWei],
          }),
          value: '0',
        });
        txs.push({
          to: dexConfig.router,
          data: encodeFunctionData({
            abi: V2_ROUTER_ABI,
            functionName: 'swapExactTokensForETH',
            args: [amountInWei, amountOutMin, best.path, recipient, deadline],
          }),
          value: '0',
        });
      } else {
        txs.push({
          to: tokenIn.address,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [dexConfig.router, amountInWei],
          }),
          value: '0',
        });
        txs.push({
          to: dexConfig.router,
          data: encodeFunctionData({
            abi: V2_ROUTER_ABI,
            functionName: 'swapExactTokensForTokens',
            args: [amountInWei, amountOutMin, best.path, recipient, deadline],
          }),
          value: '0',
        });
      }
    }

    // Build route string
    let route: string;
    if (best.fee) {
      route = `${tokenInSymbol} → ${tokenOutSymbol} (${best.dex})`;
    } else {
      const symbols = best.path.map((addr) => {
        if (addr === zeroAddress) return 'ETH';
        const entry = Object.entries(chain.tokens).find(
          ([, t]) => t.address.toLowerCase() === addr.toLowerCase()
        );
        return entry ? entry[0] : addr.slice(0, 6);
      });
      if (isETHIn) symbols[0] = 'ETH';
      if (isETHOut) symbols[symbols.length - 1] = 'ETH';
      route = symbols.join(' → ') + ` (${best.dex})`;
    }

    return NextResponse.json({
      chainId,
      tokenIn: { symbol: tokenInSymbol, decimals: tokenIn.decimals },
      tokenOut: { symbol: tokenOutSymbol, decimals: tokenOut.decimals },
      amountIn: formatUnits(amountInWei, tokenIn.decimals),
      amountOut: formatUnits(best.amountOut, tokenOut.decimals),
      amountOutMin: formatUnits(amountOutMin, tokenOut.decimals),
      route,
      dex: best.dex,
      priceImpact: best.fee ? best.fee / 10000 : 0.3,
      allQuotes: quotes.map((q) => ({
        dex: q.dex,
        amountOut: formatUnits(q.amountOut, tokenOut.decimals),
      })),
      txs,
    });
  } catch (e: any) {
    console.error('Quote error:', e);
    return NextResponse.json({ error: e.message || 'Failed to get quote' }, { status: 500 });
  }
}
