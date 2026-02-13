'use client';

import { useState } from 'react';

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
    id: 747474,
    name: 'Katana',
    logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', // Use ETH logo for now
  },
];

interface ChainSelectorProps {
  selectedChain: Chain;
  onSelect: (chain: Chain) => void;
}

export function ChainSelector({ selectedChain, onSelect }: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors"
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
        <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          {CHAINS.map((chain) => (
            <button
              key={chain.id}
              type="button"
              onClick={() => {
                onSelect(chain);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 transition-colors ${
                chain.id === selectedChain.id ? 'bg-gray-700' : ''
              }`}
            >
              <img src={chain.logoURI} alt={chain.name} className="w-5 h-5 rounded-full" />
              <span className="text-sm font-medium">{chain.name}</span>
              {chain.id === selectedChain.id && (
                <svg className="w-4 h-4 ml-auto text-purple-400" fill="currentColor" viewBox="0 0 20 20">
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
