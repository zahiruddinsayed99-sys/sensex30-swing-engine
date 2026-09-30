/**
 * Phase C — Candle Analysis
 *
 * Interprets individual OHLC candles.
 * No trading signal is generated here.
 */


/**
 * Analyzes a single candle.
 */
function analyzeCandle(candle) {
    if (!candle) {
        return {
            status: 'DATA ERROR',
            message: 'Candle is missing.'
        };
    }

    const open = Number(candle.open);
    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);

    if (
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
    ) {
        return {
            status: 'DATA ERROR',
            message: 'Invalid OHLC values.'
        };
    }

    if (high < low) {
        return {
            status: 'DATA ERROR',
            message: 'High cannot be lower than Low.'
        };
    }

    const range = high - low;
    const body = Math.abs(close - open);

    const upperWick =
        high - Math.max(open, close);

    const lowerWick =
        Math.min(open, close) - low;

    let direction = 'NEUTRAL';

    if (close > open) {
        direction = 'BULLISH';
    } else if (close < open) {
        direction = 'BEARISH';
    }

    let bodyType = 'DOJI';

    if (range > 0) {
        const bodyRatio = body / range;

        if (bodyRatio >= 0.60) {
            bodyType = 'STRONG_BODY';
        } else if (bodyRatio >= 0.30) {
            bodyType = 'NORMAL_BODY';
        } else {
            bodyType = 'SMALL_BODY';
        }
    }

    return {
        status: 'OK',
        direction: direction,
        bodyType: bodyType,
        open: open,
        high: high,
        low: low,
        close: close,
        range: range,
        body: body,
        upperWick: upperWick,
        lowerWick: lowerWick
    };
}

/**
 * Tests candle interpretation using
 * the latest retrieved RELIANCE.NS candle.
 */
function runCandleTest() {
    try {
        const settings = getSettings();

        const validation =
            validateSettings(settings);

        if (!validation.valid) {
            SpreadsheetApp.getUi().alert(
                'Settings validation failed:\n\n' +
                validation.errors.join('\n')
            );
            return;
        }

        const symbol = 'RELIANCE.NS';

        const timeframe =
            String(settings['Lower Timeframe']).trim();

        const lookback =
            Number(settings['Candle Lookback']);

        const result =
            getYahooData(
                symbol,
                timeframe,
                lookback
            );

        if (result.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'Candle test failed.\n\n' +
                'Status: ' + result.status + '\n' +
                'Message: ' + result.message
            );
            return;
        }

        const candles = result.candles;

        if (candles.length === 0) {
            SpreadsheetApp.getUi().alert(
                'Candle test failed: no candles returned.'
            );
            return;
        }

        const latestCandle =
            candles[candles.length - 1];

        const analysis =
            analyzeCandle(latestCandle);

        if (analysis.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'Candle analysis failed:\n\n' +
                analysis.message
            );
            return;
        }

        Logger.log(
            'Candle Analysis Test'
        );

        Logger.log(
            JSON.stringify(analysis)
        );

        SpreadsheetApp.getUi().alert(
            'Candle Analysis Successful\n\n' +
            'Symbol: ' + symbol + '\n' +
            'Timeframe: ' + timeframe + '\n\n' +
            'Timestamp: ' +
            latestCandle.timestamp + '\n\n' +
            'Open: ' + analysis.open + '\n' +
            'High: ' + analysis.high + '\n' +
            'Low: ' + analysis.low + '\n' +
            'Close: ' + analysis.close + '\n\n' +
            'Direction: ' +
            analysis.direction + '\n' +
            'Body Type: ' +
            analysis.bodyType + '\n' +
            'Range: ' +
            analysis.range + '\n' +
            'Body: ' +
            analysis.body + '\n' +
            'Upper Wick: ' +
            analysis.upperWick + '\n' +
            'Lower Wick: ' +
            analysis.lowerWick
        );

    } catch (error) {
        SpreadsheetApp.getUi().alert(
            'Candle test failed:\n\n' +
            error.message
        );
    }
}
