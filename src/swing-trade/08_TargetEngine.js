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
 * Calculates target information using the nearest
 * resistance level above the current price.
 */
function calculateTarget(
    currentPrice,
    nearestResistance,
    minimumTarget
) {
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
        return {
            status: 'DATA ERROR',
            message: 'Invalid current price.'
        };
    }

    if (
        !Number.isFinite(minimumTarget) ||
        minimumTarget < 0
    ) {
        return {
            status: 'DATA ERROR',
            message: 'Invalid minimum target.'
        };
    }

    if (!nearestResistance) {
        return {
            status: 'INSUFFICIENT DATA',
            message:
                'No resistance level is available above current price.'
        };
    }

    const resistancePrice =
        Number(nearestResistance.price);

    if (
        !Number.isFinite(resistancePrice) ||
        resistancePrice <= currentPrice
    ) {
        return {
            status: 'INSUFFICIENT DATA',
            message:
                'No valid resistance exists above current price.'
        };
    }

    /*
     * Potential upside to resistance.
     */
    const potentialReturn =
        (resistancePrice - currentPrice) /
        currentPrice;

    const potentialReturnPercent =
        potentialReturn * 100;

    /*
     * Minimum target is stored as a decimal.
     *
     * Example:
     * 0.015 = 1.5%
     */
    const minimumTargetPercent =
        minimumTarget * 100;

    const targetSatisfied =
        potentialReturn >= minimumTarget;

    return {
        status: 'OK',
        currentPrice: currentPrice,
        targetPrice: resistancePrice,
        potentialReturn: potentialReturn,
        potentialReturnPercent: potentialReturnPercent,
        minimumTarget: minimumTarget,
        minimumTargetPercent: minimumTargetPercent,
        targetSatisfied: targetSatisfied
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
            findNearestResistance(
                supportResistance.resistanceLevels,
                currentPrice
            );

        const target =
            calculateTarget(
                currentPrice,
                nearestResistance,
                minimumTarget
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
