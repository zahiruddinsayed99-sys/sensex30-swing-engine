/**
 * Signal Engine — SENSEX 30 Basket Cycle Strategy
 * Evaluates Trend -> Dip (>=5%) -> CAR Recovery -> 20 DMA & VWAP Reclaim -> Tranche Eligibility
 */

function generateEODSignals() {
    const startTime = Date.now();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const indSheet = ss.getSheetByName("INDICATORS");
    const posSheet = ss.getSheetByName("POSITIONS");
    const sigSheet = ss.getSheetByName("SIGNALS");

    if (!indSheet || !posSheet || !sigSheet) {
        SpreadsheetApp.getUi().alert("Required sheets missing.");
        return;
    }

    const indData = indSheet.getDataRange().getValues();
    if (indData.length < 2) {
        SpreadsheetApp.getUi().alert("INDICATORS sheet is empty. Run '3. Run EOD Scan' first.");
        return;
    }

    // Load existing positions map: symbol -> { status, tranche, slotsUsed, basketStatus }
    const posData = posSheet.getDataRange().getValues();
    const positionMap = {};
    let openPositionCount = 0;

    for (let p = 1; p < posData.length; p++) {
        const sym = posData[p][0];
        const status = posData[p][1];
        const tranche = posData[p][2] || "T0";
        const slots = Number(posData[p][3]) || 0;
        const basketStatus = posData[p][9] || "ACTIVE";

        if (sym) {
            positionMap[sym] = { status, tranche, slots, basketStatus };
            if (status === "OPEN") {
                openPositionCount++;
            }
        }
    }

    const todayStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
    const timeStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "HH:mm:ss");

    // Next trading date
    const execDateObj = new Date();
    execDateObj.setDate(execDateObj.getDate() + 1);
    if (execDateObj.getDay() === 6) execDateObj.setDate(execDateObj.getDate() + 2); // Sat -> Mon
    if (execDateObj.getDay() === 0) execDateObj.setDate(execDateObj.getDate() + 1); // Sun -> Mon
    const execDateStr = Utilities.formatDate(execDateObj, "Asia/Kolkata", "yyyy-MM-dd");

    const qualifiedCandidates = [];
    const allSignalsLog = [];

    for (let i = 1; i < indData.length; i++) {
        const [date, sym, cmp, dma20, dma20Prior, dma50, vwap, vol, avgVol, trend, dip, recovery, dma20Reclaim, vwapReclaim] = indData[i];

        const pos = positionMap[sym] || { status: "NONE", tranche: "T0", slots: 0, basketStatus: "ACTIVE" };

        const isMaxed = pos.slots >= CONFIG.MAX_TRANCHES_PER_STOCK;
        const isQuarantined = pos.basketStatus === "QUARANTINED";

        // Determine Candidate Type: NEW_NAME vs AVERAGING
        let candidateType = pos.status === "OPEN" ? "AVERAGING" : "NEW_NAME";
        let nextTranche = "T1";
        if (candidateType === "AVERAGING") {
            const currentTrancheNum = parseInt(pos.tranche.replace("T", "")) || 1;
            nextTranche = "T" + Math.min(currentTrancheNum + 1, CONFIG.MAX_TRANCHES_PER_STOCK);
        }

        // Core BUY Strategy Evaluation
        const passesTrend = trend === "PASS";
        const passesDip = dip === "PASS";
        const passesRecovery = recovery === "PASS";
        const passes20DmaReclaim = dma20Reclaim === "PASS";
        const passesVwapReclaim = vwapReclaim === "PASS";
        const passesTranche = !isMaxed && !isQuarantined;

        const isFullPass = passesTrend && passesDip && passesRecovery && passes20DmaReclaim && passesVwapReclaim && passesTranche;

        let finalSignal = "NO_ACTION";
        let reason = "Conditions not met";

        if (isMaxed) {
            finalSignal = "MAXED";
            reason = "Stock has reached maximum 5 tranches";
        } else if (isQuarantined) {
            finalSignal = "QUARANTINED";
            reason = "Position in quarantine (-20% threshold)";
        } else if (isFullPass) {
            finalSignal = "BUY " + nextTranche;
            reason = "Trend, Dip, Recovery, and both Reclaims confirmed";
        } else if (passesTrend && passesDip && passesRecovery && (!passes20DmaReclaim || !passesVwapReclaim)) {
            finalSignal = "WAIT_RECLAIM";
            reason = passes20DmaReclaim ? "VWAP reclaim pending" : "20 DMA reclaim pending";
        } else if (passesTrend && passesDip && !passesRecovery) {
            finalSignal = "WAIT_RECOVERY";
            reason = "Awaiting CAR recovery confirmation";
        }

        // Deterministic Rank Score Calculation
        let rankScore = 0;
        if (isFullPass) {
            const dma20Slope = ((dma20 - dma20Prior) / dma20Prior) * 100;
            const distAbove20Dma = ((cmp - dma20) / dma20) * 100;
            const distAboveVwap = ((cmp - vwap) / vwap) * 100;

            rankScore = Number((Math.max(0, dma20Slope * 15) + Math.max(0, distAbove20Dma * 10) + Math.max(0, distAboveVwap * 10)).toFixed(2));

            qualifiedCandidates.push({
                symbol: sym,
                candidateType: candidateType,
                currentTranche: pos.tranche,
                nextTranche: nextTranche,
                close: cmp,
                dma20: dma20,
                dma50: dma50,
                vwap: vwap,
                dip: dip,
                recovery: recovery,
                dma20Reclaim: dma20Reclaim,
                vwapReclaim: vwapReclaim,
                trend: trend,
                rankScore: rankScore
            });
        }

        allSignalsLog.push({
            signalId: "SIG-" + todayStr.replace(/-/g, "") + "-" + sym,
            date: todayStr,
            time: timeStr,
            execDate: execDateStr,
            symbol: sym,
            candidateType: candidateType,
            currentTranche: pos.tranche,
            nextTranche: nextTranche,
            close: cmp,
            dma20: dma20,
            dma50: dma50,
            vwap: vwap,
            dip: dip,
            recovery: recovery,
            dma20Reclaim: dma20Reclaim,
            vwapReclaim: vwapReclaim,
            trend: trend,
            rankScore: rankScore,
            finalSignal: finalSignal,
            reason: reason,
            isFullPass: isFullPass
        });
    }

    // Pass to Ranking Engine
    processRankingsAndActionQueue(qualifiedCandidates, allSignalsLog, openPositionCount, execDateStr);

    const execTime = Date.now() - startTime;
    logAudit("generateEODSignals", "GENERATE_SIGNALS", "SUCCESS", qualifiedCandidates.length, "Generated signals: " + qualifiedCandidates.length + " qualified BUY candidates", "", execTime);
}

/**
 * Daily Automated EOD Job (Triggered at 3:30 PM - 4:00 PM IST)
 * Runs market data fetch, indicators math, and generates next-day action queue.
 */
function runDailyEODJob() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sun, 6 = Sat

    // Weekend guard: Do not run on Saturday or Sunday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        Logger.log("Weekend detected. Skipping daily EOD scan.");
        return;
    }

    try {
        // 1. Fetch latest prices & calculate indicators in RAM
        runDataAndIndicatorPipeline();

        // 2. Generate signals and rank top candidates into ACTION_QUEUE
        generateEODSignals();

        logAudit("runDailyEODJob", "DAILY_EOD_JOB", "SUCCESS", 30, "Automated EOD scan & signal generation completed", "", 0);
    } catch (err) {
        logAudit("runDailyEODJob", "DAILY_EOD_JOB", "FAILED", 0, "Automated scan failed", err.message, 0);
    }
}