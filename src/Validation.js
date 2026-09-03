/**
 * UI Menu Integration
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu("⚡ SENSEX 30 Engine")
    .addItem("1. Run Clean Setup (10 Tabs)", "runPhase1Setup")
    .addItem("2. Validate Structure", "validatePhase1Setup")
    .addSeparator()
    .addItem("3. Run EOD Scan (Fetch + Indicators)", "runDataAndIndicatorPipeline")
    .addItem("4. Generate EOD Signals & Action Queue", "generateEODSignals")
    .addSeparator()
    .addItem("5. Start Morning Execution Session", "startExecutionSession")
    .addItem("6. Complete Executed Trade (Enter Zerodha Details)", "completeExecutedTrade")
    .addSeparator()
    .addItem("Show Dashboard", "focusDashboard")
    .addItem("⏰ Activate Daily 3:30 PM EOD Trigger", "setupDailyEODTrigger")
    .addItem("📢 5. Generate Hinglish Verdict Report", "generateHinglishVerdictReport")
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

  Object.keys(SHEET_SCHEMAS).forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      issues.push("Missing tab: " + sheetName);
      return;
    }
    const expectedHeaders = SHEET_SCHEMAS[sheetName];
    if (expectedHeaders.length > 0) {
      const actualHeaders = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
      for (let i = 0; i < expectedHeaders.length; i++) {
        if (actualHeaders[i] !== expectedHeaders[i]) {
          issues.push(sheetName + " header mismatch at col " + (i + 1) + ": expected '" + expectedHeaders[i] + "', got '" + actualHeaders[i] + "'");
        }
      }
    }
  });

  const wlSheet = ss.getSheetByName("WATCHLIST");
  if (wlSheet && (wlSheet.getLastRow() - 1) !== 30) {
    issues.push("Watchlist row count: expected 30, got " + (wlSheet.getLastRow() - 1));
  }

  if (issues.length === 0) {
    logAudit("validatePhase1Setup", "VALIDATION_CLEAN_ENGINE", "SUCCESS", 10, "Clean 10-tab architecture validated", "", 0);
    SpreadsheetApp.getUi().alert("Clean 10-tab architecture passed validation with zero errors!");
  } else {
    logAudit("validatePhase1Setup", "VALIDATION_CLEAN_ENGINE", "WARNING", issues.length, "Issues found", issues.join("; "), 0);
    SpreadsheetApp.getUi().alert("Validation issues found:\n\n- " + issues.join("\n- "));
  }
}

/**
 * Programmatically creates a daily 3:30 PM - 4:00 PM trigger
 */
function setupDailyEODTrigger() {
  // Delete any existing triggers for this function to prevent duplicate runs
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "runDailyEODJob") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Create new daily trigger between 3:00 PM and 4:00 PM IST
  ScriptApp.newTrigger("runDailyEODJob")
    .timeBased()
    .everyDays(1)
    .atHour(15) // 3:00 PM - 4:00 PM window (after NSE market close)
    .create();

  SpreadsheetApp.getUi().alert("⏰ Daily EOD Trigger Set Successfully!\n\nThe engine will automatically run every weekday between 3:30 PM - 4:00 PM IST.");
}
