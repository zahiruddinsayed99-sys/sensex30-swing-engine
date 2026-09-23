The GitHub issue aligns accurately with every parameter, formula, and logic gate discussed:

* **SSOT Universe Rule:** Reads dynamically from `WATCHLIST` tab, eliminating duplicate lists in code.
* **Mutual Exclusion & Priority:** Hedge engine checks for entries strictly when `stockQualifiedCount === 0`.
* **Calibrated 3-Tier Grid:** SENSEXIETF entry tiers at $\ge 1.5\%$, $\ge 3.5\%$, and $\ge 5.0\%$ cumulative drawdown from rolling 20D peak, confirmed via reversal triggers.
* **FIFO Tranche-wise Exit:** Independent $+4.0\%$ profit harvest per individual tier to directly cushion portfolio MTM.
* **Liquidity Override:** Full hedge liquidation happens strictly if cash is insufficient ($< ₹4,000$) when $\ge 2$ equity buys qualify.

---

### End-to-End System Flow Architecture

```
                       [ 3:30 PM: Run EOD Scan ]
                                   │
                                   ▼
             ┌───────────────────────────────────────────┐
             │   1. Load Universe (SSOT from Sheet)      │
             │   Read 100 Active Constituents from       │
             │   WATCHLIST Tab (Zero Code Duplication)   │
             └─────────────────────┬─────────────────────┘
                                   │
                                   ▼
             ┌───────────────────────────────────────────┐
             │   2. Equity Scan Engine (Alpha Hunt)      │
             │   Evaluate: 50 DMA, 5% Dip, CAR, 20 DMA   │
             │   (e.g., ASTRAL, MPHASIS, LODHA)          │
             └─────────────────────┬─────────────────────┘
                                   │
                                   ▼
                    [ Were Stock BUYs Triggered? ]
                                   │
                ┌──────────────────┴──────────────────┐
        YES (Count > 0)                         NO (Count == 0)
                │                                     │
                ▼                                     ▼
   ┌───────────────────────────┐        ┌───────────────────────────┐
   │ Check Cash Balance        │        │ Activate HedgeEngine      │
   │ Is Cash < ₹4,000 &        │        │ (SENSEXIETF Accumulator)  │
   │ Stock Buys >= 2?          │        └─────────────┬─────────────┘
   └────────────┬──────────────┘                      │
                │                                     ▼
         ┌──────┴──────┐                [ Calculate 20D Drawdown ]
        YES            NO               ┌───────────────────────────┐
         │              │               │ Dip >= 1.5% + Green Day   │──► Buy H1 (2 Qty)
         ▼              ▼               │ Dip >= 3.5% + VWAP Rebound│──► Buy H2 (2 Qty)
   ┌───────────┐  ┌───────────┐         │ Dip >= 5.0% + Pivot Bounce│──► Buy H3 (3 Qty)
   │ Force     │  │ Route     │         └─────────────┬─────────────┘
   │ Liquidate │  │ Equity    │                       │
   │ All Hedge │  │ Buys to   │                       ▼
   │ Tranches  │  │ Queue     │         [ Scan Open ETF Tranches ]
   └─────┬─────┘  └─────┬─────┘         ┌───────────────────────────┐
         │              │               │ For each open lot:        │
         │              │               │ CMP >= Lot Price x 1.04?  │
         │              │               └─────────────┬─────────────┘
         │              │                             │
         │              │                       YES ──┴── NO
         │              │                        │        │
         │              │                        ▼        ▼
         │              │                 ┌───────────┐ ┌───────────┐
         │              │                 │ Harvest   │ │ Hold Lot  │
         │              │                 │ +4% Gain  │ │ in Hedge  │
         │              │                 │ (FIFO)    │ │ Positions │
         │              │                 └─────┬─────┘ └───────────┘
         │              │                       │
         ▼              ▼                       ▼
   ┌────────────────────────────────────────────────────────┐
   │               3. ACTION_QUEUE Population               │
   │   Formatted rows: EQUITY vs INDEX_ETF (CNC LIMIT)      │
   │   Ready for Next-Day 9:15 AM Broker Execution          │
   └────────────────────────────────────────────────────────┘

```

The system safely segregates capital preservation, alpha generation, and automated cash rebalancing into a clean execution loop.
---
### System Flow Summary (Beginner Breakdown)

1. **Step 1 (Daily Scan - 3:30 PM):** Sheet ke `WATCHLIST` tab se 100 stocks load hote hain. Code ko haath lagane ki zaroorat nahi.
2. **Step 2 (Stock Scanner):** Engine check karta hai ki kya kisi acche stock mein dip ke baad reversal (bounce) aaya hai.
3. **Step 3 (Decision Branch):**
* **Stocks Mile:** Agar cash hai toh stock buy (`T1`). Agar cash kam hai aur $\ge 2$ stocks hain, toh ETF bech kar paisa stocks mein rotate hoga.
* **Stocks Nahi Mile (Market Down):** Engine defensive hedge mode mein switch hota hai aur `SENSEXIETF` ko 3 levels (1.5%, 3.5%, 5.0%) par thoda-thoda khareedta hai.


4. **Step 4 (Harvest & Cushion):** Har ETF tranche +4% gain par profit book karke open unrealized loss ko cash se cushion karta hai.
5. **Step 5 (Action Queue):** Saare ready orders broker mein execute karne ke liye `ACTION_QUEUE` sheet mein line up ho jate hain.

### Quick Visual Reference Sheet

* **Green Path (`EQUITY`):** High Alpha capture — jab market normal ya strong ho.
* **Blue Path (`INDEX_ETF`):** Capital Shield — jab market gire aur stock buys zero ho jayein.
* **Auto-Balance:** Dono systems ek doosre ko balance karte hain taaki portfolio kabhi bhi unhedged crash na jhele.
