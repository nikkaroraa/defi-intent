import { formatUnits } from 'viem';

/**
 * Format a token balance for display
 */
export function formatBalance(balance: bigint, decimals: number, maxDecimals = 4): string {
  const formatted = formatUnits(balance, decimals);
  const num = parseFloat(formatted);
  
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Shorten an address for display
 */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Parse amount strings like "100", "half", "all", "50%"
 */
export function parseAmountString(
  amountStr: string,
  totalBalance: bigint,
  decimals: number
): bigint {
  const normalized = amountStr.toLowerCase().trim();
  
  if (normalized === 'all' || normalized === 'max') {
    return totalBalance;
  }
  
  if (normalized === 'half') {
    return totalBalance / BigInt(2);
  }
  
  // Handle percentage
  if (normalized.endsWith('%')) {
    const pct = parseFloat(normalized.slice(0, -1));
    if (isNaN(pct) || pct < 0 || pct > 100) {
      throw new Error('Invalid percentage');
    }
    return (totalBalance * BigInt(Math.floor(pct * 100))) / BigInt(10000);
  }
  
  // Handle direct number
  const num = parseFloat(normalized);
  if (isNaN(num) || num < 0) {
    throw new Error('Invalid amount');
  }
  
  return BigInt(Math.floor(num * Math.pow(10, decimals)));
}

/**
 * Sleep for a given duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
