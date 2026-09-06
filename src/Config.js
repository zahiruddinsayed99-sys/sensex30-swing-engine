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

  const watchData = watchSheet.getDataRange().getValues();
  const activeTickers = [];

  // Watchlist Columns: [Symbol, Yahoo Ticker, Active, Sector, Universe, Universe As Of, Universe Version]
  // We use [Symbol, Company Name (we can use Sector temporarily if Name is not there, let's map by indices), Yahoo Ticker, Tier, Status]
  // Wait, let's check Watchlist headers: ["Symbol", "Yahoo Ticker", "Active", "Sector", "Universe", "Universe As Of", "Universe Version"]

  // To match the SSOT refactoring, columns: [Symbol, Company Name, Yahoo Ticker, Tier, Status]
  // Columns map to: Symbol: 0, Company Name: 1, Yahoo Ticker: 2, Tier: 3, Status: 4

  for (let r = 1; r < watchData.length; r++) {
    const sym = watchData[r][0];
    const name = watchData[r][1];
    const ticker = watchData[r][2];
    const tier = watchData[r][3];
    const status = watchData[r][4]; // Status

    // Filter out empty rows or rows where Status === "INACTIVE" or similar
    if (!sym) continue;

    if (status === "ACTIVE" || status === "YES" || status === true) {
      activeTickers.push({
        symbol: sym,
        name: name,
        ticker: ticker,
        tier: tier
      });
    }
  }

  if (activeTickers.length !== 100) {
    console.warn(`Warning: Active stock count is ${activeTickers.length}, expected exactly 100.`);
  }

  return activeTickers;
}