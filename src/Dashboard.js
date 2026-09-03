/**
 * Constructs the UI Control Panel with Interactive Links & Routine Flow
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

    // Parameter Info Box (B4:E7)
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

    // Real-time Basket Summary Cards (B9:G12)
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

    // --- SYSTEM ROUTINE & NAVIGATION CARDS (Row 15 - 20) ---
    sheet.getRange("B14:G14").merge().setValue("DAILY OPERATIONAL ROUTINE & TAB NAVIGATION")
        .setFontWeight("bold").setBackground("#ebf8ff").setFontColor("#2b6cb0").setHorizontalAlignment("center");

    const routineData = [
        ["TIME / STEP", "PHASE", "SYSTEM / USER ACTION", "TARGET SHEET LINK", "OUTPUT / CRITERIA"],
        [
            "03:30 PM IST",
            "EOD Auto Scan",
            "Automated Parallel Yahoo Fetch & CAR Math",
            '=HYPERLINK("#gid=" & IFERROR(SHEETID("INDICATORS"), "0"), "👉 Open INDICATORS")',
            "20/50 DMA, Dip >=5%, CAR State"
        ],
        [
            "03:35 PM IST",
            "Signal & Rank",
            "Diversify First Sort & Queue Generation",
            '=HYPERLINK("#gid=" & IFERROR(SHEETID("SIGNALS"), "0"), "👉 Open SIGNALS")',
            "Top 5 Eligible Daily Orders"
        ],
        [
            "09:45 - 11:00 AM",
            "HITL Execution",
            "Manual Zerodha Buy -> Enter Qty & Price",
            '=HYPERLINK("#gid=" & IFERROR(SHEETID("ACTION_QUEUE"), "0"), "👉 Open ACTION_QUEUE")',
            "₹4,000 / Slot Tranche Entry"
        ],
        [
            "Continuous",
            "Portfolio Tracking",
            "Auto Blended Avg Price & Quarantine Guard",
            '=HYPERLINK("#gid=" & IFERROR(SHEETID("POSITIONS"), "0"), "👉 Open POSITIONS")',
            "5 Slots / Stock Max; -20% Freeze"
        ],
        [
            "Target Hit",
            "Cycle Exit",
            "Consolidated +6.5% Target Met",
            '=HYPERLINK("#gid=" & IFERROR(SHEETID("TRADE_LOG"), "0"), "👉 Open TRADE_LOG")',
            "Square-off pool & Reset Cycle"
        ]
    ];

    sheet.getRange("B15:F20").setValues(routineData);
    sheet.getRange("B15:F15").setFontWeight("bold").setBackground("#e2e8f0").setHorizontalAlignment("center");
    sheet.getRange("B16:F20").setFontSize(10).setVerticalAlignment("middle");
    sheet.getRange("E16:E20").setFontWeight("bold").setFontColor("#3182ce");

    sheet.setColumnWidth(1, 20);
    sheet.setColumnWidth(2, 130);
    sheet.setColumnWidth(3, 140);
    sheet.setColumnWidth(4, 250);
    sheet.setColumnWidth(5, 170);
    sheet.setColumnWidth(6, 200);
    sheet.setColumnWidth(7, 100);
}

/**
 * Helper Custom Function to dynamically fetch Sheet ID for hyperlinks
 */
function SHEETID(name) {
    const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    return s ? s.getSheetId().toString() : "0";
}