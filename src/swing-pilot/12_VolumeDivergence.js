/**
 * Phase C — Volume Divergence
 *
 * Identifies basic price/volume divergence.
 *
 * This is an observation only.
 * It does not generate CONFIRM, WAIT, or NO SETUP.
 */


/**
 * Analyzes basic price/volume divergence.
 *
 * Logic:
 *
 * Bullish divergence:
 * - Price makes a lower low
 * - Volume does not make a corresponding higher level
 *
 * Bearish divergence:
 * - Price makes a higher high
 * - Volume does not make a corresponding higher level
 *
 * Otherwise:
 * - NONE
 */
function analyzeVolumeDivergence(candles, lookback) {
    if (!candles || candles.length === 0) {
        return {
            status: 'INSUFFICIENT DATA',
            message: 'No candles available.'
        };
    }

    if (
        !Number.isInteger(lookback) ||
        lookback <= 1
    ) {
        return {
            status: 'DATA ERROR',
            message: 'Invalid divergence lookback.'
        };
    }

    if (candles.length < lookback + 1) {
        return {
            status: 'INSUFFICIENT DATA',
            message:
                'Not enough candles for volume divergence analysis. ' +
                'Required: ' +
                (lookback + 1) +
                ', received: ' +
                candles.length
        };
    }

    const latest =
        candles[candles.length - 1];

    const previousWindow =
        candles.slice(
            candles.length - lookback - 1,
            candles.length - 1
        );

    const latestClose =
        Number(latest.close);

    const latestVolume =
        Number(latest.volume);

    if (
        !Number.isFinite(latestClose) ||
        !Number.isFinite(latestVolume)
    ) {
        return {
            status: 'DATA ERROR',
            message:
                'Latest price or volume is invalid.'
        };
    }

    /*
     * Find the previous highest and lowest
     * closing prices.
     */
    let previousHighestClose = -Infinity;
    let previousLowestClose = Infinity;

    let volumeAtPreviousHigh = null;
    let volumeAtPreviousLow = null;

    for (const candle of previousWindow) {
        const close = Number(candle.close);
        const volume = Number(candle.volume);

        if (
            !Number.isFinite(close) ||
            !Number.isFinite(volume)
        ) {
            continue;
        }

        if (close > previousHighestClose) {
            previousHighestClose = close;
            volumeAtPreviousHigh = volume;
        }

        if (close < previousLowestClose) {
            previousLowestClose = close;
            volumeAtPreviousLow = volume;
        }
    }

    if (
        !Number.isFinite(previousHighestClose) ||
        !Number.isFinite(previousLowestClose) ||
        volumeAtPreviousHigh === null ||
        volumeAtPreviousLow === null
    ) {
        return {
            status: 'INSUFFICIENT DATA',
            message:
                'Unable to establish previous price/volume reference points.'
        };
    }

    let divergence = 'NONE';
    let description =
        'No basic price/volume divergence detected.';

    /*
     * Bullish divergence:
     *
     * Current close is below the previous low,
     * while current volume is below the volume
     * recorded at that previous low.
     */
    if (
        latestClose < previousLowestClose &&
        latestVolume < volumeAtPreviousLow
    ) {
        divergence = 'BULLISH';

        description =
            'Price made a lower low while volume ' +
            'was lower than the previous low-volume reference.';
    }

    /*
     * Bearish divergence:
     *
     * Current close is above the previous high,
     * while current volume is below the volume
     * recorded at that previous high.
     */
    else if (
        latestClose > previousHighestClose &&
        latestVolume < volumeAtPreviousHigh
    ) {
        divergence = 'BEARISH';

        description =
            'Price made a higher high while volume ' +
            'was lower than the previous high-volume reference.';
    }

    return {
        status: 'OK',

        divergence: divergence,

        description: description,

        currentClose: latestClose,

        currentVolume: latestVolume,

        previousHighestClose:
            previousHighestClose,

        previousLowestClose:
            previousLowestClose,

        volumeAtPreviousHigh:
            volumeAtPreviousHigh,

        volumeAtPreviousLow:
            volumeAtPreviousLow,

        lookback: lookback
    };
}

/**
 * Tests volume divergence using RELIANCE.NS.
 */
function runVolumeDivergenceTest() {
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

        const volumeLookback =
            Number(
                settings['Volume Lookback']
            );

        const result =
            getYahooData(
                symbol,
                timeframe,
                Number(
                    settings['Candle Lookback']
                )
            );

        if (result.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'Volume divergence test failed.\n\n' +
                'Status: ' +
                result.status +
                '\nMessage: ' +
                result.message
            );
            return;
        }

        const analysis =
            analyzeVolumeDivergence(
                result.candles,
                volumeLookback
            );

        if (analysis.status !== 'OK') {
            SpreadsheetApp.getUi().alert(
                'Volume divergence analysis failed.\n\n' +
                'Status: ' +
                analysis.status +
                '\nMessage: ' +
                analysis.message
            );
            return;
        }

        Logger.log(
            'Volume Divergence Test'
        );

        Logger.log(
            JSON.stringify(
                analysis,
                null,
                2
            )
        );

        SpreadsheetApp.getUi().alert(
            'Volume Divergence Test Successful\n\n' +
            'Symbol: ' + symbol + '\n' +
            'Timeframe: ' + timeframe + '\n\n' +
            'Current Close: ' +
            analysis.currentClose.toFixed(2) +
            '\n' +
            'Current Volume: ' +
            analysis.currentVolume +
            '\n\n' +
            'Previous Highest Close: ' +
            analysis.previousHighestClose.toFixed(2) +
            '\n' +
            'Previous Lowest Close: ' +
            analysis.previousLowestClose.toFixed(2) +
            '\n\n' +
            'Divergence: ' +
            analysis.divergence +
            '\n\n' +
            analysis.description
        );

    } catch (error) {
        SpreadsheetApp.getUi().alert(
            'Volume divergence test failed:\n\n' +
            error.message
        );
    }
}