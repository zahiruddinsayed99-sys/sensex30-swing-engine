/**
 * Signal Engine — SENSEX Multi-Tier Basket Cycle Strategy
 * Evaluates 4 Tranches, Target Exits (+6%), Quarantine Protection (-20%), and Dispatches EOD Email Alerts
 */

function generateEODSignals() {
    const startTime = Date.now();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const indSheet = ss.getSheetByName("INDICATORS");
    const posSheet = ss.getSheetByName("POSITIONS");
    const sigSheet = ss.getSheetByName("SIGNALS");

    if (!indSheet || !posSheet || !sigSheet) {
        safeAlert("Required sheets missing.", "Gen. EOD Signal");
        return;
    }

    const indData = indSheet.getDataRange().getValues();
    if (indData.length < 2) {
        safeAlert("INDICATORS sheet is empty. Run '3. Run EOD Scan' first.", "Gen. EOD Signal");
        return;
    }

    const tierMap = {};
    if (typeof getActiveConstituents === "function") {
        const constituents = getActiveConstituents();
        constituents.forEach(item => {
            tierMap[item.symbol] = item.tier;
        });
    }

    // Load existing positions map
    const posData = posSheet.getDataRange().getValues();
    const positionMap = {};
    let openPositionCount = 0;

    for (let p = 1; p < posData.length; p++) {
        const sym = posData[p][0];
        const status = posData[p][1];
        const tranche = posData[p][2] || "T0";
        const slots = Number(posData[p][3]) || 0;
        const totalInvested = Number(posData[p][4]) || 0;
        const avgPrice = Number(posData[p][5]) || 0;
        const t1Price = Number(posData[p][6]) || avgPrice;
        const basketStatus = posData[p][9] || "ACTIVE";

        if (sym) {
            positionMap[sym] = { status, tranche, slots, totalInvested, avgPrice, t1Price, basketStatus };
            if (status === "OPEN") {
                openPositionCount++;
            }
        }
    }

    const todayStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd");
    const timeStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "HH:mm:ss");

    const execDateObj = new Date();
    execDateObj.setDate(execDateObj.getDate() + 1);
    if (execDateObj.getDay() === 6) execDateObj.setDate(execDateObj.getDate() + 2);
    if (execDateObj.getDay() === 0) execDateObj.setDate(execDateObj.getDate() + 1);
    const execDateStr = Utilities.formatDate(execDateObj, "Asia/Kolkata", "yyyy-MM-dd");

    const qualifiedCandidates = [];
    const allSignalsLog = [];
    const MAX_STOCKS = CONFIG.MAX_DISTINCT_STOCKS || 6;
    const TARGET_PCT = CONFIG.CONSOLIDATED_TARGET_PCT || 6.0;
    const QUARANTINE_PCT = CONFIG.QUARANTINE_PCT || -20.0;
    const MAX_TRANCHES = CONFIG.MAX_TRANCHES_PER_STOCK || 4;

    for (let i = 1; i < indData.length; i++) {
        const [date, sym, cmp, ema20, ema50, ema200, vwap, vol, avgVol, trend, dip, recovery, dma20Reclaim, vwapReclaim] = indData[i];

        const pos = positionMap[sym] || { status: "NONE", tranche: "T0", slots: 0, totalInvested: 0, avgPrice: 0, t1Price: 0, basketStatus: "ACTIVE" };
        const stockTier = tierMap[sym] || "SENSEX_30";

        const currentTrancheNum = parseInt(String(pos.tranche).replace("T", "")) || 0;
        const isMaxed = pos.slots >= MAX_TRANCHES || currentTrancheNum >= MAX_TRANCHES;
        const isQuarantined = pos.basketStatus === "QUARANTINED";

        let finalSignal = "NO_ACTION";
        let reason = "Conditions not met";
        let isFullPass = false;
        let rankScore = 0;
        let candidateType = pos.status === "OPEN" ? "AVERAGING" : "NEW_NAME";
        let nextTranche = "T1";

        // ----------------------------------------------------
        // BRANCH A: ACTIVE OPEN POSITIONS (AVERAGING / TARGET / QUARANTINE)
        // ----------------------------------------------------
        if (pos.status === "OPEN") {
            const t1RefPrice = pos.t1Price > 0 ? pos.t1Price : pos.avgPrice;
            const drawdownFromT1 = (t1RefPrice && t1RefPrice > 0) ? ((cmp - t1RefPrice) / t1RefPrice) * 100 : 0;
            const pnlFromAvg = (pos.avgPrice && pos.avgPrice > 0) ? ((cmp - pos.avgPrice) / pos.avgPrice) * 100 : 0;

            // 1. Target Exit Check (+6.0%)
            if (pnlFromAvg >= TARGET_PCT) {
                finalSignal = "EXIT_PROFIT";
                reason = `Target reached (+${pnlFromAvg.toFixed(1)}%). Book profit on ${pos.tranche}.`;
            }
            // 2. Quarantine Check (-20% from T1)
            else if (drawdownFromT1 <= QUARANTINE_PCT || isQuarantined) {
                finalSignal = "QUARANTINED";
                reason = `Down ${drawdownFromT1.toFixed(1)}% from T1 (below ${QUARANTINE_PCT}%). Freeze buying.`;
            }
            // 3. Max Tranches Reached
            else if (isMaxed) {
                finalSignal = "HOLD_MAX";
                reason = `Max ${MAX_TRANCHES} tranches allocated. Awaiting mean-reversion recovery.`;
            }
            // 4. Tranche Additions
            else {
                if (currentTrancheNum === 1 && drawdownFromT1 <= -4.5) {
                    nextTranche = "T2";
                    isFullPass = true;
                    finalSignal = "BUY " + nextTranche;
                    reason = `Down ${drawdownFromT1.toFixed(1)}% from T1. Allocate Tranche 2.`;
                } else if (currentTrancheNum === 2 && drawdownFromT1 <= -9.5) {
                    nextTranche = "T3";
                    isFullPass = true;
                    finalSignal = "BUY " + nextTranche;
                    reason = `Down ${drawdownFromT1.toFixed(1)}% from T1. Allocate Tranche 3.`;
                } else if (currentTrancheNum === 3 && drawdownFromT1 <= -14.5) {
                    nextTranche = "T4";
                    isFullPass = true;
                    finalSignal = "BUY " + nextTranche;
                    reason = `Down ${drawdownFromT1.toFixed(1)}% from T1. Allocate Tranche 4.`;
                } else {
                    finalSignal = "HOLD";
                    reason = `Position open (${pos.tranche}). PnL: ${pnlFromAvg.toFixed(1)}%. Drawdown: ${drawdownFromT1.toFixed(1)}%.`;
                }
            }
        }
        // ----------------------------------------------------
        // BRANCH B: NEW NAME EVALUATION (TRANCHE 1)
        // ----------------------------------------------------
        else {
            if (openPositionCount >= MAX_STOCKS) {
                finalSignal = "PORTFOLIO_FULL";
                reason = `Portfolio breadth limit reached (${openPositionCount}/${MAX_STOCKS}). No new T1 entries allowed.`;
            } else if (cmp > (CONFIG.MAX_SHARE_PRICE || 50000)) {
                finalSignal = "SKIPPED_PRICE";
                reason = `CMP ₹${cmp} exceeds max unit slot limit.`;
            } else {
                const passesTrend = trend === "PASS";
                const passesDip = dip === "PASS";
                const passesRecovery = recovery === "PASS";
                const passes20DmaReclaim = dma20Reclaim === "PASS";

                if (passesTrend && passesDip && passesRecovery && passes20DmaReclaim) {
                    isFullPass = true;
                    nextTranche = "T1";
                    finalSignal = "BUY T1";
                    reason = "Tranche 1 entry: 20 EMA pullback confirmed with recovery.";
                } else if (passesTrend && passesDip && !passesRecovery) {
                    finalSignal = "WAIT_TRIGGER";
                    reason = "Pullback at 20 EMA support. Awaiting reversal confirmation.";
                } else if (passesTrend && !passesDip) {
                    finalSignal = "NO_ACTION";
                    reason = "No Dip Setup. Stock 200 EMA ke upar hai par abhi apne 20 EMA support zone se dur chal raha hai.";
                } else if (!passesTrend) {
                    finalSignal = "NO_ACTION";
                    reason = "Trend filter failed (below 200 EMA).";
                } else {
                    finalSignal = "NO_ACTION";
                    reason = "20 EMA reclaim pending.";
                }
            }
        }

        if (isFullPass) {
            const volMultiple = avgVol > 0 ? (vol / avgVol) : 1;
            const distAboveEma20 = ema20 > 0 ? ((cmp - ema20) / ema20) * 100 : 0;
            const typePriority = candidateType === "AVERAGING" ? 50 : 0;
            rankScore = Number((typePriority + Math.max(0, volMultiple * 20) + Math.max(0, distAboveEma20 * 10)).toFixed(2));

            qualifiedCandidates.push({
                symbol: sym,
                tier: stockTier,
                candidateType: candidateType,
                currentTranche: pos.tranche,
                nextTranche: nextTranche,
                close: cmp,
                dma20: ema20,
                dma50: ema50,
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
            tier: stockTier,
            candidateType: candidateType,
            currentTranche: pos.tranche,
            nextTranche: nextTranche,
            close: cmp,
            dma20: ema20,
            dma50: ema50,
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

    let availableCash = CONFIG.CYCLE_CAPITAL;
    let totalInvested = 0;
    for (let p = 1; p < posData.length; p++) {
        totalInvested += Number(posData[p][4]) || 0;
    }
    availableCash = CONFIG.CYCLE_CAPITAL - totalInvested;

    let openHedgePositions = [];
    const hedgeSheet = ss.getSheetByName("HEDGE_POSITIONS");
    if (hedgeSheet) {
        const hData = hedgeSheet.getDataRange().getValues();
        for (let h = 1; h < hData.length; h++) {
            openHedgePositions.push({
                trancheId: hData[h][0],
                symbol: hData[h][1],
                buyPrice: hData[h][3],
                qty: hData[h][4],
                status: hData[h][6]
            });
        }
    }

    let hedgeActions = [];
    if (typeof evaluateSensexEtfHedge === "function") {
        hedgeActions = evaluateSensexEtfHedge(qualifiedCandidates.length, openHedgePositions, availableCash);
    }

    processRankingsAndActionQueue(qualifiedCandidates, allSignalsLog, openPositionCount, execDateStr, hedgeActions);

    const execTime = Date.now() - startTime;
    logAudit("generateEODSignals", "GENERATE_SIGNALS", "SUCCESS", qualifiedCandidates.length, `Evaluated ${allSignalsLog.length} stocks | Generated ${qualifiedCandidates.length} qualified BUY/AVERAGING candidates`, "", execTime);
}

/**
 * Daily Automated EOD Job (Triggered automatically at 4:00 PM IST)
 * Runs market data fetch, indicators math, signal generation, and dispatches automated HTML email alert.
 */
function runDailyEODJob() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sun, 6 = Sat

    if (dayOfWeek === 0 || dayOfWeek === 6) {
        Logger.log("Weekend detected. Skipping daily EOD scan.");
        return;
    }

    try {
        // 1. Fetch latest prices & calculate indicators in RAM
        runDataAndIndicatorPipeline();

        // 2. Generate signals and rank top candidates into ACTION_QUEUE
        generateEODSignals();

        // 3. Dispatch automated HTML email alert if BUY or EXIT signals exist
        if (typeof sendEODSignalAlert === "function") {
            sendEODSignalAlert();
        }

        const constituentsCount = typeof getActiveConstituents === "function" ? getActiveConstituents().length : 100;
        logAudit("runDailyEODJob", "DAILY_EOD_JOB", "SUCCESS", constituentsCount, "Automated EOD scan, signals & email alert sent", "", 0);
    } catch (err) {
        Logger.log("ERROR STACK TRACE: " + err.stack);
        logAudit("runDailyEODJob", "DAILY_EOD_JOB", "FAILED", 0, "Automated scan failed: " + err.message, err.stack, 0);
    }
}