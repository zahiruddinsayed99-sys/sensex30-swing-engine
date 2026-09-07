/**
 * Constructs the UI Control Panel with Interactive Links & Routine Flow
 */
/**
 * HITL Dashboard Renderer — SENSEX 30 Engine
 * Creates a clean, grid-free visual control center.
 */

function renderDashboardLayout(sheet = null) {
  if (!sheet) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.getSheetByName("DASHBOARD");
  }
  
  if (!sheet) return;

  sheet.clear();
  sheet.setHiddenGridlines(true);
  
  // Column Sizing for UI Cards
  sheet.setColumnWidth(1, 20);  // Padding
  sheet.setColumnWidth(2, 250); // Label Col 1
  sheet.setColumnWidth(3, 150); // Value Col 1
  sheet.setColumnWidth(4, 20);  // Padding
  sheet.setColumnWidth(5, 250); // Label Col 2
  sheet.setColumnWidth(6, 150); // Value Col 2

  // --- HEADER ---
  sheet.getRange("B2:F3").merge()
       .setValue("⚡ SENSEX 30 MULTI-TRANCHE ENGINE (HITL)")
       .setFontSize(16)
       .setFontWeight("bold")
       .setBackground("#1a365d")
       .setFontColor("#ffffff")
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle");

  sheet.getRange("B4:F4").merge()
       .setValue("Control Center & Portfolio Health")
       .setFontSize(10)
       .setFontColor("#718096")
       .setHorizontalAlignment("center");

  // --- PORTFOLIO SUMMARY CARD ---
  sheet.getRange("B6:C6").merge().setValue("📊 PORTFOLIO METRICS").setFontWeight("bold").setBackground("#e2e8f0");
  const metrics = [
    ["Total Cycle Capital (₹)", CONFIG.CYCLE_CAPITAL],
    ["Capital Deployed (₹)", `=SUM(HEDGE_POSITIONS!D2*HEDGE_POSITIONS!E2)+sum(POSITIONS!E2:E)`],
    ["Available Cash (₹)", `=C7 - C8`],
    ["Total Active Equity Slots", `=SUM(POSITIONS!D2:D)`],
    ["Max Tranches Hit (Fully Loaded)", `=COUNTIF(POSITIONS!L2:L, "MAXED")`],
    ["Quarantined Stocks (<-20%)", `=COUNTIF(POSITIONS!J2:J, "QUARANTINED")`]
  ];
  sheet.getRange(7, 2, metrics.length, 2).setValues(metrics);
  sheet.getRange(7, 2, metrics.length, 1).setFontWeight("bold").setFontColor("#4a5568");
  sheet.getRange(7, 3, metrics.length, 1).setHorizontalAlignment("right").setNumberFormat("#,##0");

  // --- HEDGE & EXECUTION CARD ---
  sheet.getRange("E6:F6").merge().setValue("🛡️ HEDGE & ACTION STATUS").setFontWeight("bold").setBackground("#e2e8f0");
  const actionMetrics = [
    ["Pending Actions (Queue)", `=COUNTIF(ACTION_QUEUE!K2:K, "READY")`],
    ["Pending Zerodha Confirmations", `=COUNTIF(ACTION_QUEUE!L2:L, "PENDING_MANUAL")`],
    ["Active SENSEXIETF Tranches", `=COUNTIF(HEDGE_POSITIONS!G2:G, "OPEN")`],
    ["Last Engine Run Date", `=MAX(TRADE_LOG!B2:B, SIGNALS!B2:B)`],
    ["Total Stocks in Watchlist", `=COUNTA(WATCHLIST!A2:A)`],
    ["Engine Status", `=IF(E7>0, "🟢 ACTION REQUIRED", "✅ ALL CLEAR")`]
  ];
  sheet.getRange(7, 5, actionMetrics.length, 2).setValues(actionMetrics);
  sheet.getRange(7, 5, actionMetrics.length, 1).setFontWeight("bold").setFontColor("#4a5568");
  sheet.getRange(7, 6, actionMetrics.length, 1).setHorizontalAlignment("right");
  // Date Number Formatting Fix
  sheet.getRange("F10").setNumberFormat("yyyy-MM-dd");

  // Format aesthetics
  const borderRanges = ["B6:C12", "E6:F12"];
  borderRanges.forEach(range => {
    sheet.getRange(range).setBorder(true, true, true, true, false, true, "#cbd5e0", SpreadsheetApp.BorderStyle.SOLID);
  });
}

/**
 * Diagnostic runner to instantly render/refresh the dashboard
 */
function refreshDashboard() {
  renderDashboardLayout();
}

/**
 * Helper Custom Function to dynamically fetch Sheet ID for hyperlinks
 */
function SHEETID(name) {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  return s ? s.getSheetId().toString() : "0";
}
