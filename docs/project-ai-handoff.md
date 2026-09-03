# Project AI Hand-off Report: SENSEX 30 Basket Cycle Swing Trading Engine

* **System Version:** V1.0 (Production / Deployment Ready)
* **Architecture:** In-Memory Batch Engine with Human-In-The-Loop (HITL) Execution
* **Stack:** Google Sheets (UI/Database), Google Apps Script V8 (Backend Engine), Yahoo Finance API (NSE Feeds), Zerodha (Manual Execution Broker)
* **Repository:** `git@github-businesshub:zahiruddinsayed99-sys/sensex30-swing-engine.git`

---

## 1. Executive Summary & Strategy Philosophy

This project is a personal, deterministic, rule-based swing-trading system built for liquid constituents of the **SENSEX 30** universe. The core investment philosophy is:

$$\text{Trend} \longrightarrow \text{Dip } (\ge 5\%) \longrightarrow \text{Recovery (CAR)} \longrightarrow \text{Reclaim (20 DMA + VWAP)}$$

The design explicitly rejects speculative black-box AI/ML models in favor of verifiable, deterministic indicators and robust portfolio slot management.

---

## 2. Capital & Basket Allocation Model

The system operates on an active pool basket model designed for steady compounding while bounding drawdown risks:

* **Total Cycle Capital:** ₹1,00,000 divided into **25 fixed slots of ₹4,000**.
* **Portfolio Breadth Constraint:** Maximum **10 distinct stocks** open simultaneously.
* **Position Concentration Cap:** Maximum **5 tranches (slots = ₹20,000 max)** allocated to any single stock name.
* **Consolidated Basket Exit:** A combined unrealized gain of **$\ge +6.5\%$** across the active pool triggers a `CONSOLIDATED_TARGET_HIT` signal on the dashboard, prompting a full pool square-off and cycle reset.
* **Quarantine Boundary (-20% Hard Limit):** If any individual position drops past **$-20.0\%$**, its status switches to `QUARANTINED`. The system immediately freezes further averaging on that stock, allowing capital to circulate only through healthy candidates.

---

## 3. Technical Strategy Rules & Formulae

A symbol only qualifies for a `BUY` action if **all five criteria are met simultaneously**:

| Filter | Logic & Technical Definition | Condition |
| --- | --- | --- |
| **Trend Filter** | 20 DMA must be flat-to-rising ($DMA20_t \ge DMA20_{t-1}$) AND Close must be above 50 DMA. | `PASS` |
| **Dip Filter** | Close must reflect a minimum $5.0\%$ decline from the highest peak of the last 30 trading sessions. | `PASS` |
| **CAR Recovery** | **Cumulative Average Recovery**: Tracking cumulative mean of closes since the 30-day peak; cumulative average must hook upward with Close > Previous Day Low. | `PASS` |
| **20 DMA Reclaim** | EOD Close must be strictly greater than the 20 DMA. | `PASS` |
| **VWAP Reclaim** | EOD Close must be strictly greater than Previous Completed Session's Typical Price VWAP $\left(\frac{H + L + C}{3}\right)$. | `PASS` |
| **Tranche Guard** | Current position must be $< 5$ tranches and status $\ne$ `QUARANTINED`. | `PASS` |

### Ranking & Priority Algorithm

1. **"Diversify First" Rule:** If open positions $< 10$, candidate type `NEW_NAME` strictly takes precedence over `AVERAGING`.
2. **Deterministic Score:** Computed based on 20 DMA slope intensity, distance above 20 DMA, and distance above VWAP.
3. **Daily Action Limit:** Maximum **5 candidate orders** queued into `ACTION_QUEUE` per execution date.

---

## 4. Google Sheets Database Schema (Clean 10-Tab Architecture)

The system was refactored to eliminate the raw `MARKET_DATA` tab, processing historical bars purely in-memory (`UrlFetchApp.fetchAll`) to prevent Google Sheets size bloat.

```
[DASHBOARD]        -> Real-time portfolio metrics, exit status, interactive navigation links.
[SETTINGS]         -> Global parameters, slot sizes, cycle capital, technical thresholds.
[WATCHLIST]        -> 30 constituents with Yahoo Tickers (includes CHOLAFIN.NS; TATAMOTORS replaced).
[INDICATORS]       -> Daily snapshot of Close, 20 DMA, 50 DMA, VWAP, and CAR filter flags.
[POSITIONS]        -> Active and quarantined positions, blended average price, tranches used.
[SIGNALS]          -> Comprehensive evaluation output with transparent pass/fail reasons.
[ACTION_QUEUE]     -> Staging queue for morning Zerodha executions (max 5 slots).
[TRADE_LOG]        -> Immutable audit trail of completed fills with unique Execution IDs.
[SIGNAL_HISTORY]   -> Historical archive of qualified signals.
[SYSTEM_AUDIT]     -> Execution time, record counts, and error stack-trace logs.

```

---

## 5. Daily Operating Cycle (HITL Operational Routine)

```
                       [Every Weekday: 03:30 PM - 04:00 PM IST]
                                          │
                                          ▼
                       Google Time-Driven Trigger (runDailyEODJob)
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼                                             ▼
       In-Memory Batch Fetch                          Indicator & Filter Engine
   (2 Batches of 15 via Yahoo API)                  (Trend, Dip, CAR, Reclaims)
                   │                                             │
                   └──────────────────────┬──────────────────────┘
                                          ▼
                             Diversify-First Ranking Engine
                                          │
                                          ▼
                       ACTION_QUEUE Populated (Top 5 Max)
                                          │
             ═════════════════════════════╪═════════════════════════════
                                          │
                       [Next Morning: 09:45 AM - 11:00 AM IST]
                                          │
                                          ▼
                             Trader Reviews ACTION_QUEUE
                                          │
                                          ▼
                      Manual Order Execution in Zerodha App
                               (₹4,000 Fixed Slot)
                                          │
                                          ▼
                  Menu: "6. Complete Executed Trade (Zerodha Details)"
                 (Prompts for actual Qty & Price -> Updates POSITIONS)
                                          │
                                          ▼
                        DASHBOARD Live Monitoring During Session
                   (Triggers CONSOLIDATED_TARGET_HIT when PnL >= +6.5%)

```

---

## 6. Codebase File Manifest

```
sensex30-basket-engine/
├── src/
│   ├── Config.js           # Configuration constants, 10-tab schemas, SENSEX universe
│   ├── Dashboard.js        # UI Control panel layout, dynamic formulas, error handling
│   ├── Setup.js            # Automated 10-tab structure initializer and cleaner
│   ├── Indicators.js       # Fast parallel fetch (fetchAll) & CAR indicator math
│   ├── SignalEngine.js     # Filter pipeline evaluator, state machine, EOD automated job
│   ├── RankingEngine.js    # Diversify-first sorting, dense ranking, action queue staging
│   ├── ExecutionManager.js # HITL modal prompts, fill reconciler, blended avg position math
│   └── Validation.js       # UI menus, integrity validation, trigger installer
├── appsscript.json         # Google Apps Script manifest (V8 runtime, Asia/Kolkata timezone)
├── .gitignore              # Ignores credentials, system files, clasp metadata
└── README.md               # Developer documentation

```

---

## 7. Important Operational Notes & Edge Cases

1. **Watchlist Ticker Exception:**
* `TATAMOTORS` was removed due to Yahoo Finance ticker mapping instability (`TATAMOTORS.BO` returning HTTP 404). It was replaced by **`CHOLAFIN` (`CHOLAFIN.NS`)**, maintaining robust liquidity in the Financial Services basket.


2. **Formula Guard:**
* Dashboard metric `AVERAGEIF` is wrapped in `IFERROR(..., 0)` to prevent `#DIV/0!` errors when no positions are active.


3. **Trigger Reinstallation:**
* If triggers need reset, run **`⚡ SENSEX 30 Engine` > `⏰ Activate Daily 3:30 PM EOD Trigger**` directly from the sheet menu.


4. **Git Remote Alias:**
* The local Git repository uses SSH alias `github-businesshub` mapped in `~/.ssh/config`. Standard push command:
```bash
git push origin main

```