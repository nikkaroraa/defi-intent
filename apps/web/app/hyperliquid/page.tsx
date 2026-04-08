'use client';

import {
  Waves,
  TrendingUp,
  PieChart,
  ExternalLink,
  Percent,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stat, StatGrid } from '@/components/ui/stat';
import { SkeletonTable, SkeletonCard } from '@/components/ui/skeleton';
import { PageLayout, PageHeader } from '@/components/ui/page-layout';
import { DataTable, DataTableHeader, DataTableRow } from '@/components/ui/data-table';
import { useApiQuery } from '@/hooks/use-api-query';

interface HLPInfo {
  tvl: number;
  apy: number;
  positions: Array<{
    coin: string;
    exposure: number;
    weight: number;
  }>;
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

interface LendingRate {
  asset: string;
  supplyApy: number;
  borrowApy: number;
  utilization: number;
  totalSupply: number;
}

interface HyperliquidData {
  hlp: HLPInfo;
  lending: LendingRate[];
}

export default function HyperliquidPage() {
  const { data, isLoading } = useApiQuery<HyperliquidData>(
    ['hyperliquid'],
    '/api/hyperliquid'
  );

  const hlp = data?.hlp || null;
  const lendingRates = data?.lending || [];

  const formatUSD = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  const formatPercent = (val: number, showSign = false) => {
    const sign = showSign && val > 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
  };

  return (
    <PageLayout>
      <PageHeader
        icon={<Waves className="w-6 h-6 text-cyan-500" />}
        title="Hyperliquid"
        description="HLP vault, lending rates, and yield opportunities"
        actions={
          <a
            href="https://app.hyperliquid.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            Open Hyperliquid App <ExternalLink className="w-3 h-3" />
          </a>
        }
      />

      {/* HLP Card */}
      {isLoading ? (
        <SkeletonCard />
      ) : hlp && (
        <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-800/50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                HLP (Hyperliquid Liquidity Provider)
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Protocol vault providing liquidity for all perpetual markets
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-cyan-400">
                {formatPercent(hlp.apy)}
              </div>
              <div className="text-sm text-muted-foreground">APY</div>
            </div>
          </div>

          <StatGrid cols={4} className="mb-6">
            <Stat label="TVL" value={formatUSD(hlp.tvl)} />
            <Stat
              label="Daily"
              value={<span className={hlp.performance.daily >= 0 ? 'text-green-400' : 'text-red-400'}>
                {formatPercent(hlp.performance.daily, true)}
              </span>}
            />
            <Stat
              label="Weekly"
              value={<span className={hlp.performance.weekly >= 0 ? 'text-green-400' : 'text-red-400'}>
                {formatPercent(hlp.performance.weekly, true)}
              </span>}
            />
            <Stat
              label="Monthly"
              value={<span className={hlp.performance.monthly >= 0 ? 'text-green-400' : 'text-red-400'}>
                {formatPercent(hlp.performance.monthly, true)}
              </span>}
            />
          </StatGrid>

          {/* Position Breakdown */}
          <div>
            <h3 className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Position Breakdown
            </h3>
            <div className="space-y-2">
              {hlp.positions.map((pos) => (
                <div key={pos.coin} className="flex items-center gap-3">
                  <span className="w-16 text-sm font-medium">{pos.coin}</span>
                  <div className="flex-1 bg-secondary rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                      style={{ width: `${pos.weight * 100}%` }}
                    />
                  </div>
                  <span className="w-16 text-sm text-muted-foreground text-right">
                    {(pos.weight * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Button variant="primary" size="lg" className="w-full mt-6 bg-cyan-600 hover:bg-cyan-500">
            Deposit into HLP
          </Button>
        </div>
      )}

      {/* Lending Rates */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Percent className="w-5 h-5 text-green-500" />
          Lending & Borrowing Rates
        </h2>

        <DataTable>
          <DataTableHeader>
            <th className="px-4 py-3">Asset</th>
            <th className="px-4 py-3 text-right">Supply APY</th>
            <th className="px-4 py-3 text-right">Borrow APY</th>
            <th className="px-4 py-3 text-right">Utilization</th>
            <th className="px-4 py-3 text-right">Total Supply</th>
            <th className="px-4 py-3 text-center">Action</th>
          </DataTableHeader>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-4">
                  <SkeletonTable rows={4} cols={6} />
                </td>
              </tr>
            ) : (
              lendingRates.map((rate) => (
                <DataTableRow key={rate.asset}>
                  <td className="px-4 py-3 font-medium">{rate.asset}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-400">
                    {formatPercent(rate.supplyApy)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-red-400">
                    {formatPercent(rate.borrowApy)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 bg-secondary rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            rate.utilization > 80
                              ? 'bg-red-500'
                              : rate.utilization > 60
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${rate.utilization}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12">
                        {rate.utilization}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatUSD(rate.totalSupply)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button variant="primary" size="sm" className="bg-cyan-600 hover:bg-cyan-500">
                      Supply
                    </Button>
                  </td>
                </DataTableRow>
              ))
            )}
          </tbody>
        </DataTable>
      </div>

      {/* Yield Comparison */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">
          Yield Comparison: Hyperliquid vs Others
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-2">USDC Supply</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-cyan-400">Hyperliquid</span>
                <span className="font-mono font-semibold">8.50%</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Aave V3</span>
                <span className="font-mono">3.50%</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Morpho</span>
                <span className="font-mono">4.20%</span>
              </div>
            </div>
          </div>
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-2">ETH Supply</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-cyan-400">Hyperliquid</span>
                <span className="font-mono font-semibold">3.10%</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Lido</span>
                <span className="font-mono">3.50%</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Aave V3</span>
                <span className="font-mono">1.80%</span>
              </div>
            </div>
          </div>
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-2">HLP vs GMX GLP</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-cyan-400">HLP</span>
                <span className="font-mono font-semibold">25.50%</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GMX GLP</span>
                <span className="font-mono">18.20%</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Gains Network</span>
                <span className="font-mono">15.80%</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </PageLayout>
  );
}
