/**
 * In-Memory Pipeline: Parallel Market Data Fetch + Real-Time Indicator Engine
 */
function calcAvg(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((acc, v) => acc + v, 0) / arr.length;
}

function calcEMA(values, period) {
    if (!values || values.length < period) return null;
    const k = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < values.length; i++) {
        ema = values[i] * k + ema * (1 - k);
    }
    return ema;
}

function runDataAndIndicatorPipeline() {
    const startTime = Date.now();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const indSheet = ss.getSheetByName("INDICATORS");

    if (!indSheet) {
        safeAlert("INDICATORS sheet missing. Please run Clean Setup first.", "Indicators");
        return;
    }

    let constituents = [];
    try {
        constituents = getActiveConstituents();
    } catch (e) {
        safeAlert("Watchlist Error: " + e.message, "Indicators");
        return;
    }

    if (!constituents || constituents.length === 0) {
        safeAlert("No active stocks found in WATCHLIST.", "Indicators");
        return;
    }

    // Deduplicate constituents
    const seenSymbols = new Set();
    const activeStocks = [];
    for (let c = 0; c < constituents.length; c++) {
        const sym = constituents[c].symbol;
        if (sym && !seenSymbols.has(sym)) {
            seenSymbols.add(sym);
            activeStocks.push({
                symbol: sym,
                ticker: constituents[c].ticker || (sym.endsWith(".NS") ? sym : `${sym}.NS`)
            });
        }
    }

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

    const indicatorRows = [];
    const errors = [];

    for (let i = 0; i < rawResponses.length; i++) {
        const stock = rawResponses[i].stock;
        let resp = rawResponses[i].response;

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
            const adjCloseObj = result.indicators.adjclose ? result.indicators.adjclose[0].adjclose : null;
            const bars = [];

            for (let j = 0; j < timestamps.length; j++) {
                const rawC = quote.close[j];
                const rawO = quote.open[j];
                const rawH = quote.high[j];
                const rawL = quote.low[j];
                const v = quote.volume[j];

                if (rawC != null && rawH != null && rawL != null && rawO != null && v != null && v > 0) {
                    const adjC = (adjCloseObj && adjCloseObj[j] != null) ? adjCloseObj[j] : rawC;
                    const splitFactor = rawC > 0 ? (adjC / rawC) : 1.0;

                    bars.push({
                        date: Utilities.formatDate(new Date(timestamps[j] * 1000), "Asia/Kolkata", "yyyy-MM-dd"),
                        open: Number((rawO * splitFactor).toFixed(2)),
                        high: Number((rawH * splitFactor).toFixed(2)),
                        low: Number((rawL * splitFactor).toFixed(2)),
                        close: Number(adjC.toFixed(2)),
                        volume: Math.round(v)
                    });
                }
            }

            if (bars.length < 52) {
                throw new Error("Insufficient bars: " + bars.length);
            }

            bars.sort((a, b) => (a.date > b.date ? 1 : -1));

            const n = bars.length;
            const todayBar = bars[n - 1];
            const prevBar = bars[n - 2];
            const cmp = todayBar.close;

            const closes = bars.map(b => b.close);
            const ema20 = calcEMA(closes, 20);
            const ema50 = calcEMA(closes, 50);
            const ema200 = closes.length >= 200 ? calcEMA(closes, 200) : ema50;

            const volumes = bars.map(b => b.volume);
            const avgVol = Math.round(calcAvg(volumes.slice(-20)));
            const prevSessionVWAP = Number(((prevBar.high + prevBar.low + prevBar.close) / 3).toFixed(2));

            // 1. Structural Trend: Price > 200 EMA & medium-term structure intact
            const passesTrend = (cmp > ema200) && (ema20 > ema50 || cmp > ema50);
            const trendStatus = passesTrend ? "PASS" : "FAIL";

            // 2. Dynamic Pullback: Low touched 20 EMA, close holds above support
            const passesDip = (todayBar.low <= ema20 * 1.01) && (cmp >= ema20 * 0.985);
            const dipStatus = passesDip ? "PASS" : "FAIL";

            // 3. Recovery: Confirmed reversal above prior session high or VWAP
            const passesRecovery = (cmp >= prevBar.high) || (cmp > prevSessionVWAP && cmp > prevBar.close);
            const recoveryStatus = passesRecovery ? "PASS" : "FAIL";

            // 4. Reclaims
            const dma20Reclaim = cmp >= ema20 ? "PASS" : "FAIL";
            const vwapReclaim = cmp > prevSessionVWAP ? "PASS" : "FAIL";

            indicatorRows.push([
                todayBar.date,
                stock.symbol,
                cmp,
                Number(ema20.toFixed(2)),
                Number(ema50.toFixed(2)),
                Number(ema200.toFixed(2)),
                prevSessionVWAP,
                todayBar.volume,
                avgVol,
                trendStatus,
                dipStatus,
                recoveryStatus,
                dma20Reclaim,
                vwapReclaim
            ]);
        } catch (err) {
            errors.push(stock.symbol + ": " + err.message);
        }
    }

    if (indSheet.getLastRow() > 1) {
        indSheet.getRange(2, 1, indSheet.getLastRow() - 1, indSheet.getLastColumn()).clearContent();
    }

    if (indicatorRows.length > 0) {
        indSheet.getRange(2, 1, indicatorRows.length, indicatorRows[0].length).setValues(indicatorRows);
    }

    const execTime = Date.now() - startTime;
    if (typeof logAudit === "function") {
        logAudit("runDataAndIndicatorPipeline", "FETCH_INDICATORS", errors.length === 0 ? "SUCCESS" : "PARTIAL", indicatorRows.length, `Processed ${indicatorRows.length} active constituents`, errors.join("; "), execTime);
    }

    safeAlert(
        `In-Memory Scan Complete!\n\nExecution Time: ${(execTime / 1000).toFixed(1)}s\nStocks Processed: ${indicatorRows.length} / ${activeStocks.length}\nAdjusted series computed cleanly!`,
        "Indicators"
    );
}