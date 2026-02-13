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
// CONFIG
// ===========================================

const katana = {
  id: 747474,
  name: 'Katana',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: { default: { http: ['https://rpc.katana.network'] } },
} as const;

const SUSHI_V2_ROUTER = '0x69cc349932ae18ed406eeb917d79b9b3033fb68e' as Address;
const WETH = '0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62' as Address;

const TOKENS: Record<string, { address: Address; decimals: number }> = {
  ETH: { address: zeroAddress, decimals: 18 },
  WETH: { address: '0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62', decimals: 18 },
  USDC: { address: '0x203a662b0bd271a6ed5a60edfbd04bfce608fd36', decimals: 6 },
  USDT: { address: '0x2dca96907fde857dd3d816880a0df407eeb2d2f2', decimals: 6 },
  WBTC: { address: '0x0913da6da4b42f538b445599b46bb4622342cf52', decimals: 8 },
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
// HANDLER
// ===========================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenInSymbol = searchParams.get('tokenIn')?.toUpperCase();
  const tokenOutSymbol = searchParams.get('tokenOut')?.toUpperCase();
  const amount = searchParams.get('amount');
  const recipient = searchParams.get('recipient') as Address;

  if (!tokenInSymbol || !tokenOutSymbol || !amount || !recipient) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const tokenIn = TOKENS[tokenInSymbol];
  const tokenOut = TOKENS[tokenOutSymbol];

  if (!tokenIn || !tokenOut) {
    return NextResponse.json({ error: 'Unknown token' }, { status: 400 });
  }

  try {
    const client = createPublicClient({
      chain: katana,
      transport: http('https://rpc.katana.network'),
    });

    const amountInWei = parseUnits(amount, tokenIn.decimals);

    // Build path - normalize ETH to WETH for routing
    const fromAddress = tokenIn.address === zeroAddress ? WETH : tokenIn.address;
    const toAddress = tokenOut.address === zeroAddress ? WETH : tokenOut.address;

    // Try direct path, then via WETH
    let path: Address[];
    let amountOut: bigint;

    try {
      path = [fromAddress, toAddress];
      const amounts = await client.readContract({
        address: SUSHI_V2_ROUTER,
        abi: V2_ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [amountInWei, path],
      });
      amountOut = amounts[amounts.length - 1];
    } catch {
      if (fromAddress !== WETH && toAddress !== WETH) {
        path = [fromAddress, WETH, toAddress];
        const amounts = await client.readContract({
          address: SUSHI_V2_ROUTER,
          abi: V2_ROUTER_ABI,
          functionName: 'getAmountsOut',
          args: [amountInWei, path],
        });
        amountOut = amounts[amounts.length - 1];
      } else {
        return NextResponse.json({ error: 'No route found' }, { status: 404 });
      }
    }

    // Calculate slippage (0.5%)
    const amountOutMin = (amountOut * 995n) / 1000n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

    // Build transactions
    const txs: Array<{ to: Address; data: `0x${string}`; value: string }> = [];
    const isETHIn = tokenIn.address === zeroAddress;
    const isETHOut = tokenOut.address === zeroAddress;

    if (isETHIn) {
      // ETH → Token
      const data = encodeFunctionData({
        abi: V2_ROUTER_ABI,
        functionName: 'swapExactETHForTokens',
        args: [amountOutMin, path, recipient, deadline],
      });
      txs.push({ to: SUSHI_V2_ROUTER, data, value: amountInWei.toString() });
    } else if (isETHOut) {
      // Token → ETH (approve + swap)
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [SUSHI_V2_ROUTER, amountInWei],
      });
      txs.push({ to: tokenIn.address, data: approveData, value: '0' });

      const swapData = encodeFunctionData({
        abi: V2_ROUTER_ABI,
        functionName: 'swapExactTokensForETH',
        args: [amountInWei, amountOutMin, path, recipient, deadline],
      });
      txs.push({ to: SUSHI_V2_ROUTER, data: swapData, value: '0' });
    } else {
      // Token → Token (approve + swap)
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [SUSHI_V2_ROUTER, amountInWei],
      });
      txs.push({ to: tokenIn.address, data: approveData, value: '0' });

      const swapData = encodeFunctionData({
        abi: V2_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [amountInWei, amountOutMin, path, recipient, deadline],
      });
      txs.push({ to: SUSHI_V2_ROUTER, data: swapData, value: '0' });
    }

    // Build route string
    const routeSymbols = path.map((addr) => {
      const entry = Object.entries(TOKENS).find(
        ([, t]) => t.address.toLowerCase() === addr.toLowerCase()
      );
      return entry ? entry[0] : addr.slice(0, 6);
    });

    // If swapping ETH, show ETH in route
    if (isETHIn) routeSymbols[0] = 'ETH';
    if (isETHOut) routeSymbols[routeSymbols.length - 1] = 'ETH';

    return NextResponse.json({
      tokenIn: { symbol: tokenInSymbol, decimals: tokenIn.decimals },
      tokenOut: { symbol: tokenOutSymbol, decimals: tokenOut.decimals },
      amountIn: formatUnits(amountInWei, tokenIn.decimals),
      amountOut: formatUnits(amountOut, tokenOut.decimals),
      amountOutMin: formatUnits(amountOutMin, tokenOut.decimals),
      route: routeSymbols.join(' → '),
      priceImpact: 0.3, // Simplified
      txs,
    });
  } catch (e: any) {
    console.error('Quote error:', e);
    return NextResponse.json({ error: e.message || 'Failed to get quote' }, { status: 500 });
  }
}
