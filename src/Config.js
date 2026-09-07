/**
 * Global Configuration & Schema Definitions — SENSEX 30 Basket Cycle Model V1.0
 */
const CONFIG = {
  VERSION: "1.0",
  UNIVERSE: "SENSEX 30",
  SIGNAL_TIME: "15:30",
  EXECUTION_WINDOW: { START: "09:45", END: "11:00" },

  // Basket Cycle Parameters
  CYCLE_CAPITAL: 100000,          // Total pool: ₹1,00,000
  SLOT_SIZE: 4000,                 // ₹4,000 per slot action
  TOTAL_CYCLE_SLOTS: 25,          // 25 slots
  MAX_DISTINCT_STOCKS: 10,        // Max 10 distinct stocks in basket
  MAX_TRANCHES_PER_STOCK: 5,      // Max 5 slots (₹20,000) per stock
  BASKET_TARGET_PERCENT: 6.5,     // Active pool blended target (+6.5%)
  QUARANTINE_THRESHOLD_PERCENT: -20.0, // Hard quarantine boundary (-20%)
  MAX_SHARE_PRICE: 5500,

  // Strategy Technical Parameters
  DMA_PERIOD: 20,
  DMA50_PERIOD: 50,
  VWAP_METHOD: "PREVIOUS_SESSION",
  DIP_THRESHOLD_PERCENT: 5.0,
  DAILY_BUY_LIMIT: 5,

  PRIMARY_DATA_SOURCE: "YAHOO_NSE",
  DATA_VALIDATION: true
};

CONFIG.HEDGE = {
  ENABLED: true,
  TICKER: "SENSEXIETF.NS",
  SYMBOL: "SENSEXIETF",
  SLOT_BUDGET: 4000,
  MAX_SLOT_BUDGET: 5500,
  TARGET_PROFIT_PCT: 4.0, // Tranche-wise profit harvest target
  TIERS: [
    { id: "H1", dipPct: 1.5, shares: 2 },
    { id: "H2", dipPct: 3.5, shares: 2 },
    { id: "H3", dipPct: 5.0, shares: 3 }
  ]
};

const SHEET_SCHEMAS = {
  DASHBOARD: [],
  SETTINGS: ["Key", "Value", "Description", "Type"],
  WATCHLIST: ["Symbol", "Company Name", "Yahoo Ticker", "Tier", "Status"],
  INDICATORS: ["Date", "Symbol", "Close", "DMA20", "DMA20 Prior", "DMA50", "Previous Session VWAP", "Volume", "Average Volume", "Trend Status", "Dip Status", "Recovery Status", "DMA20 Reclaim", "VWAP Reclaim"],
  POSITIONS: ["Symbol", "Status", "Current Tranche", "Slots Used", "Total Invested", "Quantity", "Average Price", "Current Price", "Unrealized PnL %", "Basket Status", "Last Buy Date", "Next Eligible Tranche"],
  SIGNALS: ["Signal ID", "Signal Date", "Signal Time", "Execution Date", "Symbol", "Candidate Type", "Current Tranche", "Next Tranche", "Close", "DMA20", "DMA50", "Previous VWAP", "Dip", "Recovery", "DMA20 Reclaim", "VWAP Reclaim", "Trend", "Rank Score", "Rank", "Final Signal", "Reason", "Signal Status", "Frozen"],
  ACTION_QUEUE: ["Execution Date", "Symbol", "Asset Type", "Action Type", "Tranche", "Slot Amount", "Rank", "Rank Score", "Signal ID", "Validity", "Action Status", "User Confirmation", "Execution ID"],
  HEDGE_POSITIONS: ["Tranche ID", "Symbol", "Entry Date", "Buy Price", "Qty", "Target Price", "Status"],
  TRADE_LOG: ["Execution ID", "Date", "Time", "Symbol", "Action", "Tranche", "Quantity", "Execution Price", "Gross Value", "Broker", "Signal ID", "User Confirmation", "Notes"],
  SIGNAL_HISTORY: ["Date", "Symbol", "Candidate Type", "Close", "DMA20", "DMA50", "VWAP", "Trend", "Rank Score", "Rank", "Final Signal", "Reason"],
  SYSTEM_AUDIT: ["Timestamp", "User", "Function", "Action", "Status", "Records Processed", "Result", "Error", "Execution Time (ms)"]
};

const UNIVERSE_MODES = {
  SENSEX_30: "SENSEX 30 (Core 30)",
  SENSEX_60: "SENSEX 60 (Core 30 + Next 30)",
  BSE_100: "BSE 100 (Full 100 Universe)",
  CUSTOM: "CUSTOM_SELECTED (From Watchlist)"
};

function getActiveConstituents() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const watchSheet = ss.getSheetByName("WATCHLIST");

  if (!watchSheet) {
    throw new Error("WATCHLIST sheet not found. Cannot load universe.");
  }

  const lastRow = watchSheet.getLastRow();
  if (lastRow < 2) {
    throw new Error("WATCHLIST has no data rows.");
  }

  // Row 1 (Headers) + Row 2 onwards (Data)
  const watchData = watchSheet.getRange(1, 1, lastRow, 5).getValues();
  const headers = watchData[0].map(h => String(h).trim().toUpperCase());

  // Dynamic header mapping taaki column aage-piche ho toh bhi fail na ho
  const symIdx = headers.indexOf("SYMBOL") !== -1 ? headers.indexOf("SYMBOL") : 0;
  const nameIdx = headers.indexOf("COMPANY NAME") !== -1 ? headers.indexOf("COMPANY NAME") : 1;
  const tickIdx = headers.indexOf("YAHOO TICKER") !== -1 ? headers.indexOf("YAHOO TICKER") : 2;
  const tierIdx = headers.indexOf("TIER") !== -1 ? headers.indexOf("TIER") : 3;
  const statusIdx = headers.indexOf("STATUS") !== -1 ? headers.indexOf("STATUS") : 4;

  const activeTickers = [];

  for (let r = 1; r < watchData.length; r++) {
    const sym = String(watchData[r][symIdx] || "").trim().toUpperCase();
    const name = String(watchData[r][nameIdx] || "").trim();
    let ticker = String(watchData[r][tickIdx] || "").trim().toUpperCase();
    const tier = String(watchData[r][tierIdx] || "").trim() || "TIER_1";
    const status = String(watchData[r][statusIdx] || "").trim().toUpperCase();

    if (!sym) continue;

    // Auto-fix Yahoo ticker if empty
    if (!ticker) {
      ticker = sym.endsWith(".NS") ? sym : `${sym}.NS`;
    }

    // Accept if Status is explicitly ACTIVE, YES, TRUE, ya agar Status column blank ho
    if (status === "ACTIVE" || status === "YES" || status === "TRUE" || status === "") {
      activeTickers.push({
        symbol: sym,
        name: name || sym,
        ticker: ticker,
        tier: tier
      });
    }
  }

  if (activeTickers.length === 0) {
    throw new Error(`No active stocks found in WATCHLIST. Checked ${watchData.length - 1} rows.`);
  }

  Logger.log(`Successfully loaded ${activeTickers.length} active stocks from WATCHLIST.`);
  return activeTickers;
}
