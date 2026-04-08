'use client';

import { useState, useRef, useEffect } from 'react';

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
  const ref = useRef<HTMLDivElement>(null);

  const filteredTokens = excludeToken
    ? tokens.filter((t) => t.address !== excludeToken.address)
    : tokens;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl hover:bg-accent transition-colors min-w-[120px]"
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
          <span className="text-muted-foreground">Select</span>
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
        <div className="absolute right-0 z-[100] w-52 mt-2 bg-card border border-border rounded-xl shadow-2xl shadow-black/50 max-h-72 overflow-y-auto">
          {filteredTokens.map((token) => (
            <button
              key={token.address}
              type="button"
              onClick={() => {
                onSelect(token);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              {token.logoURI && (
                <img src={token.logoURI} alt={token.symbol} className="w-6 h-6 rounded-full" />
              )}
              <div className="text-left">
                <div className="text-sm font-medium">{token.symbol}</div>
                <div className="text-xs text-muted-foreground">{token.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
