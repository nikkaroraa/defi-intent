import { NextResponse } from 'next/server';

// Types matching the yield package
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

// Katana yields (simulated since not on DeFiLlama)
const KATANA_YIELDS: YieldOpportunity[] = [
  {
    id: 'morpho-usdc-katana',
    protocol: 'Morpho',
    name: 'Morpho USDC',
    asset: 'USDC',
    apy: 0.082,
    tvl: '12500000',
    risk: 'low',
    description: 'Supply USDC to Morpho Blue',
    chainId: 747474,
    chainName: 'Katana',
    historical: {
      current: 0.082,
      avg7d: 0.079,
      avg30d: 0.076,
      avg50d: 0.073,
      trend: 'up',
      volatility: 'low',
    },
  },
  {
    id: 'morpho-weth-katana',
    protocol: 'Morpho',
    name: 'Morpho WETH',
    asset: 'WETH',
    apy: 0.045,
    tvl: '8200000',
    risk: 'low',
    description: 'Supply WETH to Morpho Blue',
    chainId: 747474,
    chainName: 'Katana',
    historical: {
      current: 0.045,
      avg7d: 0.043,
      avg30d: 0.041,
      avg50d: 0.039,
      trend: 'up',
      volatility: 'low',
    },
  },
  {
    id: 'yearn-usdc-katana',
    protocol: 'Yearn',
    name: 'Yearn USDC Vault',
    asset: 'USDC',
    apy: 0.095,
    tvl: '6800000',
    risk: 'medium',
    description: 'Yearn auto-compounding vault',
    chainId: 747474,
    chainName: 'Katana',
    historical: {
      current: 0.095,
      avg7d: 0.091,
      avg30d: 0.088,
      avg50d: 0.085,
      trend: 'up',
      volatility: 'medium',
    },
  },
  {
    id: 'yearn-weth-katana',
    protocol: 'Yearn',
    name: 'Yearn WETH Vault',
    asset: 'WETH',
    apy: 0.052,
    tvl: '4500000',
    risk: 'medium',
    description: 'Yearn auto-compounding vault',
    chainId: 747474,
    chainName: 'Katana',
    historical: {
      current: 0.052,
      avg7d: 0.054,
      avg30d: 0.051,
      avg50d: 0.048,
      trend: 'stable',
      volatility: 'medium',
    },
  },
  {
    id: 'spectra-usdc-katana',
    protocol: 'Spectra',
    name: 'Spectra PT-USDC',
    asset: 'USDC',
    apy: 0.11,
    tvl: '3200000',
    risk: 'medium',
    description: 'Fixed yield via principal token',
    chainId: 747474,
    chainName: 'Katana',
    historical: {
      current: 0.11,
      avg7d: 0.108,
      avg30d: 0.105,
      avg50d: 0.102,
      trend: 'up',
      volatility: 'low',
    },
  },
  {
    id: 'sushi-usdc-weth-katana',
    protocol: 'Sushi LP',
    name: 'Sushi USDC/WETH LP',
    asset: 'USDC-WETH',
    apy: 0.18,
    tvl: '2100000',
    risk: 'high',
    description: 'Provide liquidity, earn fees + rewards',
    chainId: 747474,
    chainName: 'Katana',
    historical: {
      current: 0.18,
      avg7d: 0.165,
      avg30d: 0.155,
      avg50d: 0.145,
      trend: 'up',
      volatility: 'high',
    },
  },
];

// Ethereum yields (from DeFiLlama-like data)
const ETH_YIELDS: YieldOpportunity[] = [
  {
    id: 'aave-usdc-eth',
    protocol: 'Aave V3',
    name: 'Aave USDC',
    asset: 'USDC',
    apy: 0.065,
    tvl: '1200000000',
    risk: 'low',
    description: 'Supply USDC to Aave V3',
    chainId: 1,
    chainName: 'Ethereum',
    historical: {
      current: 0.065,
      avg7d: 0.062,
      avg30d: 0.058,
      avg50d: 0.055,
      trend: 'up',
      volatility: 'low',
    },
  },
  {
    id: 'morpho-usdc-eth',
    protocol: 'Morpho',
    name: 'Morpho USDC',
    asset: 'USDC',
    apy: 0.072,
    tvl: '450000000',
    risk: 'low',
    description: 'Supply USDC to Morpho Blue',
    chainId: 1,
    chainName: 'Ethereum',
    historical: {
      current: 0.072,
      avg7d: 0.069,
      avg30d: 0.066,
      avg50d: 0.063,
      trend: 'up',
      volatility: 'low',
    },
  },
  {
    id: 'yearn-usdc-eth',
    protocol: 'Yearn',
    name: 'Yearn USDC',
    asset: 'USDC',
    apy: 0.085,
    tvl: '180000000',
    risk: 'medium',
    description: 'Yearn auto-compounding',
    chainId: 1,
    chainName: 'Ethereum',
    historical: {
      current: 0.085,
      avg7d: 0.082,
      avg30d: 0.078,
      avg50d: 0.075,
      trend: 'up',
      volatility: 'medium',
    },
  },
];

// Base yields
const BASE_YIELDS: YieldOpportunity[] = [
  {
    id: 'aero-usdc-base',
    protocol: 'Aerodrome',
    name: 'Aerodrome USDC/WETH',
    asset: 'USDC-WETH',
    apy: 0.22,
    tvl: '85000000',
    risk: 'high',
    description: 'Concentrated LP with AERO rewards',
    chainId: 8453,
    chainName: 'Base',
    historical: {
      current: 0.22,
      avg7d: 0.195,
      avg30d: 0.175,
      avg50d: 0.16,
      trend: 'up',
      volatility: 'high',
    },
  },
  {
    id: 'moonwell-usdc-base',
    protocol: 'Moonwell',
    name: 'Moonwell USDC',
    asset: 'USDC',
    apy: 0.058,
    tvl: '120000000',
    risk: 'low',
    description: 'Supply USDC to Moonwell',
    chainId: 8453,
    chainName: 'Base',
    historical: {
      current: 0.058,
      avg7d: 0.055,
      avg30d: 0.052,
      avg50d: 0.049,
      trend: 'up',
      volatility: 'low',
    },
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get('chainId');
  const asset = searchParams.get('asset');

  let yields = [...KATANA_YIELDS, ...ETH_YIELDS, ...BASE_YIELDS];

  if (chainId) {
    yields = yields.filter((y) => y.chainId === parseInt(chainId));
  }

  if (asset) {
    yields = yields.filter(
      (y) =>
        y.asset.toUpperCase().includes(asset.toUpperCase()) ||
        y.asset.toUpperCase() === asset.toUpperCase()
    );
  }

  // Sort by 30d average APY (sustained yield)
  yields.sort((a, b) => b.historical.avg30d - a.historical.avg30d);

  return NextResponse.json({ yields });
}
