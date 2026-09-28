/**
 * Phase C — Final Decision Engine
 *
 * Produces only:
 * CONFIRM
 * WAIT
 * NO SETUP
 *
 * This module does not place trades.
 * It does not create BUY/SELL recommendations.
 *
 * Decision logic is intentionally transparent.
 */


/**
 * Evaluates the final decision using the
 * Higher TF, Lower TF and supporting evidence.
 */
function evaluateDecision(
    higherTF,
    lowerTF,
    volumeDivergence,
    targetAnalysis
) {
    const conditions = [];
    const satisfied = [];
    const failed = [];

    /*
     * --------------------------------------------------
     * 1. DATA VALIDATION
     * --------------------------------------------------
     */

    if (!higherTF || higherTF.status !== 'OK') {
        return {
            status: 'DATA ERROR',
            finalDecision: null,
            message: 'Higher timeframe analysis unavailable.'
        };
    }

    if (!lowerTF || lowerTF.status !== 'OK') {
        return {
            status: 'DATA ERROR',
            finalDecision: null,
            message: 'Lower timeframe analysis unavailable.'
        };
    }

    if (
        !volumeDivergence ||
        volumeDivergence.status !== 'OK'
    ) {
        return {
            status: 'DATA ERROR',
            finalDecision: null,
            message:
                'Volume divergence analysis unavailable.'
        };
    }

    if (
        !targetAnalysis ||
        targetAnalysis.status !== 'OK'
    ) {
        return {
            status: 'DATA ERROR',
            finalDecision: null,
            message:
                'Target analysis unavailable.'
        };
    }

    /*
     * --------------------------------------------------
     * 2. HIGHER-TIMEFRAME CONDITIONS
     * --------------------------------------------------
     */

    const higherTrend =
        higherTF.trend === 'UPTREND';

    conditions.push({
        name: 'Higher TF Trend',
        passed: higherTrend
    });

    /*
     * Higher timeframe structure.
     */
    const higherStructure =
        higherTF.marketStructure ===
        'HIGHER_HIGHS_HIGHER_LOWS';

    conditions.push({
        name: 'Higher TF Structure',
        passed: higherStructure
    });

    /*
     * Price above higher-TF MA.
     */
    const higherMA =
        higherTF.movingAverage.pricePosition ===
        'ABOVE';

    conditions.push({
        name: 'Higher TF Price Above 20 MA',
        passed: higherMA
    });

    /*
     * Higher-TF candle.
     */
    const higherCandle =
        higherTF.candle.direction ===
        'BULLISH';

    conditions.push({
        name: 'Higher TF Bullish Candle',
        passed: higherCandle
    });

    /*
     * Higher-TF volume.
     */
    const higherVolume =
        higherTF.volume.volumeCondition ===
        'HIGH';

    conditions.push({
        name: 'Higher TF High Volume',
        passed: higherVolume
    });

    /*
     * --------------------------------------------------
     * 3. LOWER-TIMEFRAME CONDITIONS
     * --------------------------------------------------
     */

    const lowerVWAP =
        lowerTF.priceVsVWAP === 'ABOVE';

    conditions.push({
        name: 'Lower TF Price Above VWAP',
        passed: lowerVWAP
    });

    const vwapReclaim =
        lowerTF.vwapReclaim === 'YES';

    conditions.push({
        name: 'VWAP Reclaim',
        passed: vwapReclaim
    });

    const lowerMA =
        lowerTF.movingAverage.pricePosition ===
        'ABOVE';

    conditions.push({
        name: 'Lower TF Price Above 20 MA',
        passed: lowerMA
    });

    const maReclaim =
        lowerTF.movingAverage.reclaim === 'YES';

    conditions.push({
        name: '20 MA Reclaim',
        passed: maReclaim
    });

    const lowerCandle =
        lowerTF.candle.direction ===
        'BULLISH' &&
        lowerTF.candle.strength ===
        'STRONG_BODY';

    conditions.push({
        name: 'Lower TF Bullish Strong Candle',
        passed: lowerCandle
    });

    const lowerVolume =
        lowerTF.volume.confirmation ===
        'HIGH';

    conditions.push({
        name: 'Lower TF Volume Confirmation',
        passed: lowerVolume
    });

    /*
     * --------------------------------------------------
     * 4. TARGET CONDITION
     * --------------------------------------------------
     *
     * Target room is a mandatory requirement.
     */
    const targetSatisfied =
        targetAnalysis.targetSatisfied === true;

    conditions.push({
        name: 'Minimum Target Requirement',
        passed: targetSatisfied
    });

    /*
     * --------------------------------------------------
     * 5. RECORD SATISFIED / FAILED CONDITIONS
     * --------------------------------------------------
     */

    for (const condition of conditions) {
        if (condition.passed) {
            satisfied.push(condition.name);
        } else {
            failed.push(condition.name);
        }
    }

    const totalConditions =
        conditions.length;

    const conditionsSatisfied =
        satisfied.length;

    /*
     * --------------------------------------------------
     * 6. SUPPORTING EVIDENCE
     * --------------------------------------------------
     *
     * Volume divergence is NOT a standalone trigger.
     */
    const divergence =
        volumeDivergence.divergence;

    /*
     * --------------------------------------------------
     * 7. DECISION
     * --------------------------------------------------
     *
     * CONFIRM requires:
     *
     * - bullish higher-TF context
     * - bullish lower-TF confirmation
     * - minimum target satisfied
     *
     * WAIT is used when the setup is developing
     * but the main structure is not invalid.
     *
     * NO SETUP is used when the broader technical
     * requirements are clearly absent.
     */

    const bullishHigherTF =
        higherTrend &&
        higherStructure &&
        higherMA;

    const bullishLowerTF =
        lowerVWAP &&
        lowerMA &&
        lowerCandle &&
        lowerVolume;

    let finalDecision;

    if (
        bullishHigherTF &&
        bullishLowerTF &&
        targetSatisfied
    ) {
        finalDecision = 'CONFIRM';
    } else if (
        targetSatisfied &&
        (
            higherTF.context === 'POSITIVE' ||
            lowerTF.context === 'POSITIVE' ||
            lowerCandle ||
            lowerVolume
        )
    ) {
        finalDecision = 'WAIT';
    } else {
        finalDecision = 'NO SETUP';
    }

    /*
     * --------------------------------------------------
     * 8. PRIMARY REASON
     * --------------------------------------------------
     */

    let primaryReason = '';

    if (!targetSatisfied) {
        primaryReason =
            'Insufficient target room.';
    } else if (
        !bullishHigherTF &&
        !bullishLowerTF
    ) {
        primaryReason =
            'Higher and lower timeframe confirmation are insufficient.';
    } else if (!bullishHigherTF) {
        primaryReason =
            'Higher timeframe confirmation is insufficient.';
    } else if (!bullishLowerTF) {
        primaryReason =
            'Lower timeframe confirmation is insufficient.';
    } else {
        primaryReason =
            'Required technical conditions are satisfied.';
    }

    /*
     * --------------------------------------------------
     * 9. SECONDARY REASON
     * --------------------------------------------------
     */

    let secondaryReason =
        'No additional supporting evidence.';

    if (divergence === 'BULLISH') {
        secondaryReason =
            'Bullish volume divergence provides supporting evidence.';
    } else if (divergence === 'BEARISH') {
        secondaryReason =
            'Bearish volume divergence weakens the setup.';
    } else if (divergence === 'NONE') {
        secondaryReason =
            'No volume divergence detected.';
    }

    return {
        status: 'OK',

        finalDecision: finalDecision,

        conditionsSatisfied:
            conditionsSatisfied,

        totalConditions:
            totalConditions,

        primaryReason:
            primaryReason,

        secondaryReason:
            secondaryReason,

        satisfiedConditions:
            satisfied,

        failedConditions:
            failed,

        volumeDivergence:
            divergence,

        targetRequirement:
            targetAnalysis.targetSatisfied
                ? 'SATISFIED' : 'NOT SATISFIED',

        targetPrice:
            targetAnalysis.targetPrice,

        potentialReturn:
            targetAnalysis.potentialReturn
    };
}

/**
 * Tests the complete Decision Engine
 * using RELIANCE.NS.
 */
function runDecisionEngineTest() {
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

        /*
         * Higher TF
         */
        const higherTF =
            analyzeHigherTimeframe(
                symbol,
                settings
            );

        if (higherTF.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'Decision Engine failed.\n\n' +
                'Higher TF:\n' +
                higherTF.status +
                '\n' +
                higherTF.message
            );
            return;
        }

        /*
         * Lower TF
         */
        const lowerTF =
            analyzeLowerTimeframe(
                symbol,
                settings
            );

        if (lowerTF.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'Decision Engine failed.\n\n' +
                'Lower TF:\n' +
                lowerTF.status +
                '\n' +
                lowerTF.message
            );
            return;
        }

        const candleLookback =
            Number(
                settings['Candle Lookback']
            );

        const volumeLookback =
            Number(
                settings['Volume Lookback']
            );

        const requiredLookback =
            Math.max(
                candleLookback,
                volumeLookback + 1
            );

        const lowerMarketData =
            getYahooData(
                symbol,
                settings['Lower Timeframe'],
                requiredLookback
            );

        if (
            lowerMarketData.status !== 'OK'
        ) {
            SpreadsheetApp.getUi().alert(
                'Decision Engine failed.\n\n' +
                lowerMarketData.status +
                '\n' +
                lowerMarketData.message
            );
            return;
        }

        const volumeDivergence =
            analyzeVolumeDivergence(
                lowerMarketData.candles,
                Number(
                    settings['Volume Lookback']
                )
            );

        if (
            volumeDivergence.status !== 'OK'
        ) {
            SpreadsheetApp.getUi().alert(
                'Decision Engine failed.\n\n' +
                volumeDivergence.status +
                '\n' +
                volumeDivergence.message
            );
            return;
        }

        /*
        * Target calculation
        */
        const minimumTarget =
            Number(
                settings['Minimum Target %']
            );

        if (
            !Number.isFinite(minimumTarget) ||
            minimumTarget <= 0
        ) {
            SpreadsheetApp.getUi().alert(
                'Decision Engine failed.\n\n' +
                'DATA ERROR\n' +
                'Invalid minimum target.'
            );
            return;
        }

        const targetAnalysis =
            calculateTarget(
                lowerTF.currentPrice,
                lowerTF.resistance,
                minimumTarget
            );

        if (
            targetAnalysis.status !== 'OK'
        ) {
            SpreadsheetApp.getUi().alert(
                'Decision Engine failed.\n\n' +
                targetAnalysis.status +
                '\n' +
                targetAnalysis.message
            );
            return;
        }

        /*
         * Final decision
         */
        const decision =
            evaluateDecision(
                higherTF,
                lowerTF,
                volumeDivergence,
                targetAnalysis
            );

        if (decision.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'Decision Engine failed.\n\n' +
                decision.status +
                '\n' +
                decision.message
            );
            return;
        }

        Logger.log(
            JSON.stringify(
                decision,
                null,
                2
            )
        );

        SpreadsheetApp.getUi().alert(
            'Decision Engine Test Successful\n\n' +

            'Symbol: ' +
            symbol +
            '\n\n' +

            'Final Decision: ' +
            decision.finalDecision +
            '\n\n' +

            'Conditions Satisfied: ' +
            decision.conditionsSatisfied +
            '/' +
            decision.totalConditions +
            '\n\n' +

            'Primary Reason:\n' +
            decision.primaryReason +
            '\n\n' +

            'Secondary Reason:\n' +
            decision.secondaryReason +
            '\n\n' +

            'Volume Divergence: ' +
            decision.volumeDivergence +
            '\n' +

            'Target Requirement: ' +
            decision.targetRequirement
        );

    } catch (error) {
        SpreadsheetApp.getUi().alert(
            'Decision Engine test failed:\n\n' +
            error.message
        );
    }
}
