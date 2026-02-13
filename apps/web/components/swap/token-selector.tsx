'use client';

import { useState } from 'react';

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

interface TokenSelectorProps {
  tokens: Token[];
  selectedToken: Token | null;
  onSelect: (token: Token) => void;
  excludeToken?: Token | null;
}

export function TokenSelector({ tokens, selectedToken, onSelect, excludeToken }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredTokens = excludeToken
    ? tokens.filter((t) => t.address !== excludeToken.address)
    : tokens;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors min-w-[120px]"
      >
        {selectedToken ? (
          <>
            {selectedToken.logoURI && (
              <img
                src={selectedToken.logoURI}
                alt={selectedToken.symbol}
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="font-medium">{selectedToken.symbol}</span>
          </>
        ) : (
          <span className="text-gray-400">Select</span>
        )}
        <svg
          className={`w-4 h-4 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 w-48 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
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
                <img src={token.logoURI} alt={token.symbol} className="w-7 h-7 rounded-full" />
              )}
              <div className="text-left">
                <div className="font-medium">{token.symbol}</div>
                <div className="text-xs text-gray-400">{token.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
