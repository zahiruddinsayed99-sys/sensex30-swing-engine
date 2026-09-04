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

  const headers = ["Symbol", "Company Name", "Yahoo Ticker", "Tier", "Active (YES/NO)"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight("bold").setBackground("#2d3748").setFontColor("#ffffff");

  const rows = MASTER_UNIVERSE_100.map(c => [
    c.symbol,
    c.name,
    c.ticker,
    c.tier,
    "YES"
  ]);

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  sheet.setColumnWidth(1, 130);
  sheet.setColumnWidth(2, 240);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 130);
  sheet.setColumnWidth(5, 130);
}

function initSettingsTab(ss) {
  let sheet = ss.getSheetByName("SETTINGS");
  if (!sheet) sheet = ss.insertSheet("SETTINGS");
  sheet.clear();

  const headers = ["Parameter", "Value", "Description"];
  sheet.getRange(1, 1, 1, 3).setValues([headers])
    .setFontWeight("bold").setBackground("#2d3748").setFontColor("#ffffff");

  const settingsData = [
    ["Cycle Capital", CONFIG.CYCLE_CAPITAL, "Total pool capital for one full cycle (INR)"],
    ["Total Slots", CONFIG.TOTAL_CYCLE_SLOTS, "Total tranche slots across all positions"],
    ["Slot Size", CONFIG.SLOT_SIZE, "Capital deployed per tranche (INR)"],
    ["Max Distinct Stocks", CONFIG.MAX_DISTINCT_STOCKS, "Maximum portfolio breadth (names)"],
    ["Scanning Universe Mode", UNIVERSE_MODES.SENSEX_30, "Active Scanning Scope (Dropdown)"],
    ["Consolidated Target %", CONFIG.BASKET_TARGET_PERCENT, "Combined gain exit trigger (+6.5%)"],
    ["Quarantine Drawdown %", CONFIG.QUARANTINE_THRESHOLD_PERCENT, "Drawdown limit to freeze averaging (-20%)"],
    ["Daily Buy Order Limit", CONFIG.DAILY_BUY_LIMIT, "Max orders queued per session (5)"],
    ["Minimum Dip %", CONFIG.DIP_THRESHOLD_PERCENT, "Decline from 30-day reference high (5%)"],
    ["Reference High Lookback", 30, "Lookback window for reference high (days)"]
  ];

  sheet.getRange(2, 1, settingsData.length, 3).setValues(settingsData);

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.values(UNIVERSE_MODES), true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("B6").setDataValidation(rule);

  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 260);
  sheet.setColumnWidth(3, 380);
}