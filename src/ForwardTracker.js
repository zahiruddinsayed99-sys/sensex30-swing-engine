/**
 * SENSEX 100 — Shadow Forward-Tracker Engine
 * Ingests BUY T1 signals from the live sheet, tracks multi-tranche averaging (T1-T4),
 * monitors +6.0% profit targets, -20% quarantine limits, and 30-day time expirations.
 */

const CONFIG = {
    // Primary Production Sheet ID
    LIVE_SHEET_ID: "1uW9rias-aA2YGpEQTzZr39QhPszPLUHFP2GDFDHU05M",

    SLOT_BUDGET: 4000,              // ₹4,000 per slot
    TARGET_PCT: 6.0,                // +6.0% target on blended average cost
    QUARANTINE_PCT: -20.0,          // -20.0% hard quarantine cutoff from T1
    MAX_TRANCHES: 4,                // Max 4 tranches per stock
    MAX_DAYS: 30,                   // 30 calendar days evaluation window

    // Tranche drawdown triggers from T1 entry price
    T2_DRAWDOWN: -4.5,
    T3_DRAWDOWN: -9.5,
    T4_DRAWDOWN: -14.5
};

/**
 * Custom UI Menu for the Tracker Workbook
 */
function onOpen() {
    SpreadsheetApp.getUi().createMenu("⚡ Shadow Tracker")
        .addItem("1. Initialize Tracker Tabs", "setupTrackerSheets")
        .addItem("2. Ingest Today's Signals from Live Sheet", "ingestSignalsFromLiveEngine")
        .addItem("3. Run Daily Forward Evaluation", "evaluateForwardPositions")
        .addSeparator()
        .addItem("⏰ Activate Daily 5:00 PM Tracker Trigger", "setupDailyTrackerTrigger")
        .addItem("🔄 Recalculate Metrics Dashboard", "updateMetricsDashboard")
        .addToUi();
}

/**
 * Initializes the tabs and headers
 */
function setupTrackerSheets() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. FORWARD_PORTFOLIO Tab
    let portSheet = ss.getSheetByName("FORWARD_PORTFOLIO");
    if (!portSheet) {
        portSheet = ss.insertSheet("FORWARD_PORTFOLIO");
    }

    const portHeaders = [
        "Signal Date", "Symbol", "Status", "Days Held", "T1 Price", "T1 Qty",
        "Current Tranche", "Total Shares", "Total Invested (₹)", "Blended Avg Price",
        "Target Price (+6%)", "Latest CMP", "Unrealized PnL %", "Max Gain % (MFE)",
        "Max Drawdown % (MAE)", "Exit Date", "Exit Price", "Realized PnL %"
    ];

    portSheet.getRange(1, 1, 1, portHeaders.length).setValues([portHeaders])
        .setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff")
        .setHorizontalAlignment("center");
    portSheet.setFrozenRows(1);

    // 2. METRICS_SUMMARY Tab
    let metSheet = ss.getSheetByName("METRICS_SUMMARY");
    if (!metSheet) {
        metSheet = ss.insertSheet("METRICS_SUMMARY");
    }

    updateMetricsDashboard();
    SpreadsheetApp.getUi().alert("✅ Tracker Tabs Initialized Successfully!");
}

/**
 * Reads newly qualified BUY T1 signals from the live production sheet
 */
function ingestSignalsFromLiveEngine() {
    if (!CONFIG.LIVE_SHEET_ID || CONFIG.LIVE_SHEET_ID === "YOUR_LIVE_SPREADSHEET_ID_HERE") {
        SpreadsheetApp.getUi().alert("⚠️ Please paste your primary sheet ID into CONFIG.LIVE_SHEET_ID first.");
        return;
    }

    const liveSS = SpreadsheetApp.openById(CONFIG.LIVE_SHEET_ID);
    const liveSigSheet = liveSS.getSheetByName("SIGNALS");
    if (!liveSigSheet) {
        SpreadsheetApp.getUi().alert("Could not find SIGNALS tab in live sheet.");
        return;
    }

    const liveData = liveSigSheet.getDataRange().getValues();
    if (liveData.length < 2) return;

    const currentTrackerSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("FORWARD_PORTFOLIO");
    const trackerData = currentTrackerSheet.getDataRange().getValues();

    // Map of existing active/closed tracked symbols to prevent duplicate tracking on same day
    const existingSet = new Set();
    for (let r = 1; r < trackerData.length; r++) {
        const sDate = Utilities.formatDate(new Date(trackerData[r][0]), "Asia/Kolkata", "yyyy-MM-dd");
        const sym = trackerData[r][1];
        existingSet.add(`${sDate}_${sym}`);
    }

    const newRows = [];
    const todayStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");

    for (let i = 1; i < liveData.length; i++) {
        const row = liveData[i];
        const sym = row[4];
        const cmp = Number(row[8]) || 0;
        const signal = (row[19] || "").toString();

        // Only ingest fresh T1 entries
        if (signal === "BUY T1" && cmp > 0) {
            const key = `${todayStr}_${sym}`;
            if (!existingSet.has(key)) {
                const t1Qty = Math.max(1, Math.floor(CONFIG.SLOT_BUDGET / cmp));
                const totalInvested = t1Qty * cmp;
                const targetPrice = Number((cmp * (1 + CONFIG.TARGET_PCT / 100)).toFixed(2));

                newRows.push([
                    todayStr, sym, "TRACKING", 0, cmp, t1Qty,
                    "T1", t1Qty, totalInvested, cmp,
                    targetPrice, cmp, 0.0, 0.0,
                    0.0, "", "", ""
                ]);
                existingSet.add(key);
            }
        }
    }

    if (newRows.length > 0) {
        const startRow = currentTrackerSheet.getLastRow() + 1;
        currentTrackerSheet.getRange(startRow, 1, newRows.length, newRows[0].length).setValues(newRows);
        SpreadsheetApp.getUi().alert(`📥 Ingested ${newRows.length} new BUY T1 setups into Forward Tracker!`);
    } else {
        Logger.log("No new BUY T1 setups to ingest today.");
        SpreadsheetApp.getUi().alert("ℹ️ No new BUY T1 setups found in live sheet for today.");
    }
}

/**
 * Daily evaluation of tracked positions (fetches H/L/C from Yahoo Finance)
 */
function evaluateForwardPositions() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("FORWARD_PORTFOLIO");
    if (!sheet || sheet.getLastRow() < 2) return;

    const data = sheet.getDataRange().getValues();
    const activeIndices = [];

    for (let r = 1; r < data.length; r++) {
        if (data[r][2] === "TRACKING") {
            activeIndices.push(r);
        }
    }

    if (activeIndices.length === 0) {
        Logger.log("No active positions currently in TRACKING state.");
        updateMetricsDashboard();
        return;
    }

    // Batch fetch today's OHLC for tracked stocks
    const requests = activeIndices.map(idx => {
        const sym = data[idx][1];
        const ticker = sym.endsWith(".NS") || sym.endsWith(".BO") ? sym : `${sym}.NS`;
        return {
            url: `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`,
            muteHttpExceptions: true,
            headers: { "User-Agent": "Mozilla/5.0" }
        };
    });

    const responses = UrlFetchApp.fetchAll(requests);
    const today = new Date();
    const todayStr = Utilities.formatDate(today, "Asia/Kolkata", "yyyy-MM-dd");

    activeIndices.forEach((rowIdx, i) => {
        try {
            const resp = responses[i];
            if (!resp || resp.getResponseCode() !== 200) return;

            const json = JSON.parse(resp.getContentText());
            const result = json.chart.result[0];
            const quote = result.indicators.quote[0];
            const timestamps = result.timestamp;
            const lastBarIdx = timestamps.length - 1;

            const curHigh = Number(quote.high[lastBarIdx]);
            const curLow = Number(quote.low[lastBarIdx]);
            const curClose = Number(quote.close[lastBarIdx]);

            let [
                sigDate, sym, status, daysHeld, t1Price, t1Qty,
                curTranche, totShares, totInvested, avgPrice,
                targetPrice, latestCMP, unPnl, maxGain,
                maxDD, exitDate, exitPrice, realPnl
            ] = data[rowIdx];

            // Update holding days
            const sigDateObj = new Date(sigDate);
            const diffDays = Math.max(1, Math.round((today.getTime() - sigDateObj.getTime()) / (1000 * 60 * 60 * 24)));
            daysHeld = diffDays;

            // Update running metrics
            const peakGain = Math.max(Number(maxGain) || 0, ((curHigh - t1Price) / t1Price) * 100);
            const deepDD = Math.min(Number(maxDD) || 0, ((curLow - t1Price) / t1Price) * 100);
            maxGain = Number(peakGain.toFixed(2));
            maxDD = Number(deepDD.toFixed(2));
            latestCMP = Number(curClose.toFixed(2));

            let trancheNum = parseInt(String(curTranche).replace("T", "")) || 1;
            const ddFromT1 = ((curLow - t1Price) / t1Price) * 100;

            // 1. CHECK TARGET HIT (+6.0% on Blended Cost)
            if (curHigh >= targetPrice) {
                status = "TARGET_HIT";
                exitDate = todayStr;
                exitPrice = targetPrice;
                realPnl = Number((((exitPrice - avgPrice) / avgPrice) * 100).toFixed(2));
            }
            // 2. CHECK QUARANTINE (-20.0% from T1)
            else if (ddFromT1 <= CONFIG.QUARANTINE_PCT) {
                status = "QUARANTINED";
            }
            // 3. CHECK TIME EXPIRY (30 Days)
            else if (daysHeld >= CONFIG.MAX_DAYS) {
                status = "TIME_EXPIRED";
                exitDate = todayStr;
                exitPrice = curClose;
                realPnl = Number((((exitPrice - avgPrice) / avgPrice) * 100).toFixed(2));
            }
            // 4. TRANCHE AVERAGING SIMULATION (T2, T3, T4)
            else if (status === "TRACKING" && trancheNum < CONFIG.MAX_TRANCHES) {
                let triggerTranche = false;
                let nextTrancheLabel = curTranche;

                if (trancheNum === 1 && ddFromT1 <= CONFIG.T2_DRAWDOWN) {
                    triggerTranche = true;
                    nextTrancheLabel = "T2";
                } else if (trancheNum === 2 && ddFromT1 <= CONFIG.T3_DRAWDOWN) {
                    triggerTranche = true;
                    nextTrancheLabel = "T3";
                } else if (trancheNum === 3 && ddFromT1 <= CONFIG.T4_DRAWDOWN) {
                    triggerTranche = true;
                    nextTrancheLabel = "T4";
                }

                if (triggerTranche) {
                    const buyPrice = curClose;
                    const addQty = Math.max(1, Math.floor(CONFIG.SLOT_BUDGET / buyPrice));
                    totShares += addQty;
                    totInvested += (addQty * buyPrice);
                    avgPrice = Number((totInvested / totShares).toFixed(2));
                    targetPrice = Number((avgPrice * (1 + CONFIG.TARGET_PCT / 100)).toFixed(2));
                    curTranche = nextTrancheLabel;
                }
            }

            unPnl = Number((((curClose - avgPrice) / avgPrice) * 100).toFixed(2));

            // Update memory array
            data[rowIdx] = [
                sigDate, sym, status, daysHeld, t1Price, t1Qty,
                curTranche, totShares, totInvested, avgPrice,
                targetPrice, latestCMP, unPnl, maxGain,
                maxDD, exitDate, exitPrice, realPnl
            ];
        } catch (e) {
            Logger.log(`Error evaluating row ${rowIdx}: ` + e.message);
        }
    });

    // Write back updated data
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    updateMetricsDashboard();
}

/**
 * Builds the performance edge summary dashboard
 */
function updateMetricsDashboard() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const portSheet = ss.getSheetByName("FORWARD_PORTFOLIO");
    const metSheet = ss.getSheetByName("METRICS_SUMMARY");
    if (!portSheet || !metSheet) return;

    const data = portSheet.getDataRange().getValues();
    let totalTracked = 0;
    let targetHits = 0;
    let quarantined = 0;
    let timeExpired = 0;
    let trackingActive = 0;
    let totalDaysForHits = 0;
    let t1OnlyHits = 0;

    for (let r = 1; r < data.length; r++) {
        totalTracked++;
        const status = data[r][2];
        const days = Number(data[r][3]) || 0;
        const tranche = data[r][6];

        if (status === "TARGET_HIT") {
            targetHits++;
            totalDaysForHits += days;
            if (tranche === "T1") t1OnlyHits++;
        } else if (status === "QUARANTINED") {
            quarantined++;
        } else if (status === "TIME_EXPIRED") {
            timeExpired++;
        } else if (status === "TRACKING") {
            trackingActive++;
        }
    }

    const closedCount = targetHits + timeExpired;
    const winRate = closedCount > 0 ? ((targetHits / closedCount) * 100).toFixed(1) : "0.0";
    const avgDays = targetHits > 0 ? (totalDaysForHits / targetHits).toFixed(1) : "N/A";
    const t1HitRate = targetHits > 0 ? ((t1OnlyHits / targetHits) * 100).toFixed(1) : "0.0";

    metSheet.clear();

    metSheet.getRange("B2:D2").merge()
        .setValue("📊 STRATEGY FORWARD-EDGE DASHBOARD")
        .setFontWeight("bold").setFontSize(12)
        .setBackground("#0f172a").setFontColor("#ffffff")
        .setHorizontalAlignment("center");

    const summaryRows = [
        ["Metric Description", "Value", "Benchmark Target"],
        ["Total Signals Ingested", totalTracked, "Continuous Sample"],
        ["Currently Active (In-Play)", trackingActive, "Within 30 Days"],
        ["Target Hits (+6.0% Wins)", targetHits, "Primary Objective"],
        ["Time Expired (30-Day Limit)", timeExpired, "Trailing Exit"],
        ["Quarantine Hits (-20% Cutoff)", quarantined, "Risk Boundary (0 Expected)"],
        ["Win Rate on Completed Cycles", `${winRate}%`, "> 80.0% Expected"],
        ["Average Holding Days to Target", avgDays, "5 – 12 Days Expected"],
        ["T1-Only Win Ratio", `${t1HitRate}%`, "> 65.0% Expected"]
    ];

    metSheet.getRange(4, 2, summaryRows.length, 3).setValues(summaryRows);
    metSheet.getRange(4, 2, 1, 3).setFontWeight("bold").setBackground("#334155").setFontColor("#ffffff");
    metSheet.setColumnWidth(2, 240);
    metSheet.setColumnWidth(3, 120);
    metSheet.setColumnWidth(4, 180);
}

/**
 * Automates daily forward tracking in the 5:00 PM – 6:00 PM IST window
 */
function setupDailyTrackerTrigger() {
    const triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
        if (triggers[i].getHandlerFunction() === "runDailyTrackerPipeline") {
            ScriptApp.deleteTrigger(triggers[i]);
        }
    }

    ScriptApp.newTrigger("runDailyTrackerPipeline")
        .timeBased()
        .everyDays(1)
        .atHour(17) // 5:00 PM – 6:00 PM IST window (runs after 4:00 PM live engine)
        .create();

    SpreadsheetApp.getUi().alert("⏰ Daily Tracker Trigger Set!\n\nThe engine will automatically ingest and evaluate tracked setups every weekday between 5:00 PM and 6:00 PM IST.");
}

/**
 * Scheduled Master Pipeline Job
 */
function runDailyTrackerPipeline() {
    const day = new Date().getDay();
    if (day === 0 || day === 6) return; // Skip weekends

    ingestSignalsFromLiveEngine();
    evaluateForwardPositions();
}