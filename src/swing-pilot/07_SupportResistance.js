/**
 * Phase C — Support / Resistance
 *
 * Identifies basic recent support and resistance
 * levels from OHLCV candle data.
 *
 * No trading signal is generated here.
 */


/**
 * Finds basic support and resistance levels.
 *
 * A support candidate is a local low.
 * A resistance candidate is a local high.
 */
function analyzeSupportResistance(candles) {
    if (!candles || candles.length < 5) {
        return {
            status: 'INSUFFICIENT DATA',
            message:
                'At least 5 candles are required.'
        };
    }

    const supportLevels = [];
    const resistanceLevels = [];

    /*
     * Compare each candle with its immediate
     * neighbors.
     *
     * We deliberately keep this simple for V1.
     */
    for (let i = 1; i < candles.length - 1; i++) {
        const previous = candles[i - 1];
        const current = candles[i];
        const next = candles[i + 1];

        const currentLow = Number(current.low);
        const currentHigh = Number(current.high);

        const previousLow = Number(previous.low);
        const nextLow = Number(next.low);

        const previousHigh = Number(previous.high);
        const nextHigh = Number(next.high);

        if (
            !Number.isFinite(currentLow) ||
            !Number.isFinite(currentHigh)
        ) {
            continue;
        }

        /*
         * Local low = potential support.
         */
        if (
            currentLow <= previousLow &&
            currentLow <= nextLow
        ) {
            supportLevels.push({
                price: currentLow,
                timestamp: current.timestamp
            });
        }

        /*
         * Local high = potential resistance.
         */
        if (
            currentHigh >= previousHigh &&
            currentHigh >= nextHigh
        ) {
            resistanceLevels.push({
                price: currentHigh,
                timestamp: current.timestamp
            });
        }
    }

    if (
        supportLevels.length === 0 &&
        resistanceLevels.length === 0
    ) {
        return {
            status: 'INSUFFICIENT DATA',
            message:
                'No local support or resistance candidates found.',
            supportLevels: [],
            resistanceLevels: []
        };
    }

    return {
        status: 'OK',
        supportLevels: supportLevels,
        resistanceLevels: resistanceLevels
    };
}


/**
 * Returns the nearest support below the current price.
 */
function findNearestSupport(
    supportLevels,
    currentPrice
) {
    const validSupports =
        supportLevels
            .filter(level =>
                level.price <= currentPrice
            )
            .sort((a, b) =>
                b.price - a.price
            );

    return validSupports.length > 0
        ? validSupports[0]
        : null;
}


/**
 * Returns the nearest resistance above
 * the current price.
 */
function findNearestResistance(
    resistanceLevels,
    currentPrice
) {
    const validResistances =
        resistanceLevels
            .filter(level =>
                level.price >= currentPrice
            )
            .sort((a, b) =>
                a.price - b.price
            );

    return validResistances.length > 0
        ? validResistances[0]
        : null;
}

/**
 * Tests basic support/resistance analysis
 * using RELIANCE.NS.
 */
function runSupportResistanceTest() {
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
                'Support/Resistance test failed.\n\n' +
                'Status: ' +
                result.status +
                '\nMessage: ' +
                result.message
            );
            return;
        }

        const candles = result.candles;

        const analysis =
            analyzeSupportResistance(candles);

        if (analysis.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'Support/Resistance analysis failed.\n\n' +
                'Status: ' +
                analysis.status +
                '\nMessage: ' +
                analysis.message
            );
            return;
        }

        const latestCandle =
            candles[candles.length - 1];

        const currentPrice =
            Number(latestCandle.close);

        const nearestSupport =
            findNearestSupport(
                analysis.supportLevels,
                currentPrice
            );

        const nearestResistance =
            findNearestResistance(
                analysis.resistanceLevels,
                currentPrice
            );

        Logger.log(
            'Support/Resistance Test'
        );

        Logger.log(
            'Support levels: ' +
            JSON.stringify(
                analysis.supportLevels
            )
        );

        Logger.log(
            'Resistance levels: ' +
            JSON.stringify(
                analysis.resistanceLevels
            )
        );

        let message =
            'Support / Resistance Test Successful\n\n' +
            'Symbol: ' + symbol + '\n' +
            'Timeframe: ' + timeframe + '\n' +
            'Current Close: ' + currentPrice + '\n\n' +
            'Support Candidates: ' +
            analysis.supportLevels.length + '\n' +
            'Resistance Candidates: ' +
            analysis.resistanceLevels.length +
            '\n\n';

        if (nearestSupport) {
            message +=
                'Nearest Support: ' +
                nearestSupport.price +
                '\n';
        } else {
            message +=
                'Nearest Support: None\n';
        }

        if (nearestResistance) {
            message +=
                'Nearest Resistance: ' +
                nearestResistance.price +
                '\n';
        } else {
            message +=
                'Nearest Resistance: None\n';
        }

        SpreadsheetApp.getUi().alert(message);

    } catch (error) {
        SpreadsheetApp.getUi().alert(
            'Support/Resistance test failed:\n\n' +
            error.message
        );
    }
}

