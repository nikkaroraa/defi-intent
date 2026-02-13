import { NextResponse } from 'next/server';

// Mock liquidation opportunities for the dashboard
// In production, this would connect to the liquidator package

interface LiquidationOpportunity {
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

// Simulated opportunities for dashboard demo
const MOCK_OPPORTUNITIES: LiquidationOpportunity[] = [
  {
    id: '1',
    user: '0x7a16fF8270133F063aAb6C9977183D9e72835428',
    market: 'WETH/USDC',
    loanToken: 'USDC',
    collateralToken: 'WETH',
    healthFactor: 0.95,
    borrowAmount: '15000.00',
    collateralAmount: '5.2',
    maxRepayable: '7500.00',
    maxSeizable: '2.73',
    estimatedProfit: '375.00',
    timestamp: Date.now() - 120000,
  },
  {
    id: '2',
    user: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    market: 'WBTC/USDC',
    loanToken: 'USDC',
    collateralToken: 'WBTC',
    healthFactor: 0.88,
    borrowAmount: '45000.00',
    collateralAmount: '0.85',
    maxRepayable: '22500.00',
    maxSeizable: '0.42',
    estimatedProfit: '1125.00',
    timestamp: Date.now() - 45000,
  },
  {
    id: '3',
    user: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    market: 'WETH/DAI',
    loanToken: 'DAI',
    collateralToken: 'WETH',
    healthFactor: 0.92,
    borrowAmount: '8500.00',
    collateralAmount: '2.8',
    maxRepayable: '4250.00',
    maxSeizable: '1.47',
    estimatedProfit: '212.50',
    timestamp: Date.now() - 300000,
  },
];

// Recent liquidations (historical)
const RECENT_LIQUIDATIONS = [
  {
    id: 'liq-1',
    txHash: '0x1234...5678',
    user: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    market: 'WETH/USDC',
    repaidAmount: '5000.00',
    seizedAmount: '1.85',
    profit: '250.00',
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'liq-2',
    txHash: '0xabcd...efgh',
    user: '0xCA35b7d915458EF540aDe6068dFe2F44E8fa733c',
    market: 'WBTC/USDC',
    repaidAmount: '12000.00',
    seizedAmount: '0.22',
    profit: '600.00',
    timestamp: Date.now() - 7200000,
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'opportunities';

  if (type === 'opportunities') {
    // Filter by health factor threshold
    const maxHF = parseFloat(searchParams.get('maxHF') || '1.0');
    const filtered = MOCK_OPPORTUNITIES.filter((o) => o.healthFactor < maxHF);
    
    // Sort by profit
    filtered.sort((a, b) => parseFloat(b.estimatedProfit) - parseFloat(a.estimatedProfit));

    return NextResponse.json({
      opportunities: filtered,
      stats: {
        totalOpportunities: filtered.length,
        totalPotentialProfit: filtered.reduce((sum, o) => sum + parseFloat(o.estimatedProfit), 0).toFixed(2),
        avgHealthFactor: (filtered.reduce((sum, o) => sum + o.healthFactor, 0) / (filtered.length || 1)).toFixed(3),
      },
    });
  }

  if (type === 'history') {
    return NextResponse.json({
      liquidations: RECENT_LIQUIDATIONS,
      stats: {
        totalLiquidations: RECENT_LIQUIDATIONS.length,
        totalProfit: RECENT_LIQUIDATIONS.reduce((sum, l) => sum + parseFloat(l.profit), 0).toFixed(2),
      },
    });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
