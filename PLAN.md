# DeFi Intent Layer — Project Plan

## Vision
Natural language interface to DeFi across chains. Make DeFi as easy as talking to a friend.

> "Deposit 100 USDC into the best yield"
> "What's my liquidation risk?"
> "Swap half my ETH to AUSD"

---

## Goals

1. **Grow DeFi Intent** — Onboard normies, reduce friction
2. **Build Nik's brand** — AI + DeFi thought leader, build in public
3. **Monetize** — Free tier + premium features

---

## Product Spec

### Core Features (MVP)

| Feature | Description |
|---------|-------------|
| **Intent Parser** | NL → structured DeFi action (deposit, withdraw, swap, stake) |
| **Yield Finder** | "Best yield for USDC" → ranks DeFi Intent pools by APY |
| **Position Viewer** | "Show my positions" → fetches wallet state |
| **Risk Analyzer** | "Am I safe?" → checks health factors, liquidation risk |
| **Action Builder** | Constructs transaction, shows preview before execute |

### Premium Features (v2)

| Feature | Price Point |
|---------|-------------|
| **Auto-execute** | Execute intents without manual confirm | $10/mo |
| **Portfolio alerts** | Liquidation warnings, yield drops | $5/mo |
| **Multi-chain** | Same interface for Base, Arb, etc. | $15/mo |
| **API access** | For other apps to integrate | Usage-based |
| **Telegram bot** | Chat-based DeFi | Free (drives adoption) |

---

## Tech Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
│  Next.js App (Web) + Telegram Bot + Future: Mobile      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│                   Intent Engine                          │
│  1. Parse NL → Structured Intent                        │
│  2. Validate (balances, approvals, limits)              │
│  3. Route to correct protocol                           │
│  4. Build transaction(s)                                │
│  5. Return preview OR execute                           │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              Protocol Adapters                          │
│  Sushi (swaps) | Morpho (lend/borrow) | Yearn (vaults) │
│  Spectra (PT/YT) | AUSD (mint/redeem)                  │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              L2 RPC + Indexers                      │
│  Read: wallet state, pool data, prices                  │
│  Write: transactions via user wallet                    │
└─────────────────────────────────────────────────────────┘
```

---

## Intent Schema

```typescript
interface Intent {
  type: 'deposit' | 'withdraw' | 'swap' | 'stake' | 'borrow' | 'repay' | 'query';
  
  // For actions
  tokenIn?: string;      // "USDC", "ETH", etc.
  tokenOut?: string;     // For swaps
  amount?: string;       // "100", "half", "all"
  protocol?: string;     // "morpho", "sushi", "yearn", "best"
  
  // For queries
  query?: 'positions' | 'yields' | 'risk' | 'balance';
  
  // Metadata
  confidence: number;    // 0-1 how sure we are about parsing
  rawInput: string;      // Original user message
}
```

---

## Example Flows

### "Deposit 100 USDC into best yield"

1. **Parse** → `{ type: 'deposit', tokenIn: 'USDC', amount: '100', protocol: 'best' }`
2. **Fetch yields** → Query Yearn, Morpho, Spectra pools for USDC
3. **Rank** → Yearn USDC vault: 80% APY (winner)
4. **Check** → User has 100+ USDC? Approved?
5. **Build** → Approval tx (if needed) + Deposit tx
6. **Preview** → "Deposit 100 USDC into Yearn vault (80% APY). Gas: ~$0.02. Confirm?"
7. **Execute** → User signs, we broadcast

### "What's my liquidation risk?"

1. **Parse** → `{ type: 'query', query: 'risk' }`
2. **Fetch** → Get Morpho positions for connected wallet
3. **Calculate** → Health factor, distance to liquidation
4. **Respond** → "You have 1 Morpho position. Health: 1.8 (safe). You'd be liquidated if ETH drops 40%."

---

## Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 14, TypeScript, Tailwind, wagmi/viem |
| **Intent Engine** | Node.js, Claude API for NL parsing |
| **Protocol Data** | DefiLlama API, direct RPC calls, The Graph |
| **Wallet** | RainbowKit / ConnectKit |
| **Telegram Bot** | grammy.js |
| **Database** | SQLite (local) → Postgres (scale) |
| **Hosting** | Vercel (web), Railway (bot) |

---

## Roadmap

### Week 1: Foundation
- [ ] Project setup (Next.js, Tailwind, wagmi)
- [ ] Intent parser (Claude API)
- [ ] Basic UI (chat interface)
- [ ] Connect wallet flow
- [ ] Query: "show my balances"

### Week 2: Core Actions
- [ ] Yield fetcher (Yearn, Morpho, Spectra APIs)
- [ ] "Best yield" finder
- [ ] Deposit flow (preview + execute)
- [ ] Swap flow via Sushi
- [ ] Position viewer

### Week 3: Polish + Telegram
- [ ] Risk analyzer (health factors)
- [ ] Telegram bot version
- [ ] Tweet demo, launch on CT
- [ ] Collect feedback

### Week 4: Premium + Monetize
- [ ] User accounts (for saving preferences)
- [ ] Alert system (liquidation warnings)
- [ ] Stripe integration
- [ ] Premium tier launch

---

## Content Plan (Build in Public)

| Day | Tweet |
|-----|-------|
| 1 | "building something for defi-intent. defi should be as easy as texting." |
| 3 | Video: first demo of intent parsing |
| 5 | Thread: "how I'm using AI to make DeFi accessible" |
| 7 | "shipped the MVP. try it: [link]" |
| 10 | Thread: "5 things I learned building an AI DeFi interface" |
| 14 | Telegram bot launch |
| 21 | Premium features, monetization story |

---

## File Structure

```
defi-intent/
├── apps/
│   ├── web/              # Next.js frontend
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── bot/              # Telegram bot
├── packages/
│   ├── intent-engine/    # Core parsing + routing
│   ├── protocol-adapters/ # Sushi, Morpho, Yearn, etc.
│   └── shared/           # Types, utils
├── PLAN.md
└── README.md
```

---

## Success Metrics

| Metric | Target (30 days) |
|--------|------------------|
| Users | 500+ |
| Intents processed | 5,000+ |
| TVL influenced | $100K+ deposited via tool |
| Twitter impressions | 50K+ |
| Revenue | First paying customer |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| AI misparses intent | Always show preview, require confirm |
| Smart contract risk | Read-only queries by default, audit actions |
| Low adoption | Telegram bot lowers friction, Twitter marketing |
| DeFi Intent changes APIs | Abstract protocol layer, easy to update |

---

## Start Tonight

1. Set up monorepo structure
2. Build intent parser (Claude API)
3. Create basic chat UI
4. Implement balance query
5. Push to GitHub: nikkaroraa/defi-intent
