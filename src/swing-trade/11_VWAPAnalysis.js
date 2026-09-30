/**
 * Phase C — VWAP Analysis
 *
 * Calculates Volume Weighted Average Price (VWAP)
 * using the supplied intraday candles.
 *
 * No trading signal is generated here.
 */


/**
 * Calculates VWAP for the supplied candle set.
 *
 * Typical Price = (High + Low + Close) / 3
 *
 * VWAP =
 * SUM(Typical Price × Volume) /
 * SUM(Volume)
 */
function calculateVWAP(candles) {
    if (!candles || candles.length === 0) {
        return {
            status: 'INSUFFICIENT DATA',
            message: 'No candles available.'
        };
    }

    let totalPriceVolume = 0;
    let totalVolume = 0;

    for (const candle of candles) {
        const high = Number(candle.high);
        const low = Number(candle.low);
        const close = Number(candle.close);
        const volume = Number(candle.volume);

        if (
            !Number.isFinite(high) ||
            !Number.isFinite(low) ||
            !Number.isFinite(close) ||
            !Number.isFinite(volume)
        ) {
            continue;
        }

        if (volume < 0) {
            continue;
        }

        const typicalPrice =
            (high + low + close) / 3;

        totalPriceVolume +=
            typicalPrice * volume;

        totalVolume += volume;
    }

    if (totalVolume <= 0) {
        return {
            status: 'INSUFFICIENT DATA',
            message:
                'No valid positive volume available for VWAP.'
        };
    }

    const vwap =
        totalPriceVolume / totalVolume;

    const latestCandle =
        candles[candles.length - 1];

    const currentPrice =
        Number(latestCandle.close);

    if (!Number.isFinite(currentPrice)) {
        return {
            status: 'DATA ERROR',
            message: 'Latest closing price is invalid.'
        };
    }

    let pricePosition = 'AT';

    /*
     * Small tolerance prevents insignificant
     * floating-point differences from being
     * treated as ABOVE or BELOW.
     */
    const tolerance =
        vwap * 0.0001;

    if (currentPrice > vwap + tolerance) {
        pricePosition = 'ABOVE';
    } else if (currentPrice < vwap - tolerance) {
        pricePosition = 'BELOW';
    }

    return {
        status: 'OK',
        vwap: vwap,
        currentPrice: currentPrice,
        pricePosition: pricePosition,
        candlesUsed: candles.length
    };
}

/**
 * Tests VWAP calculation using RELIANCE.NS.
 */
function runVWAPTest() {
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

        const result =
            getYahooData(
                symbol,
                timeframe,
                candleLookback
            );

        if (result.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'VWAP test failed.\n\n' +
                'Status: ' +
                result.status +
                '\nMessage: ' +
                result.message
            );
            return;
        }

        const analysis =
            calculateVWAP(result.candles);

        if (analysis.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'VWAP calculation failed.\n\n' +
                'Status: ' +
                analysis.status +
                '\nMessage: ' +
                analysis.message
            );
            return;
        }

        Logger.log('VWAP Test');

        Logger.log(
            JSON.stringify(analysis)
        );

        SpreadsheetApp.getUi().alert(
            'VWAP Test Successful\n\n' +
            'Symbol: ' + symbol + '\n' +
            'Timeframe: ' + timeframe + '\n\n' +
            'Current Price: ' +
            analysis.currentPrice.toFixed(2) +
            '\n' +
            'VWAP: ' +
            analysis.vwap.toFixed(2) +
            '\n' +
            'Price Position: ' +
            analysis.pricePosition +
            '\n' +
            'Candles Used: ' +
            analysis.candlesUsed
        );

    } catch (error) {
        SpreadsheetApp.getUi().alert(
            'VWAP test failed:\n\n' +
            error.message
        );
    }
}