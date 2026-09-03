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

    // Strategy Technical Parameters
    DMA_PERIOD: 20,
    DMA50_PERIOD: 50,
    VWAP_METHOD: "PREVIOUS_SESSION",
    DIP_THRESHOLD_PERCENT: 5.0,
    DAILY_BUY_LIMIT: 5,

    PRIMARY_DATA_SOURCE: "YAHOO_NSE",
    DATA_VALIDATION: true
};

const SHEET_SCHEMAS = {
    DASHBOARD: [],
    SETTINGS: ["Key", "Value", "Description", "Type"],
    WATCHLIST: ["Symbol", "Yahoo Ticker", "Active", "Sector", "Universe", "Universe As Of", "Universe Version"],
    INDICATORS: ["Date", "Symbol", "Close", "DMA20", "DMA20 Prior", "DMA50", "Previous Session VWAP", "Volume", "Average Volume", "Trend Status", "Dip Status", "Recovery Status", "DMA20 Reclaim", "VWAP Reclaim"],
    POSITIONS: ["Symbol", "Status", "Current Tranche", "Slots Used", "Total Invested", "Quantity", "Average Price", "Current Price", "Unrealized PnL %", "Basket Status", "Last Buy Date", "Next Eligible Tranche"],
    SIGNALS: ["Signal ID", "Signal Date", "Signal Time", "Execution Date", "Symbol", "Candidate Type", "Current Tranche", "Next Tranche", "Close", "DMA20", "DMA50", "Previous VWAP", "Dip", "Recovery", "DMA20 Reclaim", "VWAP Reclaim", "Trend", "Rank Score", "Rank", "Final Signal", "Reason", "Signal Status", "Frozen"],
    ACTION_QUEUE: ["Execution Date", "Symbol", "Action Type", "Tranche", "Slot Amount", "Rank", "Rank Score", "Signal ID", "Validity", "Action Status", "User Confirmation", "Execution ID"],
    TRADE_LOG: ["Execution ID", "Date", "Time", "Symbol", "Action", "Tranche", "Quantity", "Execution Price", "Gross Value", "Broker", "Signal ID", "User Confirmation", "Notes"],
    SIGNAL_HISTORY: ["Date", "Symbol", "Candidate Type", "Close", "DMA20", "DMA50", "VWAP", "Trend", "Rank Score", "Rank", "Final Signal", "Reason"],
    SYSTEM_AUDIT: ["Timestamp", "User", "Function", "Action", "Status", "Records Processed", "Result", "Error", "Execution Time (ms)"]
};

// SENSEX 30 Constituents (NSE Tickers; BSE .BO for TATAMOTORS)
const SENSEX_30_UNIVERSE = [
    { symbol: "RELIANCE", ticker: "RELIANCE.NS", sector: "Energy" },
    { symbol: "TCS", ticker: "TCS.NS", sector: "Information Technology" },
    { symbol: "HDFCBANK", ticker: "HDFCBANK.NS", sector: "Financial Services" },
    { symbol: "ICICIBANK", ticker: "ICICIBANK.NS", sector: "Financial Services" },
    { symbol: "BHARTIARTL", ticker: "BHARTIARTL.NS", sector: "Telecommunication" },
    { symbol: "INFY", ticker: "INFY.NS", sector: "Information Technology" },
    { symbol: "SBIN", ticker: "SBIN.NS", sector: "Financial Services" },
    { symbol: "ITC", ticker: "ITC.NS", sector: "FMCG" },
    { symbol: "HINDUNILVR", ticker: "HINDUNILVR.NS", sector: "FMCG" },
    { symbol: "LT", ticker: "LT.NS", sector: "Capital Goods" },
    { symbol: "BAJFINANCE", ticker: "BAJFINANCE.NS", sector: "Financial Services" },
    { symbol: "HCLTECH", ticker: "HCLTECH.NS", sector: "Information Technology" },
    { symbol: "MARUTI", ticker: "MARUTI.NS", sector: "Automobile" },
    { symbol: "SUNPHARMA", ticker: "SUNPHARMA.NS", sector: "Healthcare" },
    { symbol: "ADANIENT", ticker: "ADANIENT.NS", sector: "Metals & Mining" },
    { symbol: "CHOLAFIN", ticker: "CHOLAFIN.NS", sector: "Financial Services" },
    { symbol: "KOTAKBANK", ticker: "KOTAKBANK.NS", sector: "Financial Services" },
    { symbol: "NTPC", ticker: "NTPC.NS", sector: "Power" },
    { symbol: "TITAN", ticker: "TITAN.NS", sector: "Consumer Durables" },
    { symbol: "AXISBANK", ticker: "AXISBANK.NS", sector: "Financial Services" },
    { symbol: "ONGC", ticker: "ONGC.NS", sector: "Energy" },
    { symbol: "POWERGRID", ticker: "POWERGRID.NS", sector: "Power" },
    { symbol: "TATASTEEL", ticker: "TATASTEEL.NS", sector: "Metals & Mining" },
    { symbol: "M&M", ticker: "M&M.NS", sector: "Automobile" },
    { symbol: "ASIANPAINT", ticker: "ASIANPAINT.NS", sector: "Consumer Durables" },
    { symbol: "ULTRACEMCO", ticker: "ULTRACEMCO.NS", sector: "Construction Materials" },
    { symbol: "BAJAJFINSV", ticker: "BAJAJFINSV.NS", sector: "Financial Services" },
    { symbol: "NESTLEIND", ticker: "NESTLEIND.NS", sector: "FMCG" },
    { symbol: "TECHM", ticker: "TECHM.NS", sector: "Information Technology" },
    { symbol: "JSWSTEEL", ticker: "JSWSTEEL.NS", sector: "Metals & Mining" }
];