'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { formatUnits, type Address, type Hex } from 'viem';
import { TokenSelector, type Token } from './token-selector';
import { ChainSelector, CHAINS, type Chain } from './chain-selector';

// ===========================================
// TOKENS BY CHAIN
// ===========================================

const TOKENS_BY_CHAIN: Record<number, Token[]> = {
  1: [
    { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18, name: 'Ether', logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18, name: 'Wrapped ETH', logoURI: 'https://assets.coingecko.com/coins/images/2518/small/weth.png' },
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6, name: 'USD Coin', logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6, name: 'Tether', logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
    { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', decimals: 8, name: 'Wrapped BTC', logoURI: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png' },
  ],
  747474: [
    { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18, name: 'Ether', logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { address: '0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62', symbol: 'WETH', decimals: 18, name: 'Wrapped ETH', logoURI: 'https://assets.coingecko.com/coins/images/2518/small/weth.png' },
    { address: '0x203a662b0bd271a6ed5a60edfbd04bfce608fd36', symbol: 'USDC', decimals: 6, name: 'USD Coin', logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
    { address: '0x2dca96907fde857dd3d816880a0df407eeb2d2f2', symbol: 'USDT', decimals: 6, name: 'Tether', logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
    { address: '0x0913da6da4b42f538b445599b46bb4622342cf52', symbol: 'WBTC', decimals: 8, name: 'Wrapped BTC', logoURI: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png' },
  ],
};

// ===========================================
// TYPES
// ===========================================

interface SwapQuote {
  chainId: number;
  tokenIn: { symbol: string; decimals: number };
  tokenOut: { symbol: string; decimals: number };
  amountIn: string;
  amountOut: string;
  amountOutMin: string;
  route: string;
  dex: string;
  priceImpact: number;
  allQuotes: Array<{ dex: string; amountOut: string }>;
  txs: Array<{ to: Address; data: Hex; value: string }>;
}

async function fetchQuote(
  chainId: number,
  tokenIn: string,
  tokenOut: string,
  amount: string,
  recipient: Address
): Promise<SwapQuote | null> {
  try {
    const res = await fetch(
      `/api/swap/quote?chainId=${chainId}&tokenIn=${tokenIn}&tokenOut=${tokenOut}&amount=${amount}&recipient=${recipient}`
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
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const { switchChain } = useSwitchChain();

  const [selectedChain, setSelectedChain] = useState<Chain>(CHAINS[1]); // Default to Katana
  const [tokenIn, setTokenIn] = useState<Token | null>(null);
  const [tokenOut, setTokenOut] = useState<Token | null>(null);
  const [amountIn, setAmountIn] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get tokens for selected chain
  const tokens = TOKENS_BY_CHAIN[selectedChain.id] || [];

  // Initialize tokens when chain changes
  useEffect(() => {
    const chainTokens = TOKENS_BY_CHAIN[selectedChain.id];
    if (chainTokens) {
      setTokenIn(chainTokens[0]); // ETH
      setTokenOut(chainTokens[2]); // USDC
      setQuote(null);
      setAmountIn('');
    }
  }, [selectedChain.id]);

  // Get balance
  const { data: balance } = useBalance({
    address,
    token: tokenIn?.address === '0x0000000000000000000000000000000000000000'
      ? undefined
      : tokenIn?.address as Address,
    chainId: selectedChain.id,
  });

  // Transaction state
  const { sendTransaction, data: txHash, isPending: isSending } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Fetch quote when inputs change
  useEffect(() => {
    const getQuote = async () => {
      if (!tokenIn || !tokenOut || !amountIn || !address || parseFloat(amountIn) <= 0) {
        setQuote(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      const q = await fetchQuote(selectedChain.id, tokenIn.symbol, tokenOut.symbol, amountIn, address);

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
  }, [tokenIn, tokenOut, amountIn, address, selectedChain.id]);

  // Switch tokens
  const switchTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn('');
    setQuote(null);
  };

  // Handle chain change
  const handleChainChange = (chain: Chain) => {
    setSelectedChain(chain);
    // Also switch wallet chain
    if (switchChain && walletChainId !== chain.id) {
      switchChain({ chainId: chain.id });
    }
  };

  // Execute swap
  const handleSwap = async () => {
    if (!quote || !quote.txs.length) return;

    // Check if wallet is on correct chain
    if (walletChainId !== selectedChain.id) {
      if (switchChain) {
        switchChain({ chainId: selectedChain.id });
      }
      return;
    }

    // Execute the swap tx (last one in the array)
    const tx = quote.txs[quote.txs.length - 1];
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

  const needsChainSwitch = walletChainId !== selectedChain.id;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Swap</h2>
          <ChainSelector selectedChain={selectedChain} onSelect={handleChainChange} />
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
              tokens={tokens}
              selectedToken={tokenIn}
              onSelect={setTokenIn}
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
              tokens={tokens}
              selectedToken={tokenOut}
              onSelect={setTokenOut}
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
              <span>Best DEX</span>
              <span className="text-green-400">{quote.dex}</span>
            </div>
            {quote.allQuotes.length > 1 && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <span className="text-gray-500 text-xs">All quotes:</span>
                {quote.allQuotes.map((q, i) => (
                  <div key={i} className="flex justify-between text-gray-400 text-xs mt-1">
                    <span>{q.dex}</span>
                    <span>{parseFloat(q.amountOut).toFixed(6)} {tokenOut?.symbol}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between text-gray-400 mt-2">
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
          disabled={!isConnected || (!quote && !needsChainSwitch) || isSending || isConfirming}
          className="w-full mt-4 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-500 hover:to-pink-500 transition-all"
        >
          {!isConnected
            ? 'Connect Wallet'
            : needsChainSwitch
            ? `Switch to ${selectedChain.name}`
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
