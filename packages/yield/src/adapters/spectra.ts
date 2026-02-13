/**
 * Spectra Yield Adapter
 * Fetches PT/YT yields from Spectra on Katana
 */

import { type Address } from "viem";
import { TOKENS, type YieldOpportunity } from "../config.js";

// Spectra Principal Token (PT) opportunities
// PT = discounted token that matures to full value
const SPECTRA_PTS: {
  id: string;
  name: string;
  address: Address;
  underlyingAsset: string;
  underlyingAddress: Address;
  maturity: Date;
  impliedApy: number; // APY based on discount to maturity
}[] = [
  {
    id: "spectra-pt-usdc-jun25",
    name: "PT-USDC (Jun 2025)",
    address: "0x0000000000000000000000000000000000000010" as Address, // TODO: real address
    underlyingAsset: "USDC",
    underlyingAddress: TOKENS.USDC.address,
    maturity: new Date("2025-06-30"),
    impliedApy: 0.072, // 7.2%
  },
  {
    id: "spectra-pt-weth-jun25",
    name: "PT-WETH (Jun 2025)",
    address: "0x0000000000000000000000000000000000000011" as Address, // TODO: real address
    underlyingAsset: "WETH",
    underlyingAddress: TOKENS.WETH.address,
    maturity: new Date("2025-06-30"),
    impliedApy: 0.048, // 4.8%
  },
  {
    id: "spectra-pt-wsteth-sep25",
    name: "PT-wstETH (Sep 2025)",
    address: "0x0000000000000000000000000000000000000012" as Address, // TODO: real address
    underlyingAsset: "wstETH",
    underlyingAddress: TOKENS.wstETH.address,
    maturity: new Date("2025-09-30"),
    impliedApy: 0.055, // 5.5%
  },
];

/**
 * Fetch Spectra PT yields
 */
export async function fetchSpectraYields(): Promise<YieldOpportunity[]> {
  const opportunities: YieldOpportunity[] = [];
  const now = new Date();

  for (const pt of SPECTRA_PTS) {
    // Calculate days to maturity
    const daysToMaturity = Math.ceil((pt.maturity.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysToMaturity <= 0) continue; // Skip expired PTs

    opportunities.push({
      id: pt.id,
      protocol: "spectra",
      name: pt.name,
      asset: pt.underlyingAsset,
      assetAddress: pt.underlyingAddress,
      apy: pt.impliedApy,
      tvl: 0n,
      contractAddress: pt.address,
      risk: "medium",
      description: `Fixed yield via Principal Token. Matures in ${daysToMaturity} days.`,
    });
  }

  return opportunities;
}

/**
 * Get best Spectra yield for an asset
 */
export async function getBestSpectraYield(asset: string): Promise<YieldOpportunity | null> {
  const yields = await fetchSpectraYields();
  const filtered = yields.filter((y) => y.asset.toUpperCase() === asset.toUpperCase());

  if (filtered.length === 0) return null;

  return filtered.reduce((best, current) => (current.apy > best.apy ? current : best));
}
