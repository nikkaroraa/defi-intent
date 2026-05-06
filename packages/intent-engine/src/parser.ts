import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { Intent, ParseResult, IntentType, QueryType } from '@defi-intent/shared';

const SYSTEM_PROMPT = `You are a DeFi intent parser. Your job is to understand natural language requests and convert them to structured intents.

Available intent types:
- deposit: Put tokens into a yield protocol (Yearn, Morpho)
- withdraw: Take tokens out of a protocol
- swap: Exchange one token for another
- query: Information requests (balances, positions, yields, risk)

Available tokens: ETH, WETH, USDC, USDT, DAI

Examples:
- "deposit 100 USDC" -> deposit / USDC / 100 / best
- "show my balances" -> query / balance
- "swap half my ETH to USDC" -> swap / ETH -> USDC / half
- "what's my liquidation risk?" -> query / risk
- "withdraw all from yearn" -> withdraw / all / yearn`;

const IntentSchema = z.object({
  type: z.enum(['deposit', 'withdraw', 'swap', 'query']),
  tokenIn: z.string().nullable().optional(),
  tokenOut: z.string().nullable().optional(),
  amount: z.string().nullable().optional(),
  protocol: z.enum(['morpho', 'sushi', 'yearn', 'best']).nullable().optional(),
  query: z.enum(['positions', 'yields', 'risk', 'balance']).nullable().optional(),
  confidence: z.number().min(0).max(1),
});

export class IntentParser {
  async parse(input: string): Promise<ParseResult> {
    try {
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: IntentSchema,
        system: SYSTEM_PROMPT,
        prompt: input,
      });

      const intent: Intent = {
        type: object.type as IntentType,
        tokenIn: object.tokenIn || undefined,
        tokenOut: object.tokenOut || undefined,
        amount: object.amount || undefined,
        protocol: object.protocol || undefined,
        query: (object.query as QueryType) || undefined,
        confidence: object.confidence,
        rawInput: input,
      };

      return { success: true, intent };
    } catch (error) {
      console.error('Intent parse error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown parsing error',
      };
    }
  }
}

// Simpler rule-based parser for common queries (fallback/faster)
export function quickParse(input: string): Intent | null {
  const normalized = input.toLowerCase().trim();

  if (
    normalized.includes('balance') ||
    normalized.includes('how much') ||
    normalized.includes('what do i have') ||
    normalized.includes('my tokens')
  ) {
    return { type: 'query', query: 'balance', confidence: 0.9, rawInput: input };
  }

  if (
    normalized.includes('position') ||
    normalized.includes('my deposit') ||
    normalized.includes('what am i')
  ) {
    return { type: 'query', query: 'positions', confidence: 0.85, rawInput: input };
  }

  if (
    normalized.includes('risk') ||
    normalized.includes('liquidat') ||
    normalized.includes('health') ||
    normalized.includes('am i safe')
  ) {
    return { type: 'query', query: 'risk', confidence: 0.85, rawInput: input };
  }

  if (
    normalized.includes('yield') ||
    normalized.includes('apy') ||
    normalized.includes('best rate') ||
    normalized.includes('where should i')
  ) {
    return { type: 'query', query: 'yields', confidence: 0.85, rawInput: input };
  }

  return null;
}
