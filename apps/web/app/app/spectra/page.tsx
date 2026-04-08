'use client';

import { useState } from 'react';
import {
  Lock,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton';
import { PageLayout, PageHeader } from '@/components/ui/page-layout';
import { DataTable, DataTableHeader, DataTableRow } from '@/components/ui/data-table';
import { useApiQuery } from '@/hooks/use-api-query';

interface Comparison {
  asset: string;
  maturity: string;
  daysToMaturity: number;
  fixedAPY: number;
  variableAPY: number;
  ptPrice: number;
  ytPrice: number;
  recommendation: 'fixed' | 'variable' | 'neutral';
  reason: string;
}

interface FixedYield {
  id: string;
  name: string;
  asset: string;
  apy: number;
  tvl: string;
  description: string;
  maturity: string;
  ptPrice: number;
}

export default function SpectraPage() {
  const [selectedAsset, setSelectedAsset] = useState<string>('all');

  const { data: compData, isLoading: compLoading } = useApiQuery<{ comparisons: Comparison[] }>(
    ['spectra-comparisons'],
    '/api/yields?type=comparison'
  );

  const { data: fixedData, isLoading: fixedLoading } = useApiQuery<{ yields: FixedYield[] }>(
    ['spectra-fixed'],
    '/api/yields?type=fixed'
  );

  const comparisons = compData?.comparisons || [];
  const fixedYields = fixedData?.yields || [];
  const loading = compLoading || fixedLoading;

  const formatPercent = (val: number) => `${(val * 100).toFixed(2)}%`;

  const filteredComparisons =
    selectedAsset === 'all'
      ? comparisons
      : comparisons.filter((c) => c.asset === selectedAsset);

  const assets = ['all', ...Array.from(new Set(comparisons.map((c) => c.asset)))];

  return (
    <PageLayout>
      <PageHeader
        icon={<Lock className="w-6 h-6 text-blue-500" />}
        title="Spectra Finance"
        description="Fixed-rate yields via PT/YT tokenization. Lock in your APY."
      />

      {/* How It Works */}
      <Card variant="gradient" className="mb-8 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-blue-800/50">
        <h2 className="text-lg font-semibold mb-4">How Spectra Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
              1
            </div>
            <div>
              <div className="font-medium">Deposit IBT</div>
              <div className="text-sm text-muted-foreground">
                Deposit yield-bearing tokens (yvUSDC, etc.)
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold shrink-0">
              2
            </div>
            <div>
              <div className="font-medium">Get PT + YT</div>
              <div className="text-sm text-muted-foreground">
                Receive Principal Token + Yield Token
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold shrink-0">
              3
            </div>
            <div>
              <div className="font-medium">Choose Strategy</div>
              <div className="text-sm text-muted-foreground">
                Hold PT (fixed yield) or YT (leveraged variable)
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Asset Filter */}
      <div className="flex gap-2 mb-6">
        {assets.map((asset) => (
          <Button
            key={asset}
            variant={selectedAsset === asset ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedAsset(asset)}
          >
            {asset === 'all' ? 'All Assets' : asset}
          </Button>
        ))}
      </div>

      {/* Fixed vs Variable Comparison */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Fixed vs Variable Comparison
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredComparisons.map((comp) => (
              <Card key={`${comp.asset}-${comp.maturity}`}>
                {/* Header */}
                <div className="bg-secondary -mx-6 -mt-6 px-4 py-3 mb-4 border-b border-border rounded-t-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{comp.asset}</span>
                    <span className="text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {comp.daysToMaturity} days to maturity
                    </span>
                  </div>
                  <Badge
                    variant={comp.recommendation === 'fixed' ? 'info' : 'default'}
                  >
                    {comp.recommendation === 'fixed' ? 'Fixed Better' : 'Variable Better'}
                  </Badge>
                </div>

                {/* Comparison */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div
                    className={`p-4 rounded-lg border ${
                      comp.recommendation === 'fixed'
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-border bg-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Fixed (PT)</span>
                      <Lock className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold text-blue-400">
                      {formatPercent(comp.fixedAPY)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      PT Price: {comp.ptPrice.toFixed(4)}
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-lg border ${
                      comp.recommendation === 'variable'
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-border bg-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Variable</span>
                      <TrendingUp className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-2xl font-bold text-indigo-400">
                      {formatPercent(comp.variableAPY)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Current rate</div>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="bg-secondary rounded-lg p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                    <span className="text-muted-foreground">{comp.reason}</span>
                  </div>
                </div>

                <Button variant="primary" className="w-full mt-4">
                  <Zap className="w-4 h-4 mr-2" />
                  Deposit into PT
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Fixed Yield Opportunities */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-blue-500" />
          Fixed Yield Opportunities
        </h2>

        <DataTable>
          <DataTableHeader>
            <th className="px-4 py-3">Market</th>
            <th className="px-4 py-3">Asset</th>
            <th className="px-4 py-3 text-right">Fixed APY</th>
            <th className="px-4 py-3 text-right">PT Price</th>
            <th className="px-4 py-3 text-right">Maturity</th>
            <th className="px-4 py-3 text-center">Action</th>
          </DataTableHeader>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4">
                  <SkeletonTable rows={4} cols={6} />
                </td>
              </tr>
            ) : fixedYields.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No fixed yield opportunities
                </td>
              </tr>
            ) : (
              fixedYields.map((y: any) => (
                <DataTableRow key={y.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{y.name}</div>
                    <div className="text-xs text-muted-foreground">{y.description}</div>
                  </td>
                  <td className="px-4 py-3 font-mono">{y.asset}</td>
                  <td className="px-4 py-3 text-right font-mono text-blue-400 font-semibold">
                    {formatPercent(y.apy)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {y.ptPrice?.toFixed(4) || '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {y.maturity || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button variant="primary" size="sm">Deposit</Button>
                  </td>
                </DataTableRow>
              ))
            )}
          </tbody>
        </DataTable>
      </div>

      {/* Educational Section */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Understanding PT & YT</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Principal Token (PT)
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Trades at a discount to underlying</li>
              <li>Redeemable 1:1 at maturity</li>
              <li>Discount = your fixed yield</li>
              <li>Low risk, predictable returns</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-indigo-400 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Yield Token (YT)
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Claims yield generated until maturity</li>
              <li>Leveraged exposure to variable rates</li>
              <li>Value approaches 0 at maturity</li>
              <li>High risk, speculative</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
            <div className="text-sm text-yellow-200">
              <strong>Note:</strong> YT is a speculative instrument. Only invest what you can
              afford to lose. PT is safer for fixed-income strategies.
            </div>
          </div>
        </div>
      </Card>
    </PageLayout>
  );
}
