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
    * 5A. CONDITION GROUP SCORES
    * --------------------------------------------------
    */

    const htfConditions = conditions.slice(0, 5);
    const ltfConditions = conditions.slice(5, 11);
    const targetCondition = conditions[11];

    const htfSatisfied = htfConditions.filter(
        condition => condition.passed
    ).length;

    const ltfSatisfied = ltfConditions.filter(
        condition => condition.passed
    ).length;

    const targetPassed = Boolean(
        targetCondition && targetCondition.passed
    );

    const htfTotal = htfConditions.length;
    const ltfTotal = ltfConditions.length;
    const targetTotal = targetCondition ? 1 : 0;

    const overallSatisfied =
        htfSatisfied +
        ltfSatisfied +
        (targetPassed ? 1 : 0);

    const overallTotal =
        htfTotal +
        ltfTotal +
        targetTotal;

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

    /*
    * --------------------------------------------------
    * 6. FINAL DECISION
    * --------------------------------------------------
    *
    * CONFIRM remains strict.
    * WAIT represents a meaningful but incomplete setup.
    * NO SETUP represents insufficient supporting evidence.
    */

    let primaryReason;
    let secondaryReason;
    let nextAction;

    /*
    * --------------------------------------------------
    * CONFIRM
    * --------------------------------------------------
    *
    * Do NOT weaken this gate.
    */
    if (
        bullishHigherTF &&
        bullishLowerTF &&
        targetSatisfied
    ) {
        finalDecision = 'CONFIRM';

        primaryReason =
            'Higher timeframe, lower timeframe and target conditions confirmed.';

        secondaryReason =
            `${overallSatisfied}/${overallTotal} conditions satisfied.`;

        nextAction =
            'POTENTIAL TRADE ELIGIBLE';
    }

    /*
    * --------------------------------------------------
    * WAIT
    * --------------------------------------------------
    *
    * A meaningful partial setup exists, but the
    * complete confirmation gate has not been met.
    */
    else if (
        targetSatisfied &&
        (
            htfSatisfied >= 3 ||
            ltfSatisfied >= 3
        )
    ) {
        finalDecision = 'WAIT';

        /*
        * WAIT represents a meaningful partial setup.
        *
        * Detailed Primary Reason and Secondary Reason
        * are constructed later from the actual failed
        * conditions.
        */
        nextAction =
            'WAIT FOR CONFIRMATION';
    }

    /*
    * --------------------------------------------------
    * NO SETUP
    * --------------------------------------------------
    */
    else {
        finalDecision = 'NO SETUP';

        if (!targetSatisfied) {
            primaryReason =
                'Insufficient target room.';

            secondaryReason =
                `${overallSatisfied}/${overallTotal} conditions satisfied.`;

            nextAction =
                'NO ACTION — TARGET ROOM INSUFFICIENT';
        }
        else {
            primaryReason =
                'Insufficient setup confirmation.';

            secondaryReason =
                `${overallSatisfied}/${overallTotal} conditions satisfied.`;

            nextAction =
                'NO ACTION — SETUP INCOMPLETE';
        }
    }

    /*
    * --------------------------------------------------
    * 8. PRIMARY REASON
    * --------------------------------------------------
    */

    primaryReason = '';

    if (!targetSatisfied) {

        primaryReason =
            'Insufficient target room.';

    } else if (
        !bullishHigherTF &&
        !bullishLowerTF
    ) {

        primaryReason =
            'Partial setup detected — ' +
            conditionsSatisfied +
            '/' +
            totalConditions +
            ' conditions satisfied. ' +
            'Higher and lower timeframe confirmation are both incomplete.';

    } else if (!bullishHigherTF) {

        primaryReason =
            'Partial setup detected — ' +
            conditionsSatisfied +
            '/' +
            totalConditions +
            ' conditions satisfied. ' +
            'Higher timeframe confirmation is incomplete.';

    } else if (!bullishLowerTF) {

        primaryReason =
            'Partial setup detected — ' +
            conditionsSatisfied +
            '/' +
            totalConditions +
            ' conditions satisfied. ' +
            'Lower timeframe confirmation is incomplete.';

    } else {

        primaryReason =
            'Required technical conditions are satisfied.';

    }

    /*
    * --------------------------------------------------
    * 9. SECONDARY REASON
    * --------------------------------------------------
    */

    secondaryReason =
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

    /*
    * Add failed-condition detail for WAIT decisions.
    *
    * This does not change the decision.
    * It only makes the reason more actionable.
    */
    if (
        finalDecision === 'WAIT' &&
        Array.isArray(failed) &&
        failed.length > 0
    ) {

        secondaryReason +=
            ' Waiting for confirmation: ' +
            failed.join(', ') +
            '.';
    }
    return {
        status: 'OK',

        /*
          * Overall condition summary
          */
        conditionsSatisfied,
        totalConditions,

        /*
          * Detailed condition breakdown
          */
        satisfiedConditions: satisfied,
        failedConditions: failed,

        /*
          * Group scores
          */
        htfSatisfied,
        htfTotal,

        ltfSatisfied,
        ltfTotal,

        targetSatisfied,

        overallSatisfied,
        overallTotal,

        /*
          * Final decision
          */
        finalDecision,
        primaryReason,
        secondaryReason,
        nextAction
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
                minimumTarget,
                higherTF.resistance
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

            'HTF Conditions: ' +
            decision.htfSatisfied +
            '/' +
            decision.htfTotal +
            '\n' +

            'LTF Conditions: ' +
            decision.ltfSatisfied +
            '/' +
            decision.ltfTotal +
            '\n' +

            'Target Requirement: ' +
            (
                decision.targetSatisfied
                    ? 'SATISFIED'
                    : 'NOT SATISFIED'
            ) +
            '\n\n' +

            'Overall Conditions: ' +
            decision.overallSatisfied +
            '/' +
            decision.overallTotal +
            '\n\n' +

            'Satisfied Conditions:\n' +
            (
                decision.satisfiedConditions &&
                    decision.satisfiedConditions.length > 0
                    ? decision.satisfiedConditions.join('\n')
                    : 'None'
            ) +
            '\n\n' +

            'Failed Conditions:\n' +
            (
                decision.failedConditions &&
                    decision.failedConditions.length > 0
                    ? decision.failedConditions.join('\n')
                    : 'None'
            ) +
            '\n\n' +

            'Volume Divergence: ' +
            volumeDivergence.divergence +
            '\n\n' +

            'Final Decision: ' +
            decision.finalDecision +
            '\n\n' +

            'Primary Reason:\n' +
            decision.primaryReason +
            '\n\n' +

            'Secondary Reason:\n' +
            decision.secondaryReason +
            '\n\n' +

            'Next Action:\n' +
            decision.nextAction
        );

    } catch (error) {
        SpreadsheetApp.getUi().alert(
            'Decision Engine test failed:\n\n' +
            error.message
        );
    }
}