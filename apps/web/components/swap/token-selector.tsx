'use client';

import { useState } from 'react';
import Image from 'next/image';

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

const TOKENS: Token[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    decimals: 18,
    name: 'Ether',
    logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  },
  {
    address: '0xee7d8bcfb72bc1880d0cf19822eb0a2e6577ab62',
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped ETH',
    logoURI: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  {
    address: '0x203a662b0bd271a6ed5a60edfbd04bfce608fd36',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  },
  {
    address: '0x2dca96907fde857dd3d816880a0df407eeb2d2f2',
    symbol: 'USDT',
    decimals: 6,
    name: 'Tether',
    logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  },
  {
    address: '0x0913da6da4b42f538b445599b46bb4622342cf52',
    symbol: 'WBTC',
    decimals: 8,
    name: 'Wrapped BTC',
    logoURI: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
  },
];

interface TokenSelectorProps {
  selectedToken: Token | null;
  onSelect: (token: Token) => void;
  label: string;
  excludeToken?: Token | null;
}

export function TokenSelector({ selectedToken, onSelect, label, excludeToken }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredTokens = excludeToken
    ? TOKENS.filter((t) => t.address !== excludeToken.address)
    : TOKENS;

  return (
    <div className="relative">
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 rounded-xl border border-gray-700 hover:border-purple-500 transition-colors"
      >
        {selectedToken ? (
          <div className="flex items-center gap-2">
            {selectedToken.logoURI && (
              <img
                src={selectedToken.logoURI}
                alt={selectedToken.symbol}
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="font-medium">{selectedToken.symbol}</span>
          </div>
        ) : (
          <span className="text-gray-400">Select token</span>
        )}
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
          {filteredTokens.map((token) => (
            <button
              key={token.address}
              type="button"
              onClick={() => {
                onSelect(token);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors"
            >
              {token.logoURI && (
                <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full" />
              )}
              <div className="text-left">
                <div className="font-medium">{token.symbol}</div>
                <div className="text-sm text-gray-400">{token.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { TOKENS };
