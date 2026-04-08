'use client';

import { useState, useRef, useEffect } from 'react';

export interface Chain {
  id: number;
  name: string;
  logoURI: string;
}

const CHAINS: Chain[] = [
  {
    id: 1,
    name: 'Ethereum',
    logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  },
  {
    id: 8453,
    name: 'Base',
    logoURI: 'https://assets.coingecko.com/coins/images/31197/small/base.png',
  },
  {
    id: 42161,
    name: 'Arbitrum',
    logoURI: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
  },
];

interface ChainSelectorProps {
  selectedChain: Chain;
  onSelect: (chain: Chain) => void;
}

export function ChainSelector({ selectedChain, onSelect }: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg border border-border hover:border-indigo-500/50 transition-colors"
      >
        <img
          src={selectedChain.logoURI}
          alt={selectedChain.name}
          className="w-5 h-5 rounded-full"
        />
        <span className="text-sm font-medium">{selectedChain.name}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-[100] w-44 mt-2 bg-card border border-border rounded-lg shadow-2xl shadow-black/50">
          {CHAINS.map((chain) => (
            <button
              key={chain.id}
              type="button"
              onClick={() => {
                onSelect(chain);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg ${
                chain.id === selectedChain.id ? 'bg-accent' : ''
              }`}
            >
              <img src={chain.logoURI} alt={chain.name} className="w-5 h-5 rounded-full" />
              <span className="text-sm font-medium">{chain.name}</span>
              {chain.id === selectedChain.id && (
                <svg className="w-4 h-4 ml-auto text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { CHAINS };
