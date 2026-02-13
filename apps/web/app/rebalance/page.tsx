'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { ArrowRightLeft, TrendingUp, TrendingDown, Minus, Filter, RefreshCw } from 'lucide-react';

interface HistoricalAPY {
  current: number;
  avg7d: number;
  avg30d: number;
  avg50d: number;
  trend: 'up' | 'down' | 'stable';
  volatility: 'low' | 'medium' | 'high';
}

interface YieldOpportunity {
  id: string;
  protocol: string;
  name: string;
  asset: string;
  apy: number;
  tvl: string;
  risk: 'low' | 'medium' | 'high';
  description: string;
  historical: HistoricalAPY;
  chainId: number;
  chainName: string;
}

const CHAIN_OPTIONS = [
  { id: 0, name: 'All Chains' },
  { id: 747474, name: 'Katana' },
  { id: 1, name: 'Ethereum' },
  { id: 8453, name: 'Base' },
];

const ASSET_OPTIONS = ['All', 'USDC', 'WETH', 'LP'];

export default function RebalancePage() {
  const [yields, setYields] = useState<YieldOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState('All');
  const [sortBy, setSortBy] = useState<'current' | 'avg7d' | 'avg30d' | 'avg50d'>('avg30d');
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    fetchYields();
  }, [selectedChain, selectedAsset]);

  async function fetchYields() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedChain !== 0) params.set('chainId', selectedChain.toString());
      if (selectedAsset !== 'All') params.set('asset', selectedAsset);

      const res = await fetch(`/api/yields?${params}`);
      const data = await res.json();
      setYields(data.yields || []);
    } catch (e) {
      console.error('Failed to fetch yields:', e);
    } finally {
      setLoading(false);
    }
  }

  const sortedYields = [...yields].sort((a, b) => {
    const aVal = sortBy === 'current' ? a.historical.current : a.historical[sortBy];
    const bVal = sortBy === 'current' ? b.historical.current : b.historical[sortBy];
    return bVal - aVal;
  });

  const formatPercent = (val: number) => `${(val * 100).toFixed(2)}%`;
  const formatTVL = (tvl: string) => {
    const num = parseFloat(tvl);
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${(num / 1e3).toFixed(0)}K`;
  };

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const RiskBadge = ({ risk }: { risk: 'low' | 'medium' | 'high' }) => {
    const colors = {
      low: 'bg-green-500/20 text-green-400 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      high: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded border ${colors[risk]}`}>
        {risk}
      </span>
    );
  };

  const ChainBadge = ({ chainName }: { chainName: string }) => {
    const colors: Record<string, string> = {
      Katana: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      Ethereum: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      Base: 'bg-blue-600/20 text-blue-300 border-blue-600/30',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded border ${colors[chainName] || 'bg-gray-500/20 text-gray-400'}`}>
        {chainName}
      </span>
    );
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <ArrowRightLeft className="w-8 h-8 text-purple-500" />
          Yield Rebalancer
        </h1>
        <p className="text-gray-400">
          Compare yields across chains. Focus on sustained APY (30d average), not temporary spikes.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">Filters:</span>
        </div>

        <select
          value={selectedChain}
          onChange={(e) => setSelectedChain(parseInt(e.target.value))}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        >
          {CHAIN_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        >
          {ASSET_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {a === 'All' ? 'All Assets' : a}
            </option>
          ))}
        </select>

        <button
          onClick={fetchYields}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-2 text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Sort Buttons */}
      <div className="flex gap-2 mb-4">
        <span className="text-sm text-gray-500 py-1">Sort by:</span>
        {(['current', 'avg7d', 'avg30d', 'avg50d'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`text-sm px-3 py-1 rounded-lg transition-colors ${
              sortBy === key
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {key === 'current' ? 'Current' : key.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Yield Table */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                <th className="px-4 py-3 font-medium">Protocol</th>
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Chain</th>
                <th className="px-4 py-3 font-medium text-right">Current APY</th>
                <th className="px-4 py-3 font-medium text-right">7D Avg</th>
                <th className="px-4 py-3 font-medium text-right">30D Avg</th>
                <th className="px-4 py-3 font-medium text-right">50D Avg</th>
                <th className="px-4 py-3 font-medium text-center">Trend</th>
                <th className="px-4 py-3 font-medium text-center">Risk</th>
                <th className="px-4 py-3 font-medium text-right">TVL</th>
                <th className="px-4 py-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    Loading yields...
                  </td>
                </tr>
              ) : sortedYields.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    No yields found
                  </td>
                </tr>
              ) : (
                sortedYields.map((y, i) => (
                  <tr
                    key={y.id}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                      i === 0 ? 'bg-purple-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{y.protocol}</div>
                      <div className="text-xs text-gray-500">{y.name}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">{y.asset}</td>
                    <td className="px-4 py-3">
                      <ChainBadge chainName={y.chainName} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatPercent(y.historical.current)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-400">
                      {formatPercent(y.historical.avg7d)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${
                      sortBy === 'avg30d' ? 'text-purple-400 font-semibold' : 'text-gray-400'
                    }`}>
                      {formatPercent(y.historical.avg30d)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">
                      {formatPercent(y.historical.avg50d)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <TrendIcon trend={y.historical.trend} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <RiskBadge risk={y.risk} />
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {formatTVL(y.tvl)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          if (chainId !== y.chainId && switchChain) {
                            switchChain({ chainId: y.chainId });
                          }
                        }}
                        className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
                      >
                        Deposit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best Opportunities Summary */}
      {!loading && sortedYields.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm text-gray-400 mb-2">🏆 Best Sustained Yield (30d)</h3>
            <div className="text-2xl font-bold text-purple-400">
              {formatPercent(sortedYields[0].historical.avg30d)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {sortedYields[0].name} on {sortedYields[0].chainName}
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm text-gray-400 mb-2">📈 Trending Up</h3>
            <div className="text-2xl font-bold text-green-400">
              {sortedYields.filter((y) => y.historical.trend === 'up').length}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              opportunities with upward momentum
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm text-gray-400 mb-2">🛡️ Low Risk Options</h3>
            <div className="text-2xl font-bold text-blue-400">
              {sortedYields.filter((y) => y.risk === 'low').length}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              stable, battle-tested protocols
            </div>
          </div>
        </div>
      )}

      {/* Rebalance Suggestions */}
      {!loading && sortedYields.length > 0 && (
        <div className="mt-8 bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            💡 Rebalance Suggestions
          </h3>
          <div className="space-y-3">
            {/* Find pairs where same asset has better yield elsewhere */}
            {(() => {
              const suggestions: { from: YieldOpportunity; to: YieldOpportunity; improvement: number }[] = [];
              
              sortedYields.forEach((fromYield) => {
                const betterOption = sortedYields.find(
                  (y) =>
                    y.id !== fromYield.id &&
                    y.asset === fromYield.asset &&
                    y.historical.avg30d > fromYield.historical.avg30d * 1.1 // At least 10% better
                );
                if (betterOption && !suggestions.find((s) => s.from.asset === fromYield.asset)) {
                  suggestions.push({
                    from: fromYield,
                    to: betterOption,
                    improvement: (betterOption.historical.avg30d - fromYield.historical.avg30d) * 100,
                  });
                }
              });

              if (suggestions.length === 0) {
                return (
                  <p className="text-gray-500">
                    No significant rebalancing opportunities found. Your yields are already optimized!
                  </p>
                );
              }

              return suggestions.slice(0, 3).map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-sm text-gray-400">Move {s.from.asset} from</div>
                      <div className="font-medium">{s.from.name}</div>
                      <div className="text-xs text-gray-500">{s.from.chainName}</div>
                    </div>
                    <ArrowRightLeft className="w-5 h-5 text-purple-500" />
                    <div>
                      <div className="text-sm text-gray-400">to</div>
                      <div className="font-medium text-purple-400">{s.to.name}</div>
                      <div className="text-xs text-gray-500">{s.to.chainName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-semibold">
                      +{s.improvement.toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-500">30d avg improvement</div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
