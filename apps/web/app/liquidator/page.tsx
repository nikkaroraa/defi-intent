'use client';

import { useState } from 'react';
import {
  Skull,
  TrendingDown,
  DollarSign,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { Stat, StatGrid } from '@/components/ui/stat';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SkeletonTable } from '@/components/ui/skeleton';
import { PageLayout, PageHeader } from '@/components/ui/page-layout';
import { DataTable, DataTableHeader, DataTableRow } from '@/components/ui/data-table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useApiQuery } from '@/hooks/use-api-query';

interface Opportunity {
  id: string;
  user: string;
  market: string;
  loanToken: string;
  collateralToken: string;
  healthFactor: number;
  borrowAmount: string;
  collateralAmount: string;
  maxRepayable: string;
  maxSeizable: string;
  estimatedProfit: string;
  timestamp: number;
}

interface Liquidation {
  id: string;
  txHash: string;
  user: string;
  market: string;
  repaidAmount: string;
  seizedAmount: string;
  profit: string;
  timestamp: number;
}

interface OppData {
  opportunities: Opportunity[];
  stats: { totalOpportunities: number; totalPotentialProfit: string; avgHealthFactor: string };
}

interface HistData {
  liquidations: Liquidation[];
  stats: { totalLiquidations: number; totalProfit: string };
}

export default function LiquidatorPage() {
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data: oppData, isLoading: oppLoading, refetch } = useApiQuery<OppData>(
    ['liquidations-opportunities'],
    '/api/liquidations?type=opportunities',
    { refetchInterval: autoRefresh ? 10000 : false }
  );

  const { data: histData, isLoading: histLoading } = useApiQuery<HistData>(
    ['liquidations-history'],
    '/api/liquidations?type=history'
  );

  const opportunities = oppData?.opportunities || [];
  const stats = oppData?.stats || { totalOpportunities: 0, totalPotentialProfit: '0', avgHealthFactor: '0' };
  const history = histData?.liquidations || [];
  const historyStats = histData?.stats || { totalLiquidations: 0, totalProfit: '0' };
  const loading = oppLoading || histLoading;

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  const HealthBadge = ({ hf }: { hf: number }) => {
    let color = 'bg-green-500/20 text-green-400 border-green-500/30';
    let icon = <CheckCircle className="w-3 h-3" />;

    if (hf < 0.9) {
      color = 'bg-red-500/20 text-red-400 border-red-500/30';
      icon = <AlertTriangle className="w-3 h-3" />;
    } else if (hf < 1) {
      color = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      icon = <TrendingDown className="w-3 h-3" />;
    }

    return (
      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${color}`}>
        {icon}
        {hf.toFixed(3)}
      </span>
    );
  };

  return (
    <PageLayout>
      <PageHeader
        icon={<Skull className="w-6 h-6 text-red-500" />}
        title="Liquidation Bot"
        description="Monitor and execute Morpho Blue liquidations"
      />

      {/* Stats Grid */}
      <StatGrid cols={4} className="mb-6">
        <Stat
          label="Opportunities"
          value={<span className="text-red-400">{stats.totalOpportunities}</span>}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <Stat
          label="Potential Profit"
          value={<span className="text-green-400">${stats.totalPotentialProfit}</span>}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <Stat
          label="Avg Health Factor"
          value={<span className="text-yellow-400">{stats.avgHealthFactor}</span>}
          icon={<Activity className="w-4 h-4" />}
        />
        <Stat
          label="Total Liquidated"
          value={<span className="text-indigo-400">${historyStats.totalProfit}</span>}
          icon={<CheckCircle className="w-4 h-4" />}
        />
      </StatGrid>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <Tabs defaultValue="opportunities">
          <div className="flex items-center justify-between w-full">
            <TabsList>
              <TabsTrigger value="opportunities">
                Opportunities ({opportunities.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                History ({history.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center gap-3 mt-4 mb-2 justify-end">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-border"
              />
              Auto-refresh
            </label>
            <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Opportunities Tab */}
          <TabsContent value="opportunities">
            <DataTable>
              <DataTableHeader>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3 text-center">Health</th>
                <th className="px-4 py-3 text-right">Debt</th>
                <th className="px-4 py-3 text-right">Collateral</th>
                <th className="px-4 py-3 text-right">Max Repay</th>
                <th className="px-4 py-3 text-right text-green-400">Est. Profit</th>
                <th className="px-4 py-3 text-center">Age</th>
                <th className="px-4 py-3 text-center">Action</th>
              </DataTableHeader>
              <tbody>
                {oppLoading ? (
                  <tr>
                    <td colSpan={9} className="p-4">
                      <SkeletonTable rows={4} cols={7} />
                    </td>
                  </tr>
                ) : opportunities.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      No liquidatable positions found
                    </td>
                  </tr>
                ) : (
                  opportunities.map((opp) => (
                    <DataTableRow key={opp.id} highlight={opp.healthFactor < 0.9}>
                      <td className="px-4 py-3 font-mono text-sm">
                        {formatAddress(opp.user)}
                      </td>
                      <td className="px-4 py-3 font-medium">{opp.market}</td>
                      <td className="px-4 py-3 text-center">
                        <HealthBadge hf={opp.healthFactor} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        ${opp.borrowAmount}
                        <div className="text-xs text-muted-foreground">{opp.loanToken}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {opp.collateralAmount}
                        <div className="text-xs text-muted-foreground">{opp.collateralToken}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                        ${opp.maxRepayable}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-green-400 font-semibold">
                        ${opp.estimatedProfit}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground text-sm">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatTime(opp.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button variant="danger" size="sm">
                          <Zap className="w-3 h-3 mr-1" />
                          Liquidate
                        </Button>
                      </td>
                    </DataTableRow>
                  ))
                )}
              </tbody>
            </DataTable>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <DataTable>
              <DataTableHeader>
                <th className="px-4 py-3">TX</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3 text-right">Repaid</th>
                <th className="px-4 py-3 text-right">Seized</th>
                <th className="px-4 py-3 text-right text-green-400">Profit</th>
                <th className="px-4 py-3 text-center">Time</th>
              </DataTableHeader>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No liquidation history yet
                    </td>
                  </tr>
                ) : (
                  history.map((liq) => (
                    <DataTableRow key={liq.id}>
                      <td className="px-4 py-3 font-mono text-sm text-indigo-400">
                        {liq.txHash}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {formatAddress(liq.user)}
                      </td>
                      <td className="px-4 py-3 font-medium">{liq.market}</td>
                      <td className="px-4 py-3 text-right font-mono">${liq.repaidAmount}</td>
                      <td className="px-4 py-3 text-right font-mono">{liq.seizedAmount}</td>
                      <td className="px-4 py-3 text-right font-mono text-green-400 font-semibold">
                        ${liq.profit}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground text-sm">
                        {formatTime(liq.timestamp)}
                      </td>
                    </DataTableRow>
                  ))
                )}
              </tbody>
            </DataTable>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bot Status */}
      <Card className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Bot Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Min Profit Threshold</label>
            <input
              type="text"
              defaultValue="$10"
              className="input-base w-full"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Max Gas Price (gwei)</label>
            <input
              type="text"
              defaultValue="50"
              className="input-base w-full"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">Execution Mode</label>
            <select className="select-base w-full">
              <option>Simulation (Dry Run)</option>
              <option>Direct Liquidation</option>
              <option>Flash Loan</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="danger">Start Bot</Button>
        </div>
      </Card>
    </PageLayout>
  );
}
