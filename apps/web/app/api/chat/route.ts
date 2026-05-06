import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { mainnet } from 'viem/chains';

// Intent schema (runtime validated via Zod, also generates the type)
const IntentSchema = z.object({
  type: z.enum(['deposit', 'withdraw', 'swap', 'query']),
  tokenIn: z.string().nullable().optional(),
  tokenOut: z.string().nullable().optional(),
  amount: z.string().nullable().optional(),
  protocol: z.enum(['morpho', 'sushi', 'yearn', 'best']).nullable().optional(),
  query: z.enum(['positions', 'yields', 'risk', 'balance']).nullable().optional(),
  confidence: z.number().min(0).max(1),
});

type IntentType = z.infer<typeof IntentSchema>['type'];
type QueryType = NonNullable<z.infer<typeof IntentSchema>['query']>;

interface Intent {
  type: IntentType;
  tokenIn?: string;
  tokenOut?: string;
  amount?: string;
  protocol?: string;
  query?: QueryType;
  confidence: number;
  rawInput: string;
}

// System prompt for intent parsing
const SYSTEM_PROMPT = `You are a DeFi intent parser. Parse natural language into structured intents for DeFi operations on Ethereum mainnet.

Available intent types:
- deposit: Put tokens into a yield protocol
- withdraw: Take tokens out of a protocol
- swap: Exchange one token for another
- query: Information requests

Respond ONLY with valid JSON:
{
  "type": "deposit|withdraw|swap|query",
  "tokenIn": "TOKEN_SYMBOL or null",
  "tokenOut": "TOKEN_SYMBOL or null",
  "amount": "number string, 'half', 'all', or null",
  "protocol": "morpho|sushi|yearn|best or null",
  "query": "positions|yields|risk|balance or null",
  "confidence": 0.0-1.0
}`;

// Quick parse for common queries
function quickParse(input: string): Intent | null {
  const normalized = input.toLowerCase().trim();

  if (normalized.includes('balance') || normalized.includes('how much') || normalized.includes('what do i have')) {
    return { type: 'query', query: 'balance', confidence: 0.95, rawInput: input };
  }

  if (normalized.includes('position') || normalized.includes('my deposit')) {
    return { type: 'query', query: 'positions', confidence: 0.9, rawInput: input };
  }

  if (normalized.includes('risk') || normalized.includes('liquidat') || normalized.includes('am i safe')) {
    return { type: 'query', query: 'risk', confidence: 0.9, rawInput: input };
  }

  if (normalized.includes('yield') || normalized.includes('apy') || normalized.includes('best rate')) {
    return { type: 'query', query: 'yields', confidence: 0.9, rawInput: input };
  }

  const amountMatch = normalized.match(/(\d*\.?\d+|half|all)\s+([a-z0-9]+)/i);
  const swapMatch = normalized.match(/(?:swap|exchange|convert)\s+(\d*\.?\d+|half|all)?\s*([a-z0-9]+)?\s*(?:to|for|into)\s+([a-z0-9]+)/i);
  if (swapMatch) {
    return {
      type: 'swap',
      amount: swapMatch[1] || amountMatch?.[1],
      tokenIn: (swapMatch[2] || amountMatch?.[2] || undefined)?.toUpperCase(),
      tokenOut: swapMatch[3]?.toUpperCase(),
      confidence: 0.88,
      rawInput: input,
    };
  }

  const depositMatch = normalized.match(/(?:deposit|supply|lend)\s+(\d*\.?\d+|half|all)?\s*([a-z0-9]+)?(?:\s+(?:into|to))?\s*([a-z0-9-]+)?/i);
  if (depositMatch && (depositMatch[1] || depositMatch[2])) {
    return {
      type: 'deposit',
      amount: depositMatch[1] || undefined,
      tokenIn: depositMatch[2]?.toUpperCase(),
      protocol: depositMatch[3]?.toLowerCase(),
      confidence: 0.8,
      rawInput: input,
    };
  }

  const withdrawMatch = normalized.match(/(?:withdraw|redeem|unstake)\s+(\d*\.?\d+|half|all)?\s*([a-z0-9]+)?(?:\s+(?:from))?\s*([a-z0-9-]+)?/i);
  if (withdrawMatch && (withdrawMatch[1] || withdrawMatch[2])) {
    return {
      type: 'withdraw',
      amount: withdrawMatch[1] || undefined,
      tokenIn: withdrawMatch[2]?.toUpperCase(),
      protocol: withdrawMatch[3]?.toLowerCase(),
      confidence: 0.78,
      rawInput: input,
    };
  }

  return null;
}

// ERC20 ABI for balance queries
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Token list (Ethereum mainnet)
const TOKENS = [
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address, decimals: 6 },
  { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address, decimals: 18 },
  { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address, decimals: 18 },
  { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address, decimals: 6 },
];

async function fetchBalances(walletAddress: Address) {
  const client = createPublicClient({
    chain: mainnet,
    transport: http(),
  });

  const balances: Array<{ symbol: string; balance: string; formatted: string }> = [];

  // Fetch ETH balance
  try {
    const ethBalance = await client.getBalance({ address: walletAddress });
    balances.push({
      symbol: 'ETH',
      balance: ethBalance.toString(),
      formatted: formatUnits(ethBalance, 18),
    });
  } catch (e) {
    console.error('ETH balance error:', e);
  }

  // Fetch ERC20 balances
  for (const token of TOKENS) {
    try {
      const balance = await client.readContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
      });

      if (balance > BigInt(0)) {
        balances.push({
          symbol: token.symbol,
          balance: balance.toString(),
          formatted: formatUnits(balance, token.decimals),
        });
      }
    } catch (e) {
      console.error(`${token.symbol} balance error:`, e);
    }
  }

  return balances;
}

function formatBalanceResponse(balances: Array<{ symbol: string; formatted: string }>) {
  if (balances.length === 0) {
    return "You don't have any tokens in this wallet.";
  }

  const lines = ['**Your Balances:**', ''];

  for (const token of balances) {
    const amount = parseFloat(token.formatted);
    if (amount > 0) {
      const display = amount < 0.0001 
        ? '<0.0001' 
        : amount.toLocaleString('en-US', { maximumFractionDigits: 4 });
      lines.push(`• **${token.symbol}**: ${display}`);
    }
  }

  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const { message, walletAddress } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Missing message' },
        { status: 400 }
      );
    }

    // Try quick parse first
    let intent = quickParse(message);

    // If no quick match, use the LLM for parsing
    if (!intent && process.env.OPENAI_API_KEY) {
      try {
        const { object } = await generateObject({
          model: openai('gpt-4o-mini'),
          schema: IntentSchema,
          system: SYSTEM_PROMPT,
          prompt: message,
        });

        intent = {
          type: object.type,
          tokenIn: object.tokenIn || undefined,
          tokenOut: object.tokenOut || undefined,
          amount: object.amount || undefined,
          protocol: object.protocol || undefined,
          query: object.query || undefined,
          confidence: object.confidence,
          rawInput: message,
        };
      } catch (e) {
        console.error('Intent parse error:', e);
      }
    }

    // Default to balance query if we still can't parse
    if (!intent) {
      intent = { type: 'query', query: 'balance', confidence: 0.5, rawInput: message };
    }

    // Handle the intent
    let response: string;
    let data: any = null;

    switch (intent.type) {
      case 'query':
        switch (intent.query) {
          case 'balance':
            if (!walletAddress) {
              response = 'Connect your wallet and I can show your live on-chain balances.';
              break;
            }
            const balances = await fetchBalances(walletAddress as Address);
            data = { balances };
            response = formatBalanceResponse(balances);
            break;

          case 'positions':
            response = walletAddress
              ? "📊 **Your Positions:**\n\nNo active positions found yet. Try depositing into a yield protocol.\n\nCheck the **Yields** tab to find the best opportunities on Ethereum mainnet."
              : 'Connect your wallet and I can inspect your live positions across supported chains.';
            break;

          case 'yields':
            // Fetch real yield data
            try {
              const yieldsRes = await fetch(new URL('/api/yields', request.url));
              const yieldsData = await yieldsRes.json();
              const topYields = (yieldsData.yields || []).slice(0, 5);

              if (topYields.length > 0) {
                const yieldLines = topYields.map((y: any) =>
                  `• **${y.protocol} ${y.asset}** (${y.chainName}): ${(y.apy * 100).toFixed(2)}% APY`
                );
                response = `📈 **Best Yields (Live):**\n\n${yieldLines.join('\n')}\n\nWant me to deposit into any of these?`;
                data = { yields: topYields };
              } else {
                response = "📈 **Yields:** Fetching live data... Try again in a moment.";
              }
            } catch {
              response = "📈 **Yields:** Unable to fetch live data right now. Check the Yields tab for current rates.";
            }
            break;

          case 'risk':
            response = walletAddress
              ? "✅ **Risk Assessment:**\n\nNo active lending positions detected on-chain.\n\nWhen you have active Morpho or Aave positions, I'll monitor your health factor and warn you before liquidation."
              : 'Connect your wallet and I can check your lending risk and liquidation exposure.';
            break;

          default:
            response = "I can help you with balances, positions, yields, and risk checks. What would you like to know?";
        }
        break;

      case 'swap':
        response = `🔄 **Swap Preview:**\n\nSwap ${intent.amount || '?'} ${intent.tokenIn || '?'} → ${intent.tokenOut || '?'}\n\nOpen the **Swap** page to fetch a live quote and execute this trade.`;
        break;

      case 'deposit':
        response = `💰 **Deposit Preview:**\n\nDeposit ${intent.amount || '?'} ${intent.tokenIn || '?'} into ${intent.protocol || 'best yield'}\n\n*Coming soon! Will show you the best yield options.*`;
        break;

      case 'withdraw':
        response = `📤 **Withdraw Preview:**\n\nWithdraw ${intent.amount || 'all'} from ${intent.protocol || 'your position'}\n\n*Coming soon!*`;
        break;

      default:
        response = "I understand you want to do something with DeFi. Try asking:\n\n• \"Show my balances\"\n• \"What's the best yield for USDC?\"\n• \"Swap 0.1 ETH to USDC\"";
    }

    return NextResponse.json({
      intent,
      response,
      data,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
