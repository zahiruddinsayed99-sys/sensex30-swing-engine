/**
 * Phase C — Lower Timeframe Analysis
 *
 * Builds the lower-timeframe confirmation layer.
 *
 * No final CONFIRM / WAIT / NO SETUP decision
 * is generated here.
 */


/**
 * Determines whether price has reclaimed a level.
 *
 * Reclaim means:
 * Previous close was at/below the level
 * AND
 * latest close is above the level.
 */
function detectBullishReclaim(
    previousClose,
    currentClose,
    previousLevel,
    currentLevel
) {
    if (
        !Number.isFinite(previousClose) ||
        !Number.isFinite(currentClose) ||
        !Number.isFinite(previousLevel) ||
        !Number.isFinite(currentLevel)
    ) {
        return false;
    }

    return (
        previousClose <= previousLevel &&
        currentClose > currentLevel
    );
}


/**
 * Determines the closing position within
 * the latest candle's range.
 */
function determineClosePosition(candle) {
    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);

    if (
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
    ) {
        return 'UNKNOWN';
    }

    const range = high - low;

    if (range <= 0) {
        return 'AT_RANGE';
    }

    const position =
        (close - low) / range;

    if (position >= 0.70) {
        return 'NEAR_HIGH';
    }

    if (position <= 0.30) {
        return 'NEAR_LOW';
    }

    return 'MIDDLE';
}


/**
 * Determines lower-timeframe context.
 *
 * This is descriptive context only.
 * It is NOT the final trading decision.
 */
function determineLowerTFContext(
    priceVsVWAP,
    vwapReclaim,
    priceVsMA,
    maReclaim,
    candleDirection,
    candleStrength,
    volumeConfirmation
) {
    const bullishConditions = [
        priceVsVWAP === 'ABOVE',
        vwapReclaim === 'YES',
        priceVsMA === 'ABOVE',
        maReclaim === 'YES',
        candleDirection === 'BULLISH',
        candleStrength === 'STRONG_BODY',
        volumeConfirmation === 'HIGH'
    ];

    const bearishConditions = [
        priceVsVWAP === 'BELOW',
        priceVsMA === 'BELOW',
        candleDirection === 'BEARISH',
        volumeConfirmation === 'LOW'
    ];

    const bullishCount =
        bullishConditions.filter(Boolean).length;

    const bearishCount =
        bearishConditions.filter(Boolean).length;

    /*
     * Context is deliberately descriptive.
     * The final decision belongs to the
     * Decision Engine.
     */
    if (bullishCount >= 4) {
        return 'POSITIVE';
    }

    if (bearishCount >= 3) {
        return 'NEGATIVE';
    }

    return 'NEUTRAL';
}


/**
 * Builds complete lower-timeframe analysis.
 */
function analyzeLowerTimeframe(
    symbol,
    settings
) {
    if (!symbol) {
        return {
            status: 'DATA ERROR',
            message: 'Stock symbol is missing.'
        };
    }

    if (!settings) {
        return {
            status: 'DATA ERROR',
            message: 'Settings are missing.'
        };
    }

    const timeframe =
        String(
            settings['Lower Timeframe']
        ).trim();

    const candleLookback =
        Number(
            settings['Candle Lookback']
        );

    const volumeLookback =
        Number(
            settings['Volume Lookback']
        );

    const movingAveragePeriod =
        Number(
            settings['Moving Average'] ??
            settings['Moving Average Period']
        );

    /*
    * Need at least enough candles for:
    * - Candle Lookback
    * - Volume Lookback + current candle
    * - Moving Average
    * - Previous candle
    */
    const requiredLookback =
        Math.max(
            candleLookback,
            volumeLookback + 1,
            movingAveragePeriod,
            2
        );

    const marketData =
        getYahooData(
            symbol,
            timeframe,
            requiredLookback
        );

    if (marketData.status !== 'OK') {
        return {
            status: marketData.status,
            message: marketData.message
        };
    }

    const candles =
        marketData.candles;

    if (!candles || candles.length < 2) {
        return {
            status: 'INSUFFICIENT DATA',
            message:
                'Not enough lower-timeframe candles.'
        };
    }

    const latestCandle =
        candles[candles.length - 1];

    const previousCandle =
        candles[candles.length - 2];

    const currentPrice =
        Number(latestCandle.close);

    const previousClose =
        Number(previousCandle.close);

    if (
        !Number.isFinite(currentPrice) ||
        !Number.isFinite(previousClose)
    ) {
        return {
            status: 'DATA ERROR',
            message:
                'Invalid current or previous closing price.'
        };
    }

    /*
     * 20 MA
     */
    const movingAverage =
        calculateMovingAverage(
            candles,
            movingAveragePeriod
        );

    if (movingAverage.status !== 'OK') {
        return {
            status: movingAverage.status,
            message: movingAverage.message
        };
    }

    /*
     * VWAP
     */
    const vwap =
        calculateVWAP(candles);

    if (vwap.status !== 'OK') {
        return {
            status: vwap.status,
            message: vwap.message
        };
    }

    /*
     * Candle
     */
    const candle =
        analyzeCandle(latestCandle);

    if (candle.status !== 'OK') {
        return {
            status: candle.status,
            message: candle.message
        };
    }

    /*
     * Volume
     */
    const volume =
        analyzeVolume(
            candles,
            volumeLookback
        );

    if (volume.status !== 'OK') {
        return {
            status: volume.status,
            message: volume.message
        };
    }

    /*
     * Support / Resistance
     */
    const supportResistance =
        analyzeSupportResistance(candles);

    if (supportResistance.status !== 'OK') {
        return {
            status: supportResistance.status,
            message: supportResistance.message
        };
    }

    /*
     * Price vs VWAP
     */
    let priceVsVWAP = 'AT';

    const vwapTolerance =
        vwap.vwap * 0.0001;

    if (
        currentPrice >
        vwap.vwap + vwapTolerance
    ) {
        priceVsVWAP = 'ABOVE';
    } else if (
        currentPrice <
        vwap.vwap - vwapTolerance
    ) {
        priceVsVWAP = 'BELOW';
    }

    /*
     * VWAP reclaim.
     *
     * For the current V1 implementation,
     * use the current VWAP and previous VWAP
     * calculated from candles excluding the
     * latest candle.
     */
    const previousVWAP =
        calculateVWAP(
            candles.slice(0, -1)
        );

    let vwapReclaim = 'NO';

    if (previousVWAP.status === 'OK') {
        if (
            detectBullishReclaim(
                previousClose,
                currentPrice,
                previousVWAP.vwap,
                vwap.vwap
            )
        ) {
            vwapReclaim = 'YES';
        }
    }

    /*
     * 20 MA reclaim.
     */
    const previousMA =
        calculateMovingAverage(
            candles.slice(0, -1),
            movingAveragePeriod
        );

    let maReclaim = 'NO';

    if (previousMA.status === 'OK') {
        if (
            detectBullishReclaim(
                previousClose,
                currentPrice,
                previousMA.movingAverage,
                movingAverage.movingAverage
            )
        ) {
            maReclaim = 'YES';
        }
    }

    /*
     * Volume confirmation.
     *
     * For the lower timeframe:
     * HIGH volume = stronger confirmation.
     * NORMAL volume = neutral confirmation.
     * LOW volume = weak confirmation.
     */
    let volumeConfirmation = 'NORMAL';

    if (
        volume.volumeCondition === 'HIGH'
    ) {
        volumeConfirmation = 'HIGH';
    } else if (
        volume.volumeCondition === 'LOW'
    ) {
        volumeConfirmation = 'LOW';
    }

    const closePosition =
        determineClosePosition(
            latestCandle
        );

    const lowerTFContext =
        determineLowerTFContext(
            priceVsVWAP,
            vwapReclaim,
            movingAverage.pricePosition,
            maReclaim,
            candle.direction,
            candle.bodyType,
            volumeConfirmation
        );

    return {
        status: 'OK',

        symbol: symbol,

        timeframe: timeframe,

        timestamp:
            latestCandle.timestamp,

        currentPrice: currentPrice,

        vwap: vwap.vwap,

        priceVsVWAP: priceVsVWAP,

        vwapReclaim: vwapReclaim,

        movingAverage: {
            period:
                movingAverage.period,

            value:
                movingAverage.movingAverage,

            pricePosition:
                movingAverage.pricePosition,

            reclaim:
                maReclaim
        },

        candle: {
            direction:
                candle.direction,

            strength:
                candle.bodyType,

            closePosition:
                closePosition
        },

        volume: {
            currentVolume:
                volume.latestVolume,

            averageVolume:
                volume.averageVolume,

            volumeRatio:
                volume.volumeRatio,

            condition:
                volume.volumeCondition,

            confirmation:
                volumeConfirmation
        },

        support:
            findNearestSupport(
                supportResistance.supportLevels,
                currentPrice
            ),

        resistance:
            findNearestResistance(
                supportResistance.resistanceLevels,
                currentPrice
            ),

        context:
            lowerTFContext
    };
}

/**
 * Tests lower-timeframe analysis using
 * RELIANCE.NS.
 */
function runLowerTFAnalysisTest() {
    try {
        const settings =
            getSettings();

        const validation =
            validateSettings(settings);

        if (!validation.valid) {
            SpreadsheetApp.getUi().alert(
                'Settings validation failed:\n\n' +
                validation.errors.join('\n')
            );
            return;
        }

        const symbol =
            'RELIANCE.NS';

        const result =
            analyzeLowerTimeframe(
                symbol,
                settings
            );

        if (result.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'Lower TF analysis failed.\n\n' +
                'Status: ' +
                result.status +
                '\nMessage: ' +
                result.message
            );
            return;
        }

        Logger.log(
            'Lower Timeframe Analysis'
        );

        Logger.log(
            JSON.stringify(
                result,
                null,
                2
            )
        );

        SpreadsheetApp.getUi().alert(
            'Lower TF Analysis Successful\n\n' +

            'Symbol: ' +
            result.symbol +
            '\n' +

            'Timeframe: ' +
            result.timeframe +
            '\n\n' +

            'Current Price: ' +
            result.currentPrice.toFixed(2) +
            '\n' +

            'VWAP: ' +
            result.vwap.toFixed(2) +
            '\n' +

            'Price vs VWAP: ' +
            result.priceVsVWAP +
            '\n' +

            'VWAP Reclaim: ' +
            result.vwapReclaim +
            '\n\n' +

            '20 MA: ' +
            result.movingAverage.value.toFixed(2) +
            '\n' +

            'Price vs 20 MA: ' +
            result.movingAverage.pricePosition +
            '\n' +

            '20 MA Reclaim: ' +
            result.movingAverage.reclaim +
            '\n\n' +

            'Candle: ' +
            result.candle.direction +
            ' / ' +
            result.candle.strength +
            '\n' +

            'Close Position: ' +
            result.candle.closePosition +
            '\n\n' +

            'Current Volume: ' +
            result.volume.currentVolume +
            '\n' +

            'Average Volume: ' +
            result.volume.averageVolume.toFixed(2) +
            '\n' +

            'Volume Ratio: ' +
            result.volume.volumeRatio.toFixed(2) +
            'x\n' +

            'Volume Confirmation: ' +
            result.volume.confirmation +
            '\n\n' +

            'Lower TF Context: ' +
            result.context
        );

    } catch (error) {
        SpreadsheetApp.getUi().alert(
            'Lower TF analysis failed:\n\n' +
            error.message
        );
    }
}

