'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, type Address, type Hex } from 'viem';
import { TokenSelector, TOKENS, type Token } from './token-selector';

// ===========================================
// SWAP API
// ===========================================

interface SwapQuote {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  amountOut: string;
  amountOutMin: string;
  route: string;
  priceImpact: number;
  txs: Array<{
    to: Address;
    data: Hex;
    value: string;
  }>;
}

async function fetchQuote(
  tokenIn: string,
  tokenOut: string,
  amount: string,
  recipient: Address
): Promise<SwapQuote | null> {
  try {
    const res = await fetch(
      `/api/swap/quote?tokenIn=${tokenIn}&tokenOut=${tokenOut}&amount=${amount}&recipient=${recipient}`
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ===========================================
// SWAP CARD COMPONENT
// ===========================================

export function SwapCard() {
  const { address, isConnected } = useAccount();
  const [tokenIn, setTokenIn] = useState<Token | null>(TOKENS[0]); // ETH
  const [tokenOut, setTokenOut] = useState<Token | null>(TOKENS[2]); // USDC
  const [amountIn, setAmountIn] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get balance
  const { data: balance } = useBalance({
    address,
    token: tokenIn?.address === '0x0000000000000000000000000000000000000000' 
      ? undefined 
      : tokenIn?.address as Address,
  });

  // Transaction state
  const { sendTransaction, data: txHash, isPending: isSending } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Fetch quote when inputs change
  useEffect(() => {
    const getQuote = async () => {
      if (!tokenIn || !tokenOut || !amountIn || !address || parseFloat(amountIn) <= 0) {
        setQuote(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      const q = await fetchQuote(tokenIn.symbol, tokenOut.symbol, amountIn, address);

      if (q) {
        setQuote(q);
      } else {
        setError('No route found');
        setQuote(null);
      }

      setIsLoading(false);
    };

    const debounce = setTimeout(getQuote, 500);
    return () => clearTimeout(debounce);
  }, [tokenIn, tokenOut, amountIn, address]);

  // Switch tokens
  const switchTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn('');
    setQuote(null);
  };

  // Execute swap
  const handleSwap = async () => {
    if (!quote || !quote.txs.length) return;

    // For now, execute first tx (approve or swap)
    // TODO: Handle multiple txs with bundler
    const tx = quote.txs[quote.txs.length - 1]; // Get the swap tx

    sendTransaction({
      to: tx.to,
      data: tx.data,
      value: BigInt(tx.value),
    });
  };

  // Set max balance
  const setMax = () => {
    if (balance) {
      setAmountIn(formatUnits(balance.value, balance.decimals));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Swap</h2>
          <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* From */}
        <div className="bg-gray-800 rounded-xl p-4 mb-2">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">From</span>
            {balance && (
              <button onClick={setMax} className="text-sm text-purple-400 hover:text-purple-300">
                Balance: {parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)}
              </button>
            )}
          </div>
          <div className="flex gap-4">
            <input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-transparent text-2xl font-medium outline-none"
            />
            <TokenSelector
              selectedToken={tokenIn}
              onSelect={setTokenIn}
              label=""
              excludeToken={tokenOut}
            />
          </div>
        </div>

        {/* Switch button */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            onClick={switchTokens}
            className="p-2 bg-gray-700 rounded-xl border-4 border-gray-900 hover:bg-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To */}
        <div className="bg-gray-800 rounded-xl p-4 mt-2">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">To</span>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 text-2xl font-medium">
              {isLoading ? (
                <span className="text-gray-500">Loading...</span>
              ) : quote ? (
                parseFloat(quote.amountOut).toFixed(6)
              ) : (
                <span className="text-gray-500">0.0</span>
              )}
            </div>
            <TokenSelector
              selectedToken={tokenOut}
              onSelect={setTokenOut}
              label=""
              excludeToken={tokenIn}
            />
          </div>
        </div>

        {/* Route info */}
        {quote && (
          <div className="mt-4 p-3 bg-gray-800 rounded-xl text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Route</span>
              <span className="text-white">{quote.route}</span>
            </div>
            <div className="flex justify-between text-gray-400 mt-1">
              <span>Price Impact</span>
              <span className={quote.priceImpact > 1 ? 'text-red-400' : 'text-green-400'}>
                ~{quote.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-gray-400 mt-1">
              <span>Min. received</span>
              <span className="text-white">{parseFloat(quote.amountOutMin).toFixed(6)} {tokenOut?.symbol}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Success */}
        {isSuccess && (
          <div className="mt-4 p-3 bg-green-900/30 border border-green-800 rounded-xl text-green-400 text-sm">
            Swap successful! 🎉
          </div>
        )}

        {/* Swap button */}
        <button
          onClick={handleSwap}
          disabled={!isConnected || !quote || isSending || isConfirming}
          className="w-full mt-4 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-500 hover:to-pink-500 transition-all"
        >
          {!isConnected
            ? 'Connect Wallet'
            : isSending
            ? 'Confirm in Wallet...'
            : isConfirming
            ? 'Swapping...'
            : 'Swap'}
        </button>
      </div>
    </div>
  );
}
