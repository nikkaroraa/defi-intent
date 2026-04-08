import Anthropic from '@anthropic-ai/sdk';
import type { Intent, ParseResult, IntentType, QueryType } from '@defi-intent/shared';

const SYSTEM_PROMPT = `You are a DeFi intent parser for DeFi protocols. Your job is to understand natural language requests and convert them to structured intents.

Available intent types:
- deposit: Put tokens into a yield protocol (Yearn, Morpho, Spectra)
- withdraw: Take tokens out of a protocol
- swap: Exchange one token for another (via Sushi)
- stake: Stake tokens for rewards
- borrow: Borrow against collateral (Morpho)
- repay: Repay borrowed tokens
- query: Information requests (balances, positions, yields, risk)

Available tokens: ETH, WETH, USDC, USDT, AUSD

Respond ONLY with valid JSON matching this schema:
{
  "type": "deposit|withdraw|swap|stake|borrow|repay|query",
  "tokenIn": "TOKEN_SYMBOL or null",
  "tokenOut": "TOKEN_SYMBOL or null (for swaps)",
  "amount": "number string, 'half', 'all', or null",
  "protocol": "morpho|sushi|yearn|spectra|best or null",
  "query": "positions|yields|risk|balance or null (for query type)",
  "confidence": 0.0-1.0
}

Examples:
- "deposit 100 USDC" → {"type":"deposit","tokenIn":"USDC","amount":"100","protocol":"best","confidence":0.9}
- "show my balances" → {"type":"query","query":"balance","confidence":0.95}
- "swap half my ETH to USDC" → {"type":"swap","tokenIn":"ETH","tokenOut":"USDC","amount":"half","protocol":"sushi","confidence":0.9}
- "what's my liquidation risk?" → {"type":"query","query":"risk","confidence":0.9}
- "withdraw all from yearn" → {"type":"withdraw","amount":"all","protocol":"yearn","confidence":0.85}`;

export class IntentParser {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async parse(input: string): Promise<ParseResult> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: input,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        return { success: false, error: 'Unexpected response type' };
      }

      // Parse the JSON response
      const parsed = JSON.parse(content.text);
      
      // Validate required fields
      if (!parsed.type || typeof parsed.confidence !== 'number') {
        return { success: false, error: 'Invalid intent structure' };
      }

      const intent: Intent = {
        type: parsed.type as IntentType,
        tokenIn: parsed.tokenIn || undefined,
        tokenOut: parsed.tokenOut || undefined,
        amount: parsed.amount || undefined,
        protocol: parsed.protocol || undefined,
        query: parsed.query as QueryType || undefined,
        confidence: parsed.confidence,
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

  // Balance queries
  if (
    normalized.includes('balance') ||
    normalized.includes('how much') ||
    normalized.includes('what do i have') ||
    normalized.includes('my tokens')
  ) {
    return {
      type: 'query',
      query: 'balance',
      confidence: 0.9,
      rawInput: input,
    };
  }

  // Position queries
  if (
    normalized.includes('position') ||
    normalized.includes('my deposit') ||
    normalized.includes('what am i')
  ) {
    return {
      type: 'query',
      query: 'positions',
      confidence: 0.85,
      rawInput: input,
    };
  }

  // Risk queries
  if (
    normalized.includes('risk') ||
    normalized.includes('liquidat') ||
    normalized.includes('health') ||
    normalized.includes('am i safe')
  ) {
    return {
      type: 'query',
      query: 'risk',
      confidence: 0.85,
      rawInput: input,
    };
  }

  // Yield queries
  if (
    normalized.includes('yield') ||
    normalized.includes('apy') ||
    normalized.includes('best rate') ||
    normalized.includes('where should i')
  ) {
    return {
      type: 'query',
      query: 'yields',
      confidence: 0.85,
      rawInput: input,
    };
  }

  return null;
}
