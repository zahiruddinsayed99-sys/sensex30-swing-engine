/**
 * Phase C — Analysis Engine
 *
 * Combines the individual analysis modules:
 * - Candle analysis
 * - Volume analysis
 * - Support / Resistance
 * - Target analysis
 *
 * This module does NOT generate a trading signal.
 */


/**
 * Runs the complete analysis for a symbol.
 *
 * The returned object contains the individual
 * analysis results so that later modules can
 * make decisions without duplicating calculations.
 */
function analyzeSymbol(symbol, settings) {
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

    const minimumTarget =
        Number(
            settings['Minimum Target %']
        );

    /*
    * Retrieve enough candles for all
    * downstream analysis modules.
    *
    * Volume Analysis requires the current
    * candle plus the historical lookback.
    */
    const requiredLookback =
        Math.max(
            candleLookback,
            volumeLookback + 1
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

    if (!candles || candles.length === 0) {
        return {
            status: 'INSUFFICIENT DATA',
            message: 'No market candles available.'
        };
    }

    /*
     * Latest candle.
     */
    const latestCandle =
        candles[candles.length - 1];

    /*
     * Candle analysis.
     */
    const candleAnalysis =
        analyzeCandle(latestCandle);

    if (candleAnalysis.status !== 'OK') {
        return {
            status: candleAnalysis.status,
            message: candleAnalysis.message
        };
    }

    /*
     * Volume analysis.
     */
    const volumeAnalysis =
        analyzeVolume(
            candles,
            volumeLookback
        );

    if (volumeAnalysis.status !== 'OK') {
        return {
            status: volumeAnalysis.status,
            message: volumeAnalysis.message
        };
    }

    /*
     * Support / Resistance.
     */
    const supportResistance =
        analyzeSupportResistance(candles);

    if (supportResistance.status !== 'OK') {
        return {
            status: supportResistance.status,
            message: supportResistance.message
        };
    }

    const currentPrice =
        Number(latestCandle.close);

    const nearestSupport =
        findNearestSupport(
            supportResistance.supportLevels,
            currentPrice
        );

    const nearestResistance =
        findNearestResistance(
            supportResistance.resistanceLevels,
            currentPrice
        );

    /*
     * Target calculation.
     */
    const targetAnalysis =
        calculateTarget(
            currentPrice,
            nearestResistance,
            minimumTarget
        );

    if (
        targetAnalysis.status !== 'OK'
    ) {
        return {
            status: targetAnalysis.status,
            message: targetAnalysis.message
        };
    }

    /*
     * Return a structured analysis result.
     *
     * IMPORTANT:
     * No BUY / SELL / CONFIRM decision
     * is generated here.
     */
    return {
        status: 'OK',

        symbol: symbol,

        timeframe: timeframe,

        timestamp:
            latestCandle.timestamp,

        currentPrice: currentPrice,

        candle: candleAnalysis,

        volume: volumeAnalysis,

        supportResistance: {
            supportLevels:
                supportResistance.supportLevels,

            resistanceLevels:
                supportResistance.resistanceLevels,

            nearestSupport:
                nearestSupport,

            nearestResistance:
                nearestResistance
        },

        target: targetAnalysis
    };
}

/**
 * Tests the complete analysis pipeline.
 *
 * This is still an observation-only test.
 * It does not generate a trading signal.
 */
function runCombinedAnalysisTest() {
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

        /*
         * RELIANCE.NS remains the temporary
         * test symbol.
         *
         * Later this will come from the
         * Analysis sheet.
         */
        const symbol =
            'RELIANCE.NS';

        const result =
            analyzeSymbol(
                symbol,
                settings
            );

        if (result.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'Combined analysis failed.\n\n' +
                'Status: ' +
                result.status +
                '\nMessage: ' +
                result.message
            );
            return;
        }

        /*
         * Log complete structured result.
         */
        Logger.log(
            'Combined Analysis Result'
        );

        Logger.log(
            JSON.stringify(
                result,
                null,
                2
            )
        );

        const nearestSupport =
            result.supportResistance
                .nearestSupport;

        const nearestResistance =
            result.supportResistance
                .nearestResistance;

        SpreadsheetApp.getUi().alert(
            'Combined Analysis Successful\n\n' +

            'Symbol: ' +
            result.symbol +
            '\n' +

            'Timeframe: ' +
            result.timeframe +
            '\n\n' +

            'Current Price: ' +
            result.currentPrice.toFixed(2) +
            '\n\n' +

            'Candle: ' +
            result.candle.direction +
            ' / ' +
            result.candle.bodyType +
            '\n' +

            'Volume: ' +
            result.volume.volumeCondition +
            ' (' +
            result.volume.volumeRatio.toFixed(2) +
            'x)\n' +

            'Nearest Support: ' +
            (
                nearestSupport
                    ? nearestSupport.price.toFixed(2)
                    : 'None'
            ) +
            '\n' +

            'Nearest Resistance: ' +
            (
                nearestResistance
                    ? nearestResistance.price.toFixed(2)
                    : 'None'
            ) +
            '\n' +

            'Target: ' +
            result.target.targetPrice.toFixed(2) +
            '\n' +

            'Potential Return: ' +
            result.target.potentialReturnPercent
                .toFixed(2) +
            '%\n' +

            'Minimum Target: ' +
            result.target.minimumTargetPercent
                .toFixed(2) +
            '%\n' +

            'Target Requirement: ' +
            (
                result.target.targetSatisfied
                    ? 'SATISFIED'
                    : 'NOT SATISFIED'
            )
        );

    } catch (error) {
        SpreadsheetApp.getUi().alert(
            'Combined analysis failed:\n\n' +
            error.message
        );
    }
}