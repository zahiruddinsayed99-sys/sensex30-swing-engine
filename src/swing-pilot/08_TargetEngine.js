/**
 * Phase C — Target Engine
 *
 * Calculates potential target and checks whether
 * the available upside satisfies the configured
 * minimum target.
 *
 * No trading signal is generated here.
 */


/**
 * ============================================================
 * Phase C — Target Engine
 * ============================================================
 *
 * Calculates potential target and checks whether the
 * available upside satisfies the configured minimum target.
 *
 * Target selection logic:
 *
 * 1. Prefer nearest LTF resistance when it provides
 *    sufficient target room.
 *
 * 2. If LTF resistance is too close, evaluate the
 *    Higher Timeframe resistance as the next structural
 *    target.
 *
 * 3. If neither resistance provides sufficient room,
 *    targetSatisfied = false.
 *
 * No trading signal is generated here.
 */


/**
 * Calculates target information.
 *
 * Target selection logic:
 *
 * 1. Search LTF resistance levels for the first meaningful
 *    resistance that provides the configured minimum target.
 *
 * 2. If LTF cannot provide enough target room, search HTF
 *    resistance levels.
 *
 * 3. If no resistance provides enough room, return the
 *    nearest available resistance with targetSatisfied=false.
 *
 * Backward compatible:
 *
 * calculateTarget(
 *     currentPrice,
 *     nearestResistance,
 *     minimumTarget
 * )
 *
 * Enhanced:
 *
 * calculateTarget(
 *     currentPrice,
 *     ltfResistance,
 *     minimumTarget,
 *     htfResistance
 * )
 *
 * The resistance arguments may be either:
 * - a single resistance object
 * - an array of resistance objects
 */
function calculateTarget(
    currentPrice,
    nearestResistance,
    minimumTarget,
    higherTFResistance
) {

    /*
     * --------------------------------------------------------
     * 1. Validate current price
     * --------------------------------------------------------
     */

    if (
        !Number.isFinite(currentPrice) ||
        currentPrice <= 0
    ) {
        return {
            status: 'DATA ERROR',
            message: 'Invalid current price.'
        };
    }


    /*
     * --------------------------------------------------------
     * 2. Validate minimum target
     * --------------------------------------------------------
     */

    if (
        !Number.isFinite(minimumTarget) ||
        minimumTarget < 0
    ) {
        return {
            status: 'DATA ERROR',
            message: 'Invalid minimum target.'
        };
    }


    /*
     * --------------------------------------------------------
     * 3. Minimum target percentage
     * --------------------------------------------------------
     */

    const minimumTargetPercent =
        minimumTarget * 100;


    /*
     * --------------------------------------------------------
     * 4. Normalize resistance input
     * --------------------------------------------------------
     */

    function normalizeResistanceLevels(
        resistance
    ) {

        if (!resistance) {
            return [];
        }

        if (Array.isArray(resistance)) {
            return resistance;
        }

        return [resistance];
    }


    /*
     * --------------------------------------------------------
     * 5. Evaluate a resistance level
     * --------------------------------------------------------
     */

    function evaluateResistance(
        resistance
    ) {

        if (!resistance) {
            return null;
        }

        /*
         * Support/Resistance engine normally returns
         * objects containing a price property.
         *
         * Also tolerate a raw numeric resistance value.
         */

        const resistancePrice =
            typeof resistance === 'number'
                ? resistance
                : Number(resistance.price);

        if (
            !Number.isFinite(resistancePrice) ||
            resistancePrice <= currentPrice
        ) {
            return null;
        }

        const potentialReturn =
            (
                resistancePrice -
                currentPrice
            ) /
            currentPrice;

        const potentialReturnPercent =
            potentialReturn * 100;

        return {
            price: resistancePrice,

            potentialReturn:
                potentialReturn,

            potentialReturnPercent:
                potentialReturnPercent,

            targetSatisfied:
                potentialReturn >= minimumTarget
        };
    }


    /*
     * --------------------------------------------------------
     * 6. Find first resistance that satisfies target
     * --------------------------------------------------------
     */

    function findSufficientResistance(
        resistanceLevels
    ) {

        const candidates =
            resistanceLevels
                .map(evaluateResistance)
                .filter(
                    candidate =>
                        candidate !== null
                )
                .sort(
                    (a, b) =>
                        a.price - b.price
                );

        /*
         * First resistance above current price that
         * provides enough target room.
         */
        const sufficient =
            candidates.find(
                candidate =>
                    candidate.targetSatisfied
            );

        return {
            candidates:
                candidates,

            sufficient:
                sufficient || null
        };
    }


    /*
     * --------------------------------------------------------
     * 7. Normalize LTF resistance
     * --------------------------------------------------------
     */

    const ltfLevels =
        normalizeResistanceLevels(
            nearestResistance
        );


    /*
     * --------------------------------------------------------
     * 8. Search LTF resistance
     * --------------------------------------------------------
     */

    const ltfResult =
        findSufficientResistance(
            ltfLevels
        );


    /*
     * --------------------------------------------------------
     * 9. Prefer LTF resistance when adequate
     * --------------------------------------------------------
     */

    if (
        ltfResult.sufficient
    ) {

        const candidate =
            ltfResult.sufficient;

        return {

            status: 'OK',

            currentPrice:
                currentPrice,

            targetPrice:
                candidate.price,

            potentialReturn:
                candidate.potentialReturn,

            potentialReturnPercent:
                candidate.potentialReturnPercent,

            minimumTarget:
                minimumTarget,

            minimumTargetPercent:
                minimumTargetPercent,

            targetSatisfied:
                true,

            targetSource:
                'LTF'
        };
    }


    /*
     * --------------------------------------------------------
     * 10. Search HTF resistance
     * --------------------------------------------------------
     */

    const htfLevels =
        normalizeResistanceLevels(
            higherTFResistance
        );

    const htfResult =
        findSufficientResistance(
            htfLevels
        );


    /*
     * --------------------------------------------------------
     * 11. Use HTF resistance when adequate
     * --------------------------------------------------------
     */

    if (
        htfResult.sufficient
    ) {

        const candidate =
            htfResult.sufficient;

        return {

            status: 'OK',

            currentPrice:
                currentPrice,

            targetPrice:
                candidate.price,

            potentialReturn:
                candidate.potentialReturn,

            potentialReturnPercent:
                candidate.potentialReturnPercent,

            minimumTarget:
                minimumTarget,

            minimumTargetPercent:
                minimumTargetPercent,

            targetSatisfied:
                true,

            targetSource:
                'HTF'
        };
    }


    /*
     * --------------------------------------------------------
     * 12. No sufficient resistance
     * --------------------------------------------------------
     *
     * Preserve useful diagnostic information.
     *
     * Prefer the nearest valid LTF resistance.
     * If none exists, use nearest valid HTF resistance.
     */

    const nearestLTF =
        ltfResult.candidates.length > 0
            ? ltfResult.candidates[0]
            : null;

    const nearestHTF =
        htfResult.candidates.length > 0
            ? htfResult.candidates[0]
            : null;

    const fallback =
        nearestLTF ||
        nearestHTF;


    if (fallback) {

        return {

            status: 'OK',

            currentPrice:
                currentPrice,

            targetPrice:
                fallback.price,

            potentialReturn:
                fallback.potentialReturn,

            potentialReturnPercent:
                fallback.potentialReturnPercent,

            minimumTarget:
                minimumTarget,

            minimumTargetPercent:
                minimumTargetPercent,

            targetSatisfied:
                false,

            targetSource:
                nearestLTF
                    ? 'LTF'
                    : 'HTF'
        };
    }


    /*
     * --------------------------------------------------------
     * 13. No usable resistance
     * --------------------------------------------------------
     */

    return {

        status: 'INSUFFICIENT DATA',

        message:
            'No valid resistance exists above current price.'
    };
}

/**
 * Tests target calculation using the current
 * RELIANCE.NS market data.
 */
function runTargetTest() {
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

        const minimumTarget =
            Number(
                settings['Minimum Target %']
            );

        const result =
            getYahooData(
                symbol,
                timeframe,
                candleLookback
            );

        if (result.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'Target test failed.\n\n' +
                'Status: ' +
                result.status +
                '\nMessage: ' +
                result.message
            );
            return;
        }

        const candles = result.candles;

        const supportResistance =
            analyzeSupportResistance(candles);

        if (supportResistance.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'Support/Resistance analysis failed.\n\n' +
                supportResistance.message
            );
            return;
        }

        const latestCandle =
            candles[candles.length - 1];

        const currentPrice =
            Number(latestCandle.close);

        const nearestResistance =
            supportResistance.resistanceLevels;

        /*
        * Higher TF data
        */
        const higherTimeframe =
            String(
                settings['Higher Timeframe']
            ).trim();

        const higherResult =
            getYahooData(
                symbol,
                higherTimeframe,
                candleLookback
            );

        if (
            higherResult.status !== 'OK'
        ) {
            SpreadsheetApp.getUi().alert(
                'Target test failed.\n\n' +
                'Higher TF Status: ' +
                higherResult.status +
                '\nMessage: ' +
                higherResult.message
            );
            return;
        }

        const higherCandles =
            higherResult.candles;

        const higherSupportResistance =
            analyzeSupportResistance(
                higherCandles
            );

        if (
            higherSupportResistance.status !== 'OK'
        ) {
            SpreadsheetApp.getUi().alert(
                'Higher TF support/resistance analysis failed.\n\n' +
                higherSupportResistance.message
            );
            return;
        }

        const higherLatestCandle =
            higherCandles[
            higherCandles.length - 1
            ];

        const higherCurrentPrice =
            Number(
                higherLatestCandle.close
            );

        const higherResistance =
            higherSupportResistance.resistanceLevels;


        /*
        * Target calculation
        */
        const target =
            calculateTarget(
                currentPrice,
                nearestResistance,
                minimumTarget,
                higherResistance
            );

        if (target.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'Target calculation failed.\n\n' +
                'Status: ' +
                target.status +
                '\nMessage: ' +
                target.message
            );
            return;
        }

        Logger.log(
            'Target Engine Test'
        );

        Logger.log(
            JSON.stringify(target)
        );

        SpreadsheetApp.getUi().alert(
            'Target Calculation Successful\n\n' +
            'Symbol: ' + symbol + '\n' +
            'Timeframe: ' + timeframe + '\n\n' +
            'Current Price: ' +
            target.currentPrice.toFixed(2) +
            '\n' +
            'Target Price: ' +
            target.targetPrice.toFixed(2) +
            '\n' +
            'Potential Return: ' +
            target.potentialReturnPercent.toFixed(2) +
            '%\n' +
            'Minimum Target: ' +
            target.minimumTargetPercent.toFixed(2) +
            '%\n\n' +
            'Target Requirement: ' +
            (
                target.targetSatisfied
                    ? 'SATISFIED'
                    : 'NOT SATISFIED'
            )
        );

    } catch (error) {
        SpreadsheetApp.getUi().alert(
            'Target test failed:\n\n' +
            error.message
        );
    }
}
