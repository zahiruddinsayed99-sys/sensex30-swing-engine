/**
 * Ranking Engine — Implements:
 * 1. "Diversify First" priority rule (Fill up to 10 distinct names first, then average)
 * 2. Deterministic ranking without artificial tie-breakers
 * 3. Daily BUY limit of 5 candidates into ACTION_QUEUE
 */

function processRankingsAndActionQueue(candidates, allSignals, openPositionCount, execDateStr) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sigSheet = ss.getSheetByName("SIGNALS");
    const queueSheet = ss.getSheetByName("ACTION_QUEUE");
    const histSheet = ss.getSheetByName("SIGNAL_HISTORY");

    if (candidates.length > 0) {
        candidates.sort((a, b) => {
          if (openPositionCount < CONFIG.MAX_DISTINCT_STOCKS) {
            if (a.candidateType === "NEW_NAME" && b.candidateType === "AVERAGING") return -1;
            if (a.candidateType === "AVERAGING" && b.candidateType === "NEW_NAME") return 1;
          }

          const tierWeights = { "SENSEX_30": 3, "NEXT_30": 2, "TOP_40": 1 };
          const tierA = tierWeights[a.tier] || 1;
          const tierB = tierWeights[b.tier] || 1;
          if (tierA !== tierB) return tierB - tierA;

          return b.rankScore - a.rankScore;
        });

        let currentRank = 1;
        for (let c = 0; c < candidates.length; c++) {
            if (c > 0 && candidates[c].rankScore < candidates[c - 1].rankScore) {
                currentRank = c + 1;
            }
            candidates[c].rank = currentRank;
        }
    }

    const rankedMap = {};
    candidates.forEach(c => {
        rankedMap[c.symbol] = c;
    });

    const signalRows = allSignals.map(s => {
        const ranked = rankedMap[s.symbol];
        const rank = ranked ? ranked.rank : "-";
        const status = ranked ? (ranked.rank <= CONFIG.DAILY_BUY_LIMIT ? "QUEUED" : "DEFERRED") : "EVALUATED";

        return [
            s.signalId,
            s.date,
            s.time,
            s.execDate,
            s.symbol,
            s.candidateType,
            s.currentTranche,
            s.nextTranche,
            s.close,
            s.dma20,
            s.dma50,
            s.vwap,
            s.dip,
            s.recovery,
            s.dma20Reclaim,
            s.vwapReclaim,
            s.trend,
            s.rankScore,
            rank,
            s.finalSignal,
            s.reason,
            status,
            "FROZEN"
        ];
    });

    if (sigSheet.getLastRow() > 1) {
        sigSheet.getRange(2, 1, sigSheet.getLastRow() - 1, sigSheet.getLastColumn()).clearContent();
    }
    if (signalRows.length > 0) {
        sigSheet.getRange(2, 1, signalRows.length, signalRows[0].length).setValues(signalRows);
    }

    const actionQueueRows = [];
    const topCandidates = candidates.slice(0, CONFIG.DAILY_BUY_LIMIT);

    topCandidates.forEach(cand => {
        actionQueueRows.push([
            execDateStr,
            cand.symbol,
            cand.candidateType === "NEW_NAME" ? "BUY_NEW" : "BUY_AVERAGE",
            cand.nextTranche,
            CONFIG.SLOT_SIZE,
            cand.rank,
            cand.rankScore,
            "SIG-" + execDateStr.replace(/-/g, "") + "-" + cand.symbol,
            "VALID",
            "READY",
            "PENDING_MANUAL",
            ""
        ]);
    });

    if (queueSheet.getLastRow() > 1) {
        queueSheet.getRange(2, 1, queueSheet.getLastRow() - 1, queueSheet.getLastColumn()).clearContent();
    }
    if (actionQueueRows.length > 0) {
        queueSheet.getRange(2, 1, actionQueueRows.length, actionQueueRows[0].length).setValues(actionQueueRows);
    }

    if (topCandidates.length > 0 && histSheet) {
        const historyRows = topCandidates.map(c => [
            execDateStr,
            c.symbol,
            c.candidateType,
            c.close,
            c.dma20,
            c.dma50,
            c.vwap,
            c.trend,
            c.rankScore,
            c.rank,
            "BUY " + c.nextTranche,
            "Passed all filters & queued in top 5"
        ]);
        histSheet.getRange(histSheet.getLastRow() + 1, 1, historyRows.length, historyRows[0].length).setValues(historyRows);
    }

    SpreadsheetApp.getUi().alert(
        "🎯 EOD Signal & Ranking Engine Complete!\n\n" +
        "Total Candidates Evaluated: 30\n" +
        "Qualified BUY Candidates: " + candidates.length + "\n" +
        "Queued for Tomorrow's Action: " + topCandidates.length + " (Max 5 Limit)\n\n" +
        "Review the 'SIGNALS' and 'ACTION_QUEUE' tabs."
    );
}