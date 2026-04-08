'use client';

import { useState } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { ArrowRightLeft, TrendingUp, TrendingDown, Minus, RefreshCw, Filter } from 'lucide-react';
import { Badge, RiskBadge, ChainBadge } from '@/components/ui/badge';
import { Stat, StatGrid } from '@/components/ui/stat';
import { SkeletonTable } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageLayout, PageHeader } from '@/components/ui/page-layout';
import { DataTable, DataTableHeader, DataTableRow } from '@/components/ui/data-table';
import { useApiQuery } from '@/hooks/use-api-query';

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
  { id: 1, name: 'Ethereum' },
  { id: 8453, name: 'Base' },
  { id: 42161, name: 'Arbitrum' },
];

const ASSET_OPTIONS = ['All', 'USDC', 'WETH', 'LP'];

export default function RebalancePage() {
  const [selectedChain, setSelectedChain] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState('All');
  const [sortBy, setSortBy] = useState<'current' | 'avg7d' | 'avg30d' | 'avg50d'>('avg30d');
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const params = new URLSearchParams();
  if (selectedChain !== 0) params.set('chainId', selectedChain.toString());
  if (selectedAsset !== 'All') params.set('asset', selectedAsset);

  const { data, isLoading, refetch } = useApiQuery<{ yields: YieldOpportunity[] }>(
    ['yields', selectedChain.toString(), selectedAsset],
    `/api/yields?${params}`
  );

  const yields = data?.yields || [];

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
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <PageLayout>
      <PageHeader
        icon={<TrendingUp className="w-6 h-6 text-indigo-400" />}
        title="Yield Explorer"
        description="Live yields from DeFi Llama, Morpho, and Yearn. Sorted by 30d sustained APY."
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
        </div>

        <select
          value={selectedChain}
          onChange={(e) => setSelectedChain(parseInt(e.target.value))}
          className="select-base"
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
          className="select-base"
        >
          {ASSET_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {a === 'All' ? 'All Assets' : a}
            </option>
          ))}
        </select>

        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Sort Buttons */}
      <div className="flex gap-2 mb-4">
        <span className="text-sm text-muted-foreground py-1">Sort by:</span>
        {(['current', 'avg7d', 'avg30d', 'avg50d'] as const).map((key) => (
          <Button
            key={key}
            variant={sortBy === key ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSortBy(key)}
          >
            {key === 'current' ? 'Current' : key.toUpperCase()}
          </Button>
        ))}
      </div>

      {/* Yield Table */}
      <DataTable>
        <DataTableHeader>
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
        </DataTableHeader>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={11} className="p-4">
                <SkeletonTable rows={6} cols={8} />
              </td>
            </tr>
          ) : sortedYields.length === 0 ? (
            <tr>
              <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                No yields found
              </td>
            </tr>
          ) : (
            sortedYields.map((y, i) => (
              <DataTableRow key={y.id} highlight={i === 0}>
                <td className="px-4 py-3">
                  <div className="font-medium">{y.protocol}</div>
                  <div className="text-xs text-muted-foreground">{y.name}</div>
                </td>
                <td className="px-4 py-3 font-mono">{y.asset}</td>
                <td className="px-4 py-3">
                  <ChainBadge chain={y.chainName} />
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatPercent(y.historical.current)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                  {formatPercent(y.historical.avg7d)}
                </td>
                <td className={`px-4 py-3 text-right font-mono ${
                  sortBy === 'avg30d' ? 'text-indigo-400 font-semibold' : 'text-muted-foreground'
                }`}>
                  {formatPercent(y.historical.avg30d)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                  {formatPercent(y.historical.avg50d)}
                </td>
                <td className="px-4 py-3 text-center">
                  <TrendIcon trend={y.historical.trend} />
                </td>
                <td className="px-4 py-3 text-center">
                  <RiskBadge risk={y.risk} />
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {formatTVL(y.tvl)}
                </td>
                <td className="px-4 py-3 text-center">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (chainId !== y.chainId && switchChain) {
                        switchChain({ chainId: y.chainId });
                      }
                    }}
                  >
                    Deposit
                  </Button>
                </td>
              </DataTableRow>
            ))
          )}
        </tbody>
      </DataTable>

      {/* Best Opportunities Summary */}
      {!isLoading && sortedYields.length > 0 && (
        <StatGrid cols={3} className="mt-8">
          <Stat
            label="Best Sustained Yield (30d)"
            value={<span className="text-indigo-400">{formatPercent(sortedYields[0].historical.avg30d)}</span>}
            change={`${sortedYields[0].name} on ${sortedYields[0].chainName}`}
          />
          <Stat
            label="Trending Up"
            value={<span className="text-green-400">{sortedYields.filter((y) => y.historical.trend === 'up').length}</span>}
            change="opportunities with upward momentum"
          />
          <Stat
            label="Low Risk Options"
            value={<span className="text-blue-400">{sortedYields.filter((y) => y.risk === 'low').length}</span>}
            change="stable, battle-tested protocols"
          />
        </StatGrid>
      )}

      {/* Rebalance Suggestions */}
      {!isLoading && sortedYields.length > 0 && (
        <Card className="mt-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            Rebalance Suggestions
          </h3>
          <div className="space-y-3">
            {(() => {
              const suggestions: { from: YieldOpportunity; to: YieldOpportunity; improvement: number }[] = [];

              sortedYields.forEach((fromYield) => {
                const betterOption = sortedYields.find(
                  (y) =>
                    y.id !== fromYield.id &&
                    y.asset === fromYield.asset &&
                    y.historical.avg30d > fromYield.historical.avg30d * 1.1
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
                  <p className="text-muted-foreground">
                    No significant rebalancing opportunities found. Your yields are already optimized!
                  </p>
                );
              }

              return suggestions.slice(0, 3).map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-secondary rounded-lg p-4"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Move {s.from.asset} from</div>
                      <div className="font-medium">{s.from.name}</div>
                      <div className="text-xs text-muted-foreground">{s.from.chainName}</div>
                    </div>
                    <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                    <div>
                      <div className="text-sm text-muted-foreground">to</div>
                      <div className="font-medium text-indigo-400">{s.to.name}</div>
                      <div className="text-xs text-muted-foreground">{s.to.chainName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-semibold">
                      +{s.improvement.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">30d avg improvement</div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </Card>
      )}
    </PageLayout>
  );
}
