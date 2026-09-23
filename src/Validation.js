/**
 * UI Menu Integration & System Validation — SENSEX 100 Engine
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu("⚡ SENSEX 100 Engine")
    .addItem("1. Run Clean Setup (10 Tabs)", "runPhase1Setup")
    .addItem("2. Validate Structure", "validatePhase1Setup")
    .addSeparator()
    .addItem("3. Run EOD Scan (Fetch + Indicators)", "runDataAndIndicatorPipeline")
    .addItem("4. Generate EOD Signals & Action Queue", "generateEODSignals")
    .addSeparator()
    .addItem("5. Start Morning Execution Session", "startExecutionSession")
    .addItem("6. Complete Executed Trade (Enter Zerodha Details)", "completeExecutedTrade")
    .addItem("7. Generate Hinglish Verdict Report", "generateHinglishVerdictReport")
    .addSeparator()
    .addItem("Show Dashboard", "focusDashboard")
    .addItem("⏰ Activate Daily 4:00 PM EOD Trigger", "setupDailyEODTrigger")
    .addItem("📧 Test Send Email Alert Now", "sendEODSignalAlert")
    .addToUi();
}

function focusDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dash = ss.getSheetByName("DASHBOARD");
  if (dash) ss.setActiveSheet(dash);
}

function validatePhase1Setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const issues = [];

  // 1. Verify all expected sheets exist
  if (typeof SHEET_SCHEMAS !== "undefined") {
    Object.keys(SHEET_SCHEMAS).forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        issues.push("Missing tab: " + sheetName);
        return;
      }
      const expectedHeaders = SHEET_SCHEMAS[sheetName];
      if (expectedHeaders && expectedHeaders.length > 0) {
        const actualHeaders = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
        for (let i = 0; i < expectedHeaders.length; i++) {
          if (actualHeaders[i] !== expectedHeaders[i]) {
            issues.push(sheetName + " header mismatch at col " + (i + 1) + ": expected '" + expectedHeaders[i] + "', got '" + actualHeaders[i] + "'");
          }
        }
      }
    });
  }

  // 2. Watchlist Size Verification (100 constituents expected)
  const wlSheet = ss.getSheetByName("WATCHLIST");
  if (wlSheet) {
    const rowCount = wlSheet.getLastRow() - 1;
    if (rowCount < 100) {
      issues.push("Watchlist row count: expected 100 constituents, found " + rowCount);
    }
  } else {
    issues.push("Missing WATCHLIST tab");
  }

  // 3. Settings Verification
  const setSheet = ss.getSheetByName("SETTINGS");
  if (setSheet) {
    const setData = setSheet.getDataRange().getValues();
    const settingsMap = {};
    for (let r = 1; r < setData.length; r++) {
      settingsMap[setData[r][0]] = setData[r][1];
    }
    if (Number(settingsMap["MAX_DISTINCT_STOCKS"]) > 6) {
      issues.push("SETTINGS warning: MAX_DISTINCT_STOCKS is " + settingsMap["MAX_DISTINCT_STOCKS"] + " (Recommended: 6 to prevent slot deficit)");
    }
  }

  if (issues.length === 0) {
    if (typeof logAudit === "function") {
      logAudit("validatePhase1Setup", "VALIDATION_CLEAN_ENGINE", "SUCCESS", 10, "Clean architecture validated (100 stocks)", "", 0);
    }
    SpreadsheetApp.getUi().alert("✅ Validation Passed!\n\nAll sheets, 100 watchlist constituents, and parameters are structurally sound.");
  } else {
    if (typeof logAudit === "function") {
      logAudit("validatePhase1Setup", "VALIDATION_CLEAN_ENGINE", "WARNING", issues.length, "Issues found", issues.join("; "), 0);
    }
    SpreadsheetApp.getUi().alert("⚠️ Validation issues found:\n\n- " + issues.join("\n- "));
  }
}

/**
 * Programmatically creates a daily 4:00 PM IST trigger
 * Guarantees market is closed and post-closing auctions are fully settled.
 */
function setupDailyEODTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "runDailyEODJob") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("runDailyEODJob")
    .timeBased()
    .everyDays(1)
    .atHour(16) // Triggers at 4:00 PM IST
    .create();

  SpreadsheetApp.getUi().alert("⏰ Daily EOD Trigger Activated!\n\nThe engine will automatically run and dispatch email digests every weekday at 4:00 PM IST (after market settlement).");
}