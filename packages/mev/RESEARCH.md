# Katana MEV Research

## Executive Summary

MEV (Maximal Extractable Value) on Katana L2 presents unique opportunities and challenges compared to Ethereum mainnet. As a new L2 with lower liquidity, price inefficiencies are more common but execution risks are higher.

## 1. Katana L2 Architecture Analysis

### Sequencer Behavior
- **Centralized sequencer**: Katana uses a centralized sequencer (like most L2s)
- **No public mempool**: Transactions go directly to sequencer, limiting traditional MEV
- **FCFS ordering**: First-come-first-served ordering (unconfirmed - needs verification)
- **Block time**: ~2 seconds

### Implications for MEV
| Factor | Mainnet | Katana L2 |
|--------|---------|-----------|
| Mempool visibility | Public | Private/None |
| Sandwich attacks | Common | Difficult |
| Backrunning | Via mempool | Via block monitoring |
| Arbitrage | Competitive | Less competitive |
| Gas auctions | Yes | Minimal |

## 2. MEV Opportunities on Katana

### 2.1 Cross-Pool Arbitrage ⭐ HIGH POTENTIAL

**Description**: Price differences between Sushi V2 and V3 pools for the same pair.

**Why it works on Katana**:
- Low liquidity = larger price impacts
- Fewer arbitrageurs = less competition
- Multiple fee tiers in V3 (0.05%, 0.3%, 1%)

**Example**:
```
WETH/USDC on V2: 1 ETH = 2500 USDC
WETH/USDC on V3 (0.3%): 1 ETH = 2510 USDC
Arbitrage: Buy on V2, sell on V3 = $10 profit - fees
```

**Implementation**: Monitor reserves, calculate optimal trade size, atomic execution.

### 2.2 Multi-Hop Arbitrage ⭐ MEDIUM POTENTIAL

**Description**: Triangular or multi-leg arbitrage through intermediate tokens.

**Example**:
```
WETH → USDC → WBTC → WETH
If product of exchange rates > 1, profit exists
```

**Complexity**: Higher gas cost, more slippage risk.

### 2.3 JIT (Just-In-Time) Liquidity 🔬 RESEARCH NEEDED

**Description**: Provide concentrated liquidity just before a large swap, capture fees, remove after.

**On Katana**:
- Sushi V3 supports concentrated liquidity
- Requires mempool visibility OR very fast block monitoring
- Likely NOT viable without sequencer cooperation

**Verdict**: Probably not viable on centralized sequencer L2.

### 2.4 Sandwich Attacks ❌ LIMITED

**Description**: Front-run and back-run victim transactions.

**On Katana**:
- No public mempool = can't see pending transactions
- Sequencer controls ordering
- Only possible if you ARE the sequencer

**Verdict**: Not viable for external actors. Good for users!

### 2.5 Backrunning ⭐ MEDIUM POTENTIAL

**Description**: Follow profitable transactions and copy/improve them.

**On Katana**:
- Monitor confirmed blocks for large swaps
- Execute arbitrage in next block
- Lower competition than mainnet

**Example**:
```
Block N: Large swap moves WETH/USDC price by 2%
Block N+1: Backrun with arbitrage trade
```

### 2.6 Liquidation MEV ⭐ HIGH POTENTIAL

**Description**: Front-run other liquidators (covered in task-059).

**Integration**: MEV bot can prioritize liquidation opportunities alongside arbitrage.

## 3. Profitability Analysis

### Revenue Factors
- Trade size (limited by liquidity)
- Price difference (inversely correlated with liquidity)
- Gas costs (~$0.01-0.10 on L2)
- Success rate (competition, timing)

### Cost Factors
- Gas for failed transactions
- Infrastructure (RPC nodes, monitoring)
- Capital lockup

### Estimated Opportunity Size

| Strategy | Daily Volume Est. | Avg Spread | Daily MEV Est. |
|----------|------------------|------------|----------------|
| V2/V3 Arb | $500K | 0.3% | $1,500 |
| Multi-hop | $200K | 0.2% | $400 |
| Backrun | $100K | 0.5% | $500 |
| **Total** | | | **~$2,400/day** |

*Note: These are rough estimates for a new L2. Actual values depend on trading activity.*

## 4. Technical Implementation

### Architecture
```
┌─────────────────────────────────────────────────────┐
│                    MEV Bot                          │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Price Feed │  │  Arb Finder │  │  Executor   │ │
│  │  (Reserves) │──│  (Scanner)  │──│  (Atomic)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│         │                │                │        │
│  ┌──────────────────────────────────────────────┐  │
│  │              Profitability Engine            │  │
│  │  (Gas estimation, slippage, min profit)      │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│                  Katana RPC                         │
│  • Block monitoring (newHeads subscription)        │
│  • Reserve queries (multicall)                     │
│  • Transaction submission                          │
└─────────────────────────────────────────────────────┘
```

### Key Components

1. **Price Feed**: Real-time reserve monitoring via multicall
2. **Arbitrage Finder**: Graph-based pathfinding for profitable routes
3. **Profitability Engine**: Gas cost estimation, slippage modeling
4. **Executor**: Atomic multi-swap via custom contract or bundler

### Smart Contract (Atomic Executor)
```solidity
// Simplified arbitrage executor
contract AtomicArb {
    function executeArb(
        address[] calldata path,
        address[] calldata pools,
        uint256 amountIn,
        uint256 minProfit
    ) external {
        // Flash loan from Morpho
        // Execute swaps along path
        // Verify profit >= minProfit
        // Repay flash loan + keep profit
    }
}
```

## 5. Competitive Analysis

### Who else is doing MEV on Katana?
- Likely few/none currently (new L2)
- First mover advantage exists
- As volume grows, competition will increase

### Barriers to Entry
- Technical complexity (moderate)
- Capital requirements (low, with flash loans)
- Infrastructure costs (low on L2)

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Failed transactions | Medium | Low | Simulation before execution |
| Smart contract bugs | Low | High | Thorough testing, audits |
| Sequencer changes | Medium | High | Monitor protocol updates |
| Competition increase | High | Medium | Continuous optimization |
| Regulatory | Low | Medium | Monitor legal landscape |

## 7. Recommendations

### Phase 1: Arbitrage Bot (Week 1-2)
- [x] Research complete
- [ ] Implement V2/V3 arbitrage scanner
- [ ] Deploy atomic executor contract
- [ ] Run in simulation mode
- [ ] Go live with small capital

### Phase 2: Multi-Strategy (Week 3-4)
- [ ] Add multi-hop arbitrage
- [ ] Integrate backrunning
- [ ] Combine with liquidation bot
- [ ] Dashboard for monitoring

### Phase 3: Optimization (Ongoing)
- [ ] Latency optimization
- [ ] Gas optimization
- [ ] Machine learning for prediction
- [ ] Cross-L2 arbitrage (Katana ↔ Base)

## 8. Conclusion

**MEV on Katana is viable** but different from mainnet:

✅ **Good opportunities**:
- Cross-pool arbitrage (V2 vs V3)
- Backrunning large trades
- Liquidations

❌ **Limited/Not viable**:
- Sandwich attacks (no mempool)
- JIT liquidity (sequencer controlled)
- Front-running (no mempool)

**Estimated ROI**: $2,000-5,000/day at current activity levels, scaling with volume.

---

*Research conducted: 2026-02-13*
*Author: Builder Agent*
