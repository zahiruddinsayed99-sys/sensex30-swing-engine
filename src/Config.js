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

const UNIVERSE_MODES = {
  SENSEX_30: "SENSEX 30 (Core 30)",
  SENSEX_60: "SENSEX 60 (Core 30 + Next 30)",
  BSE_100: "BSE 100 (Full 100 Universe)",
  CUSTOM: "CUSTOM_SELECTED (From Watchlist)"
};

const MASTER_UNIVERSE_100 = [
  // --- TIER 1: SENSEX 30 (Core) ---
  { symbol: "RELIANCE", name: "Reliance Industries", ticker: "RELIANCE.NS", tier: "SENSEX_30" },
  { symbol: "TCS", name: "Tata Consultancy Services", ticker: "TCS.NS", tier: "SENSEX_30" },
  { symbol: "HDFCBANK", name: "HDFC Bank", ticker: "HDFCBANK.NS", tier: "SENSEX_30" },
  { symbol: "ICICIBANK", name: "ICICI Bank", ticker: "ICICIBANK.NS", tier: "SENSEX_30" },
  { symbol: "INFY", name: "Infosys", ticker: "INFY.NS", tier: "SENSEX_30" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", ticker: "BHARTIARTL.NS", tier: "SENSEX_30" },
  { symbol: "ITC", name: "ITC Ltd", ticker: "ITC.NS", tier: "SENSEX_30" },
  { symbol: "SBIN", name: "State Bank of India", ticker: "SBIN.NS", tier: "SENSEX_30" },
  { symbol: "LT", name: "Larsen & Toubro", ticker: "LT.NS", tier: "SENSEX_30" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", ticker: "HINDUNILVR.NS", tier: "SENSEX_30" },
  { symbol: "AXISBANK", name: "Axis Bank", ticker: "AXISBANK.NS", tier: "SENSEX_30" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", ticker: "KOTAKBANK.NS", tier: "SENSEX_30" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", ticker: "BAJFINANCE.NS", tier: "SENSEX_30" },
  { symbol: "MARUTI", name: "Maruti Suzuki", ticker: "MARUTI.NS", tier: "SENSEX_30" },
  { symbol: "M&M", name: "Mahindra & Mahindra", ticker: "M&M.NS", tier: "SENSEX_30" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", ticker: "SUNPHARMA.NS", tier: "SENSEX_30" },
  { symbol: "HCLTECH", name: "HCL Technologies", ticker: "HCLTECH.NS", tier: "SENSEX_30" },
  { symbol: "TITAN", name: "Titan Company", ticker: "TITAN.NS", tier: "SENSEX_30" },
  { symbol: "NTPC", name: "NTPC Ltd", ticker: "NTPC.NS", tier: "SENSEX_30" },
  { symbol: "POWERGRID", name: "Power Grid Corp", ticker: "POWERGRID.NS", tier: "SENSEX_30" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement", ticker: "ULTRACEMCO.NS", tier: "SENSEX_30" },
  { symbol: "TATASTEEL", name: "Tata Steel", ticker: "TATASTEEL.NS", tier: "SENSEX_30" },
  { symbol: "ASIANPAINT", name: "Asian Paints", ticker: "ASIANPAINT.NS", tier: "SENSEX_30" },
  { symbol: "TECHM", name: "Tech Mahindra", ticker: "TECHM.NS", tier: "SENSEX_30" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank", ticker: "INDUSINDBK.NS", tier: "SENSEX_30" },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv", ticker: "BAJAJFINSV.NS", tier: "SENSEX_30" },
  { symbol: "NESTLEIND", name: "Nestle India", ticker: "NESTLEIND.NS", tier: "SENSEX_30" },
  { symbol: "JSWSTEEL", name: "JSW Steel", ticker: "JSWSTEEL.NS", tier: "SENSEX_30" },
  { symbol: "TATACONSUM", name: "Tata Consumer Products", ticker: "TATACONSUM.NS", tier: "SENSEX_30" },
  { symbol: "CHOLAFIN", name: "Cholamandalam Inv & Fin", ticker: "CHOLAFIN.NS", tier: "SENSEX_30" },

  // --- TIER 2: SENSEX NEXT 30 ---
  { symbol: "ADANIENT", name: "Adani Enterprises", ticker: "ADANIENT.NS", tier: "NEXT_30" },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", ticker: "BAJAJ-AUTO.NS", tier: "NEXT_30" },
  { symbol: "HAL", name: "Hindustan Aeronautics", ticker: "HAL.NS", tier: "NEXT_30" },
  { symbol: "ONGC", name: "Oil & Natural Gas Corp", ticker: "ONGC.NS", tier: "NEXT_30" },
  { symbol: "COALINDIA", name: "Coal India", ticker: "COALINDIA.NS", tier: "NEXT_30" },
  { symbol: "SHRIRAMFIN", name: "Shriram Finance", ticker: "SHRIRAMFIN.NS", tier: "NEXT_30" },
  { symbol: "DIVISLAB", name: "Divis Laboratories", ticker: "DIVISLAB.NS", tier: "NEXT_30" },
  { symbol: "HINDALCO", name: "Hindalco Industries", ticker: "HINDALCO.NS", tier: "NEXT_30" },
  { symbol: "GRASIM", name: "Grasim Industries", ticker: "GRASIM.NS", tier: "NEXT_30" },
  { symbol: "EICHERMOT", name: "Eicher Motors", ticker: "EICHERMOT.NS", tier: "NEXT_30" },
  { symbol: "TVSMOTOR", name: "TVS Motor Company", ticker: "TVSMOTOR.NS", tier: "NEXT_30" },
  { symbol: "WIPRO", name: "Wipro Ltd", ticker: "WIPRO.NS", tier: "NEXT_30" },
  { symbol: "SBILIFE", name: "SBI Life Insurance", ticker: "SBILIFE.NS", tier: "NEXT_30" },
  { symbol: "JIOFIN", name: "Jio Financial Services", ticker: "JIOFIN.NS", tier: "NEXT_30" },
  { symbol: "VBL", name: "Varun Beverages", ticker: "VBL.NS", tier: "NEXT_30" },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals", ticker: "APOLLOHOSP.NS", tier: "NEXT_30" },
  { symbol: "BRITANNIA", name: "Britannia Industries", ticker: "BRITANNIA.NS", tier: "NEXT_30" },
  { symbol: "TATAPOWER", name: "Tata Power", ticker: "TATAPOWER.NS", tier: "NEXT_30" },
  { symbol: "HDFCLIFE", name: "HDFC Life Insurance", ticker: "HDFCLIFE.NS", tier: "NEXT_30" },
  { symbol: "CIPLA", name: "Cipla Ltd", ticker: "CIPLA.NS", tier: "NEXT_30" },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp", ticker: "HEROMOTOCO.NS", tier: "NEXT_30" },
  { symbol: "INDHOTEL", name: "Indian Hotels Co", ticker: "INDHOTEL.NS", tier: "NEXT_30" },
  { symbol: "DRREDDY", name: "Dr Reddys Laboratories", ticker: "DRREDDY.NS", tier: "NEXT_30" },
  { symbol: "MAXHEALTH", name: "Max Healthcare", ticker: "MAXHEALTH.NS", tier: "NEXT_30" },
  { symbol: "BEL", name: "Bharat Electronics", ticker: "BEL.NS", tier: "NEXT_30" },
  { symbol: "PIDILITIND", name: "Pidilite Industries", ticker: "PIDILITIND.NS", tier: "NEXT_30" },
  { symbol: "GAIL", name: "GAIL India", ticker: "GAIL.NS", tier: "NEXT_30" },
  { symbol: "AMBUJACEM", name: "Ambuja Cements", ticker: "AMBUJACEM.NS", tier: "NEXT_30" },
  { symbol: "VEDL", name: "Vedanta Ltd", ticker: "VEDL.NS", tier: "NEXT_30" },
  { symbol: "ETERNAL", name: "Eternal (Zomato) Ltd", ticker: "ETERNAL.NS", tier: "NEXT_30" },

  // --- TIER 3: BSE 100 EXTENDED LEADERS (Next 40) ---
  { symbol: "ADANIPORTS", name: "Adani Ports & SEZ", ticker: "ADANIPORTS.NS", tier: "TOP_40" },
  { symbol: "BPCL", name: "Bharat Petroleum", ticker: "BPCL.NS", tier: "TOP_40" },
  { symbol: "IOC", name: "Indian Oil Corp", ticker: "IOC.NS", tier: "TOP_40" },
  { symbol: "SIEMENS", name: "Siemens India", ticker: "SIEMENS.NS", tier: "TOP_40" },
  { symbol: "ABB", name: "ABB India", ticker: "ABB.NS", tier: "TOP_40" },
  { symbol: "DLF", name: "DLF Ltd", ticker: "DLF.NS", tier: "TOP_40" },
  { symbol: "HAVELLS", name: "Havells India", ticker: "HAVELLS.NS", tier: "TOP_40" },
  { symbol: "GODREJCP", name: "Godrej Consumer Products", ticker: "GODREJCP.NS", tier: "TOP_40" },
  { symbol: "DABUR", name: "Dabur India", ticker: "DABUR.NS", tier: "TOP_40" },
  { symbol: "SHREECEM", name: "Shree Cement", ticker: "SHREECEM.NS", tier: "TOP_40" },
  { symbol: "BANKBARODA", name: "Bank of Baroda", ticker: "BANKBARODA.NS", tier: "TOP_40" },
  { symbol: "PNB", name: "Punjab National Bank", ticker: "PNB.NS", tier: "TOP_40" },
  { symbol: "CANBK", name: "Canara Bank", ticker: "CANBK.NS", tier: "TOP_40" },
  { symbol: "PFC", name: "Power Finance Corp", ticker: "PFC.NS", tier: "TOP_40" },
  { symbol: "RECLTD", name: "REC Ltd", ticker: "RECLTD.NS", tier: "TOP_40" },
  { symbol: "IRFC", name: "Indian Railway Finance", ticker: "IRFC.NS", tier: "TOP_40" },
  { symbol: "TRENT", name: "Trent Ltd", ticker: "TRENT.NS", tier: "TOP_40" },
  { symbol: "INTERGLOBE", name: "InterGlobe Aviation (IndiGo)", ticker: "INDIGO.NS", tier: "TOP_40" },
  { symbol: "POLYCAB", name: "Polycab India", ticker: "POLYCAB.NS", tier: "TOP_40" },
  { symbol: "PERSISTENT", name: "Persistent Systems", ticker: "PERSISTENT.NS", tier: "TOP_40" },
  { symbol: "LTIM", name: "LTIMindtree", ticker: "LTIM.BO", tier: "TOP_40" },
  { symbol: "MPHASIS", name: "Mphasis Ltd", ticker: "MPHASIS.NS", tier: "TOP_40" },
  { symbol: "COFORGE", name: "Coforge Ltd", ticker: "COFORGE.NS", tier: "TOP_40" },
  { symbol: "COLPAL", name: "Colgate-Palmolive", ticker: "COLPAL.NS", tier: "TOP_40" },
  { symbol: "MARICO", name: "Marico Ltd", ticker: "MARICO.NS", tier: "TOP_40" },
  { symbol: "BERGEPAINT", name: "Berger Paints", ticker: "BERGEPAINT.NS", tier: "TOP_40" },
  { symbol: "ICICIPRULI", name: "ICICI Prudential Life", ticker: "ICICIPRULI.NS", tier: "TOP_40" },
  { symbol: "ICICIGI", name: "ICICI Lombard", ticker: "ICICIGI.NS", tier: "TOP_40" },
  { symbol: "MUTHOOTFIN", name: "Muthoot Finance", ticker: "MUTHOOTFIN.NS", tier: "TOP_40" },
  { symbol: "BAJAJHLDNG", name: "Bajaj Holdings", ticker: "BAJAJHLDNG.NS", tier: "TOP_40" },
  { symbol: "LODHA", name: "Macrotech Developers (Lodha)", ticker: "LODHA.NS", tier: "TOP_40" },
  { symbol: "GODREJPROP", name: "Godrej Properties", ticker: "GODREJPROP.NS", tier: "TOP_40" },
  { symbol: "OBEROIRLTY", name: "Oberoi Realty", ticker: "OBEROIRLTY.NS", tier: "TOP_40" },
  { symbol: "ASTRAL", name: "Astral Ltd", ticker: "ASTRAL.NS", tier: "TOP_40" },
  { symbol: "CUMMINSIND", name: "Cummins India", ticker: "CUMMINSIND.NS", tier: "TOP_40" },
  { symbol: "BOSCHLTD", name: "Bosch Ltd", ticker: "BOSCHLTD.NS", tier: "TOP_40" },
  { symbol: "MOTHERSON", name: "Samvardhana Motherson", ticker: "MOTHERSON.NS", tier: "TOP_40" },
  { symbol: "ASHOKLEY", name: "Ashok Leyland", ticker: "ASHOKLEY.NS", tier: "TOP_40" },
  { symbol: "BALKRISIND", name: "Balkrishna Industries", ticker: "BALKRISIND.NS", tier: "TOP_40" },
  { symbol: "MRF", name: "MRF Ltd", ticker: "MRF.NS", tier: "TOP_40" }
];

function getActiveConstituents() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName("SETTINGS");
  const watchSheet = ss.getSheetByName("WATCHLIST");

  let mode = "SENSEX 30 (Core 30)";
  if (setSheet) {
    const val = setSheet.getRange("B6").getValue();
    if (val) mode = val.toString().trim();
  }

  if (mode.startsWith("SENSEX 30")) {
    return MASTER_UNIVERSE_100.filter(c => c.tier === "SENSEX_30");
  }
  if (mode.startsWith("SENSEX 60")) {
    return MASTER_UNIVERSE_100.filter(c => c.tier === "SENSEX_30" || c.tier === "NEXT_30");
  }
  if (mode.startsWith("BSE 100")) {
    return MASTER_UNIVERSE_100;
  }
  if (mode.startsWith("CUSTOM") && watchSheet && watchSheet.getLastRow() > 1) {
    const watchData = watchSheet.getDataRange().getValues();
    const activeTickers = [];
    for (let r = 1; r < watchData.length; r++) {
      const sym = watchData[r][0];
      const isEnabled = watchData[r][2]; // Column C: 'Active'
      if (isEnabled === "YES" || isEnabled === true) {
        const found = MASTER_UNIVERSE_100.find(c => c.symbol === sym);
        if (found) activeTickers.push(found);
      }
    }
    if (activeTickers.length > 0) return activeTickers;
  }
  return MASTER_UNIVERSE_100.filter(c => c.tier === "SENSEX_30");
}