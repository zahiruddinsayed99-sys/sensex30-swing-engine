/**
 * Constructs the UI Control Panel for SENSEX 30 Basket Cycle
 */
function renderDashboardLayout(sheet) {
    sheet.clear();

    // Header Banner
    sheet.getRange("B2:G2").merge()
        .setValue("SENSEX 30 BASKET CYCLE ENGINE — V1.0")
        .setFontWeight("bold").setFontSize(14)
        .setBackground("#1a365d").setFontColor("#ffffff")
        .setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.setRowHeight(2, 38);

    // Parameter Info Box (4 columns across B to E)
    const params = [
        ["Cycle Model:", "10-Stock Basket Cycle", "Active Pool Target:", "+6.5% Combined Gain"],
        ["Cycle Capital:", "₹1,00,000 (25 Slots @ ₹4,000)", "Quarantine Threshold:", "-20% (Freeze Averaging)"],
        ["Universe:", "SENSEX 30", "Max Tranches/Stock:", "5 Slots (₹20,000)"],
        ["Priority Rule:", "Diversify First (up to 10), then Average", "Daily Action Limit:", "Max 5 Orders/Day"]
    ];
    sheet.getRange("B4:E7").setValues(params);
    sheet.getRange("B4:B7").setFontWeight("bold").setFontColor("#4a5568");
    sheet.getRange("D4:D7").setFontWeight("bold").setFontColor("#4a5568");
    sheet.getRange("C4:C7").setFontWeight("bold").setFontColor("#2b6cb0");
    sheet.getRange("E4:E7").setFontWeight("bold").setFontColor("#2b6cb0");

    // Real-time Basket Summary Cards (6 columns across B to G)
    sheet.getRange("B9:G9").merge().setValue("ACTIVE BASKET STATUS & METRICS")
        .setFontWeight("bold").setBackground("#edf2f7").setHorizontalAlignment("center");

    const metricHeaders = [
        "Distinct Names", "Slots Used", "Active Invested", "Quarantined Invested", "Active Pool PnL %", "Exit Signal"
    ];
    const metricFormulas = [
        '=IFERROR(COUNTIF(POSITIONS!B2:B, "OPEN"), 0) & " / 10"',
        '=IFERROR(SUM(POSITIONS!D2:D), 0) & " / 25"',
        '=IFERROR(SUMIF(POSITIONS!J2:J, "ACTIVE", POSITIONS!E2:E), 0)',
        '=IFERROR(SUMIF(POSITIONS!J2:J, "QUARANTINED", POSITIONS!E2:E), 0)',
        '=IFERROR(AVERAGEIF(POSITIONS!J2:J, "ACTIVE", POSITIONS!I2:I), 0%)',
        '=IF(IFERROR(AVERAGEIF(POSITIONS!J2:J, "ACTIVE", POSITIONS!I2:I), 0) >= 0.065, "CONSOLIDATED_TARGET_HIT", "RUNNING")'
    ];

    sheet.getRange("B11:G11").setValues([metricHeaders]).setFontWeight("bold").setBackground("#e2e8f0").setHorizontalAlignment("center");
    sheet.getRange("B12:G12").setValues([metricFormulas]).setFontWeight("bold").setFontSize(12).setHorizontalAlignment("center");

    sheet.setColumnWidth(1, 20);
    sheet.setColumnWidth(2, 140);
    sheet.setColumnWidth(3, 140);
    sheet.setColumnWidth(4, 150);
    sheet.setColumnWidth(5, 170);
    sheet.setColumnWidth(6, 150);
    sheet.setColumnWidth(7, 180);
}

function logAudit(funcName, action, status, recordsProcessed, result, error, execTimeMs) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName("SYSTEM_AUDIT");
        if (!sheet) return;

        sheet.appendRow([
            new Date(),
            Session.getActiveUser().getEmail() || "System",
            funcName,
            action,
            status,
            recordsProcessed || 0,
            result || "",
            error || "",
            execTimeMs || 0
        ]);
    } catch (e) {
        Logger.log("Failed to write audit log: " + e.message);
    }
}