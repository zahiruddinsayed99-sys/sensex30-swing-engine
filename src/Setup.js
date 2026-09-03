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
        const settingsSheet = ss.getSheetByName("SETTINGS");
        settingsSheet.clear();
        const settingsHeaders = SHEET_SCHEMAS.SETTINGS;
        settingsSheet.getRange(1, 1, 1, settingsHeaders.length).setValues([settingsHeaders])
            .setFontWeight("bold").setBackground("#1a365d").setFontColor("#ffffff");

        const settingsRows = [
            ["SYSTEM_VERSION", CONFIG.VERSION, "Strategy engine release version", "STRING"],
            ["UNIVERSE", CONFIG.UNIVERSE, "Target scan universe", "STRING"],
            ["CYCLE_CAPITAL", CONFIG.CYCLE_CAPITAL, "Total basket cycle capital (INR)", "NUMBER"],
            ["SLOT_SIZE", CONFIG.SLOT_SIZE, "Size per tranche buy action (INR)", "NUMBER"],
            ["TOTAL_CYCLE_SLOTS", CONFIG.TOTAL_CYCLE_SLOTS, "Maximum total slots per cycle", "NUMBER"],
            ["MAX_DISTINCT_STOCKS", CONFIG.MAX_DISTINCT_STOCKS, "Maximum distinct stock names in basket", "NUMBER"],
            ["MAX_TRANCHES_PER_STOCK", CONFIG.MAX_TRANCHES_PER_STOCK, "Maximum tranches (slots) per individual stock", "NUMBER"],
            ["BASKET_TARGET_PERCENT", CONFIG.BASKET_TARGET_PERCENT, "Consolidated profit target for active pool (%)", "NUMBER"],
            ["QUARANTINE_THRESHOLD_PERCENT", CONFIG.QUARANTINE_THRESHOLD_PERCENT, "Unrealized loss threshold to quarantine position (%)", "NUMBER"],
            ["SIGNAL_TIME", CONFIG.SIGNAL_TIME, "EOD scan trigger time (IST)", "STRING"],
            ["EXECUTION_START", CONFIG.EXECUTION_WINDOW.START, "Morning execution window start", "STRING"],
            ["EXECUTION_END", CONFIG.EXECUTION_WINDOW.END, "Morning execution window end", "STRING"],
            ["DMA_PERIOD", CONFIG.DMA_PERIOD, "Short-term trend & reclaim moving average", "NUMBER"],
            ["DMA50_PERIOD", CONFIG.DMA50_PERIOD, "Medium-term trend filter moving average", "NUMBER"],
            ["VWAP_METHOD", CONFIG.VWAP_METHOD, "Reference VWAP calculation source", "STRING"],
            ["DIP_THRESHOLD_PERCENT", CONFIG.DIP_THRESHOLD_PERCENT, "Minimum dip % from reference high", "NUMBER"],
            ["DAILY_BUY_LIMIT", CONFIG.DAILY_BUY_LIMIT, "Maximum new BUY candidates queued per day", "NUMBER"],
            ["PRIMARY_DATA_SOURCE", CONFIG.PRIMARY_DATA_SOURCE, "EOD price feed provider (NSE on Yahoo)", "STRING"],
            ["DATA_VALIDATION", CONFIG.DATA_VALIDATION, "Enforce strict data validation prior to scan", "BOOLEAN"]
        ];
        settingsSheet.getRange(2, 1, settingsRows.length, settingsRows[0].length).setValues(settingsRows);
        settingsSheet.setFrozenRows(1);

        // Populate WATCHLIST Tab
        const watchlistSheet = ss.getSheetByName("WATCHLIST");
        const todayStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
        const watchlistRows = SENSEX_30_UNIVERSE.map(item => [
            item.symbol,
            item.ticker,
            "YES",
            item.sector,
            "SENSEX 30",
            todayStr,
            "V1.0"
        ]);
        watchlistSheet.getRange(2, 1, watchlistRows.length, watchlistRows[0].length).setValues(watchlistRows);

        // Render Dashboard
        renderDashboardLayout(ss.getSheetByName("DASHBOARD"));

        logAudit("runPhase1Setup", "SETUP_CLEAN_ENGINE", "SUCCESS", targetSheets.length, "Initialized 10 tabs with in-memory engine", "", Date.now() - startTime);
        SpreadsheetApp.getUi().alert("Clean 10-tab architecture initialized successfully!");
    } catch (err) {
        logAudit("runPhase1Setup", "SETUP_CLEAN_ENGINE", "FAILED", 0, "", err.message, Date.now() - startTime);
        SpreadsheetApp.getUi().alert("Setup failed: " + err.message);
    }
}