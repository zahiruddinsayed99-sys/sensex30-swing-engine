# SENSEX 100 Swing Trading Engine — Basket Cycle Model (V1.0)

A semi-automated, human-in-the-loop (HITL) swing trading system built using Google Sheets, Google Apps Script, and Yahoo Finance market feeds.

## System Architecture

- **Universe**: BSE 100 (100 constituents) liquid bluechip constituents.
- **Capital Allocation**: ₹1,00,000 total cycle pool (24 slots of ₹4,000 each).
- **Portfolio Constraint**: Max 6 distinct stocks. Per-stock cap is 4 tranches (max ₹16,000).
- **Consolidated Target**: Active pool blended target at +6.0% gain triggers full basket exit.
- **Quarantine Boundary**: Positions dropping past -20% are quarantined to freeze averaging.

## Strategy Engine Rules

1. **Trend Filter**: Macro Trend Filter: CMP > 200 EMA (Structural Bull Trend).
2. **Dip Filter**: Dynamic Pullback: Low <= 20 EMA * 1.01 AND CMP >= 20 EMA * 0.985.
3. **Recovery / Confirmation**: CMP >= Prior Day High OR (CMP > VWAP AND CMP > Prior Close).
4. **Reclaim Rule**: EOD Close > 20 DMA AND EOD Close > Previous Session Typical Price VWAP.
5. **Priority Rule**: Diversify First (fill up to 6 distinct names), then allow averaging.
6. **Execution Window**: 09:45 AM – 11:00 AM IST manual Zerodha trade confirmation.

## Repository File Layout

- `src/Config.js`: Global parameters, parameters schema, and constituent tickers.
- `src/Indicators.js`: In-memory parallel batch market data fetcher and CAR state math.
- `src/SignalEngine.js`: Rule evaluator, filter pipeline, and trigger jobs.
- `src/RankingEngine.js`: Diversify-first priority queue and max 5 daily candidate limit.
- `src/ExecutionManager.js`: HITL manual trade logging, blended position calculator.
- `src/Dashboard.js`: Google Sheets UI layout and summary metrics.
- `src/Setup.js`: 10-tab sheet initializer.
- `src/Validation.js`: Menu triggers and structural schema validators.