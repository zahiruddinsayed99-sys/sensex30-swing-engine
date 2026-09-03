/**
 * In-Memory Pipeline: Parallel Market Data Fetch + Real-Time Indicator & CAR State Engine
 */
function runDataAndIndicatorPipeline() {
    const startTime = Date.now();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const wlSheet = ss.getSheetByName("WATCHLIST");
    const indSheet = ss.getSheetByName("INDICATORS");

    if (!wlSheet || !indSheet) {
        SpreadsheetApp.getUi().alert("Required sheets missing.");
        return;
    }

    const wlData = wlSheet.getDataRange().getValues();
    const activeStocks = [];

    for (let r = 1; r < wlData.length; r++) {
        if (String(wlData[r][2]).toUpperCase() === "YES" && wlData[r][1]) {
            activeStocks.push({
                symbol: wlData[r][0],
                ticker: wlData[r][1].toString().trim()
            });
        }
    }

    if (activeStocks.length === 0) {
        SpreadsheetApp.getUi().alert("No active stocks found in WATCHLIST.");
        return;
    }

    // 1. Fetch in two parallel batches of 15
    const BATCH_SIZE = 15;
    const rawResponses = [];

    for (let b = 0; b < activeStocks.length; b += BATCH_SIZE) {
        const batch = activeStocks.slice(b, b + BATCH_SIZE);
        const requests = batch.map(item => ({
            url: "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(item.ticker) + "?interval=1d&range=1y",
            muteHttpExceptions: true,
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        }));

        const batchResponses = UrlFetchApp.fetchAll(requests);
        batchResponses.forEach((res, idx) => {
            rawResponses.push({ stock: batch[idx], response: res });
        });

        if (b + BATCH_SIZE < activeStocks.length) {
            Utilities.sleep(400);
        }
    }

    // 2. Parse bars & compute indicators directly in memory
    const indicatorRows = [];
    const errors = [];
    let successCount = 0;

    for (let i = 0; i < rawResponses.length; i++) {
        const stock = rawResponses[i].stock;
        let resp = rawResponses[i].response;

        // Auto-retry once if throttled (429) or network issue
        if (!resp || resp.getResponseCode() !== 200) {
            Utilities.sleep(1200);
            try {
                const retryUrl = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(stock.ticker) + "?interval=1d&range=1y";
                resp = UrlFetchApp.fetch(retryUrl, {
                    muteHttpExceptions: true,
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
                });
            } catch (e) { }
        }

        try {
            if (!resp || resp.getResponseCode() !== 200) {
                throw new Error("HTTP " + (resp ? resp.getResponseCode() : "No response"));
            }

            const json = JSON.parse(resp.getContentText());
            const result = json.chart && json.chart.result ? json.chart.result[0] : null;
            if (!result || !result.timestamp || !result.indicators.quote[0]) {
                throw new Error("Empty payload");
            }

            const timestamps = result.timestamp;
            const quote = result.indicators.quote[0];
            const bars = [];

            for (let j = 0; j < timestamps.length; j++) {
                const o = quote.open[j];
                const h = quote.high[j];
                const l = quote.low[j];
                const c = quote.close[j];
                const v = quote.volume[j];

                if (o != null && h != null && l != null && c != null && v != null && v > 0) {
                    bars.push({
                        date: Utilities.formatDate(new Date(timestamps[j] * 1000), "Asia/Kolkata", "yyyy-MM-dd"),
                        open: Number(o.toFixed(2)),
                        high: Number(h.toFixed(2)),
                        low: Number(l.toFixed(2)),
                        close: Number(c.toFixed(2)),
                        volume: Math.round(v)
                    });
                }
            }

            if (bars.length < 52) {
                throw new Error("Insufficient bars: " + bars.length);
            }

            bars.sort((a, b) => (a.date > b.date ? 1 : -1));

            // --- CALCULATIONS ---
            const n = bars.length;
            const todayBar = bars[n - 1];
            const prevBar = bars[n - 2];
            const cmp = todayBar.close;

            const closes = bars.map(b => b.close);
            const dma20 = calcAvg(closes.slice(-20));
            const dma20Prior = calcAvg(closes.slice(-21, -1));
            const dma50 = calcAvg(closes.slice(-50));

            const volumes = bars.map(b => b.volume);
            const avgVol = Math.round(calcAvg(volumes.slice(-20)));

            // Single-Day Previous Session VWAP: Typical Price (H+L+C)/3
            const prevSessionVWAP = Number(((prevBar.high + prevBar.low + prevBar.close) / 3).toFixed(2));

            // 1. Trend Filter: 20 DMA flat-to-rising AND CMP > 50 DMA
            const isTrendPass = (dma20 >= dma20Prior) && (cmp > dma50);
            const trendStatus = isTrendPass ? "PASS" : "FAIL";

            // 2. Dip Filter: >= 5% drop from 30-day reference high
            const recent30Bars = bars.slice(-30);
            let refHigh = -1;
            let highIdx = -1;
            for (let k = 0; k < recent30Bars.length; k++) {
                if (recent30Bars[k].high > refHigh) {
                    refHigh = recent30Bars[k].high;
                    highIdx = k;
                }
            }
            const dipPercent = ((refHigh - cmp) / refHigh) * 100;
            const dipStatus = dipPercent >= 5.0 ? "PASS" : "FAIL";

            // 3. CAR Recovery Logic (Cumulative Average Recovery)
            const closesSinceHigh = recent30Bars.slice(highIdx).map(b => b.close);
            let recoveryStatus = "FAIL";
            if (closesSinceHigh.length >= 3) {
                const cumAvgs = [];
                let runningSum = 0;
                for (let m = 0; m < closesSinceHigh.length; m++) {
                    runningSum += closesSinceHigh[m];
                    cumAvgs.push(runningSum / (m + 1));
                }
                // Uptrend in cumulative average + bouncing above prior session low
                if (cumAvgs[cumAvgs.length - 1] > cumAvgs[cumAvgs.length - 2] && cmp > prevBar.low) {
                    recoveryStatus = "PASS";
                }
            }

            // 4. Reclaims: CMP > 20 DMA AND CMP > Previous Session VWAP
            const dma20Reclaim = cmp > dma20 ? "PASS" : "FAIL";
            const vwapReclaim = cmp > prevSessionVWAP ? "PASS" : "FAIL";

            indicatorRows.push([
                todayBar.date,
                stock.symbol,
                cmp,
                Number(dma20.toFixed(2)),
                Number(dma20Prior.toFixed(2)),
                Number(dma50.toFixed(2)),
                prevSessionVWAP,
                todayBar.volume,
                avgVol,
                trendStatus,
                dipStatus,
                recoveryStatus,
                dma20Reclaim,
                vwapReclaim
            ]);

            successCount++;
        } catch (err) {
            errors.push(stock.symbol + ": " + err.message);
        }
    }

    // 3. Write directly to INDICATORS
    if (indSheet.getLastRow() > 1) {
        indSheet.getRange(2, 1, indSheet.getLastRow() - 1, indSheet.getLastColumn()).clearContent();
    }

    if (indicatorRows.length > 0) {
        indSheet.getRange(2, 1, indicatorRows.length, indicatorRows[0].length).setValues(indicatorRows);
    }

    const execTime = Date.now() - startTime;
    const status = errors.length === 0 ? "SUCCESS" : "PARTIAL";
    logAudit("runDataAndIndicatorPipeline", "IN_MEMORY_SCAN", status, successCount, "Computed indicators in RAM", errors.join("; "), execTime);

    SpreadsheetApp.getUi().alert(
        "⚡ In-Memory Scan Complete!\n\n" +
        "Execution Time: " + (execTime / 1000).toFixed(1) + "s\n" +
        "Stocks Processed: " + successCount + " / " + activeStocks.length + "\n" +
        (errors.length > 0 ? "Errors:\n" + errors.join("\n") : "All 30 constituents computed cleanly!")
    );
}

function calcAvg(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((acc, v) => acc + v, 0) / arr.length;
}