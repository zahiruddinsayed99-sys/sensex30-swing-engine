/**
 * Phase C — Moving Average Analysis
 *
 * Calculates a simple moving average (SMA)
 * and compares the current price against it.
 *
 * No trading signal is generated here.
 */


/**
 * Calculates a simple moving average using
 * the closing prices of the supplied candles.
 */
function calculateMovingAverage(candles, period) {
    if (!candles || candles.length === 0) {
        return {
            status: 'INSUFFICIENT DATA',
            message: 'No candles available.'
        };
    }

    if (!Number.isInteger(period) || period <= 0) {
        return {
            status: 'DATA ERROR',
            message: 'Invalid moving average period.'
        };
    }

    if (candles.length < period) {
        return {
            status: 'INSUFFICIENT DATA',
            message:
                'Not enough candles for moving average. ' +
                'Required: ' + period +
                ', received: ' + candles.length
        };
    }

    const recentCandles =
        candles.slice(candles.length - period);

    const closes = [];

    for (const candle of recentCandles) {
        const close = Number(candle.close);

        if (!Number.isFinite(close)) {
            return {
                status: 'DATA ERROR',
                message: 'Invalid closing price found.'
            };
        }

        closes.push(close);
    }

    const total =
        closes.reduce(
            (sum, close) => sum + close,
            0
        );

    const movingAverage =
        total / closes.length;

    const currentPrice =
        closes[closes.length - 1];

    let pricePosition = 'AT';

    const tolerance =
        movingAverage * 0.0001;

    if (currentPrice > movingAverage + tolerance) {
        pricePosition = 'ABOVE';
    } else if (
        currentPrice < movingAverage - tolerance
    ) {
        pricePosition = 'BELOW';
    }

    return {
        status: 'OK',
        period: period,
        movingAverage: movingAverage,
        currentPrice: currentPrice,
        pricePosition: pricePosition
    };
}

/**
 * Tests the moving average calculation
 * using RELIANCE.NS.
 */
function runMovingAverageTest() {
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
            String(
                settings['Lower Timeframe']
            ).trim();

        const candleLookback =
            Number(
                settings['Candle Lookback']
            );

        const movingAveragePeriod =
            Number(
                settings['Moving Average'] ??
                settings['Moving Average Period']
            );
        Logger.log(
            'Moving Average Period: ' +
            movingAveragePeriod
        );

        /*
         * We need enough candles for the MA.
         * Candle lookback is currently 20,
         * and MA period is also 20.
         */
        const requiredLookback =
            Math.max(
                candleLookback,
                movingAveragePeriod
            );

        const result =
            getYahooData(
                symbol,
                timeframe,
                requiredLookback
            );

        if (result.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'Moving Average test failed.\n\n' +
                'Status: ' +
                result.status +
                '\nMessage: ' +
                result.message
            );
            return;
        }

        const analysis =
            calculateMovingAverage(
                result.candles,
                movingAveragePeriod
            );

        if (analysis.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'Moving Average calculation failed.\n\n' +
                'Status: ' +
                analysis.status +
                '\nMessage: ' +
                analysis.message
            );
            return;
        }

        Logger.log(
            'Moving Average Test'
        );

        Logger.log(
            JSON.stringify(analysis)
        );

        SpreadsheetApp.getUi().alert(
            'Moving Average Test Successful\n\n' +
            'Symbol: ' + symbol + '\n' +
            'Timeframe: ' + timeframe + '\n' +
            'Period: ' + analysis.period + '\n\n' +
            'Current Price: ' +
            analysis.currentPrice.toFixed(2) +
            '\n' +
            'Moving Average: ' +
            analysis.movingAverage.toFixed(2) +
            '\n' +
            'Price Position: ' +
            analysis.pricePosition
        );

    } catch (error) {
        SpreadsheetApp.getUi().alert(
            'Moving Average test failed:\n\n' +
            error.message
        );
    }
}
