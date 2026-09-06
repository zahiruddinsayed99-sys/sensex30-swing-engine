/**
 * Master Setup Script — SENSEX 30 Basket Cycle Setup (In-Memory Engine)
 */
function runPhase1Setup() {
  const startTime = Date.now();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    const targetSheets = Object.keys(SHEET_SCHEMAS);
    targetSheets.forEach(sheetName => {
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }
    });

    // Remove obsolete MARKET_DATA or default Sheet1
    ["MARKET_DATA", "Sheet1"].forEach(tabName => {
      const obsolete = ss.getSheetByName(tabName);
      if (obsolete && ss.getSheets().length > 1) {
        try { ss.deleteSheet(obsolete); } catch (e) { }
      }
    });

    // Apply clean table headers
    targetSheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      const headers = SHEET_SCHEMAS[sheetName];

      if (headers.length > 0) {
        sheet.clear();
        sheet.getRange(1, 1, 1, headers.length).setValues([headers])
          .setFontWeight("bold")
          .setBackground("#1a365d")
          .setFontColor("#ffffff");
        sheet.setFrozenRows(1);
      }
    });

    // Populate SETTINGS Tab
    initSettingsTab(ss);

    // Populate WATCHLIST Tab
    initWatchlistTab(ss);

    // Render Dashboard
    renderDashboardLayout(ss.getSheetByName("DASHBOARD"));

    logAudit("runPhase1Setup", "SETUP_CLEAN_ENGINE", "SUCCESS", targetSheets.length, "Initialized 10 tabs with in-memory engine", "", Date.now() - startTime);
    SpreadsheetApp.getUi().alert("Clean 10-tab architecture initialized successfully!");
  } catch (err) {
    logAudit("runPhase1Setup", "SETUP_CLEAN_ENGINE", "FAILED", 0, "", err.message, Date.now() - startTime);
    SpreadsheetApp.getUi().alert("Setup failed: " + err.message);
  }
}

function initWatchlistTab(ss) {
  let sheet = ss.getSheetByName("WATCHLIST");
  if (!sheet) sheet = ss.insertSheet("WATCHLIST");
  sheet.clear();

  // Updated WATCHLIST headers to serve as SSOT
  const headers = ["Symbol", "Company Name", "Yahoo Ticker", "Tier", "Status"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight("bold").setBackground("#2d3748").setFontColor("#ffffff");

  sheet.setColumnWidth(1, 130);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 120);
  sheet.setColumnWidth(5, 90);
}

function initSettingsTab(ss) {
  let sheet = ss.getSheetByName("SETTINGS");
  if (!sheet) sheet = ss.insertSheet("SETTINGS");
  sheet.clear();

  const headers = ["Key", "Value", "Description", "Type"];
  sheet.getRange(1, 1, 1, 4).setValues([headers])
    .setFontWeight("bold").setBackground("#2d3748").setFontColor("#ffffff");

  const settingsData = [
    ["CYCLE_CAPITAL", CONFIG.CYCLE_CAPITAL, "Total pool capital for one full cycle (INR)", "NUMBER"],
    ["TOTAL_SLOTS", CONFIG.TOTAL_CYCLE_SLOTS, "Total tranche slots across all positions", "NUMBER"],
    ["SLOT_SIZE", CONFIG.SLOT_SIZE, "Capital deployed per tranche (INR)", "NUMBER"],
    ["MAX_DISTINCT_STOCKS", CONFIG.MAX_DISTINCT_STOCKS, "Maximum portfolio breadth (names)", "NUMBER"],
    ["SCANNING_UNIVERSE_MODE", UNIVERSE_MODES.SENSEX_30, "Active Scanning Scope (Dropdown)", "STRING"],
    ["CONSOLIDATED_TARGET_PCT", CONFIG.BASKET_TARGET_PERCENT, "Combined gain exit trigger (+6.5%)", "PERCENT"],
    ["QUARANTINE_PCT", CONFIG.QUARANTINE_THRESHOLD_PERCENT, "Drawdown limit to freeze averaging (-20%)", "PERCENT"],
    ["DAILY_BUY_LIMIT", CONFIG.DAILY_BUY_LIMIT, "Max orders queued per session (5)", "NUMBER"],
    ["DIP_MIN_PCT", CONFIG.DIP_THRESHOLD_PERCENT, "Decline from 30-day reference high (5%)", "PERCENT"],
    ["REFERENCE_HIGH_LOOKBACK", 30, "Lookback window for reference high (days)", "NUMBER"]
  ];

  sheet.getRange(2, 1, settingsData.length, 4).setValues(settingsData);

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.values(UNIVERSE_MODES), true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("B6").setDataValidation(rule);

  sheet.setColumnWidth(1, 240);
  sheet.setColumnWidth(2, 260);
  sheet.setColumnWidth(3, 380);
  sheet.setColumnWidth(4, 120);
}