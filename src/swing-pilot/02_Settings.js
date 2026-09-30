/**
 * Reads configuration from the existing Settings sheet.
 */
function getSettings() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName('Settings');

    if (!sheet) {
        throw new Error('Settings sheet was not found.');
    }

    const values = sheet.getDataRange().getValues();
    const settings = {};

    values.forEach((row) => {
        if (row.length >= 2 && row[0] !== '') {
            const key = String(row[0]).trim();
            settings[key] = row[1];
        }
    });

    return settings;
}


/**
 * Validates the system settings.
 */
function validateSettings(settings) {
    const errors = [];

    const higherTimeframe = String(
        settings['Higher Timeframe'] || ''
    ).trim();

    const lowerTimeframe = String(
        settings['Lower Timeframe'] || ''
    ).trim();

    const candleLookback = Number(
        settings['Candle Lookback']
    );

    const volumeLookback = Number(
        settings['Volume Lookback']
    );

    const movingAverage = Number(
        settings['Moving Average Period']
    );

    const minimumTarget = Number(
        settings['Minimum Target %']
    );

    const simulationMode = String(
        settings['Simulation Mode'] || ''
    ).trim();

    const simulationAmount = Number(
        settings['Simulation Amount']
    );

    const fixedQuantity = Number(
        settings['Fixed Quantity']
    );

    const validHigherTimeframes = [
        'Daily',
        '4 Hour',
        '1 Hour'
    ];

    const validLowerTimeframes = [
        '1 Hour',
        '30 Min',
        '15 Min'
    ];

    if (!validHigherTimeframes.includes(higherTimeframe)) {
        errors.push(
            'Invalid Higher Timeframe: ' + higherTimeframe
        );
    }

    if (!validLowerTimeframes.includes(lowerTimeframe)) {
        errors.push(
            'Invalid Lower Timeframe: ' + lowerTimeframe
        );
    }

    const timeframeOrder = {
        'Daily': 1440,
        '4 Hour': 240,
        '1 Hour': 60,
        '30 Min': 30,
        '15 Min': 15
    };

    if (
        timeframeOrder[higherTimeframe] !== undefined &&
        timeframeOrder[lowerTimeframe] !== undefined &&
        timeframeOrder[lowerTimeframe] >=
        timeframeOrder[higherTimeframe]
    ) {
        errors.push(
            'Invalid timeframe combination: ' +
            higherTimeframe +
            ' → ' +
            lowerTimeframe
        );
    }

    if (!Number.isInteger(candleLookback) || candleLookback <= 0) {
        errors.push(
            'Candle Lookback must be a positive integer.'
        );
    }

    if (!Number.isInteger(volumeLookback) || volumeLookback <= 0) {
        errors.push(
            'Volume Lookback must be a positive integer.'
        );
    }

    if (!Number.isInteger(movingAverage) || movingAverage <= 0) {
        errors.push(
            'Moving Average Period must be a positive integer.'
        );
    }

    if (!Number.isFinite(minimumTarget) || minimumTarget < 0) {
        errors.push(
            'Minimum Target % must be a valid non-negative number.'
        );
    }

    const validSimulationModes = [
        'Fixed Amount',
        'Fixed Quantity'
    ];

    if (!validSimulationModes.includes(simulationMode)) {
        errors.push(
            'Invalid Simulation Mode: ' + simulationMode
        );
    }

    if (
        !Number.isFinite(simulationAmount) ||
        simulationAmount <= 0
    ) {
        errors.push(
            'Simulation Amount must be greater than zero.'
        );
    }

    if (
        !Number.isInteger(fixedQuantity) ||
        fixedQuantity <= 0
    ) {
        errors.push(
            'Fixed Quantity must be a positive integer.'
        );
    }

    return {
        valid: errors.length === 0,
        errors: errors
    };
}


/**
 * Tests Settings → Apps Script connection.
 */
function testSettings() {
    try {
        const settings = getSettings();
        const validation = validateSettings(settings);

        if (!validation.valid) {
            SpreadsheetApp.getUi().alert(
                'Settings validation failed:\n\n' +
                validation.errors.join('\n')
            );
            return;
        }

        SpreadsheetApp.getUi().alert(
            'Settings loaded successfully.\n\n' +
            'Higher Timeframe: ' +
            settings['Higher Timeframe'] + '\n' +
            'Lower Timeframe: ' +
            settings['Lower Timeframe'] + '\n' +
            'Candle Lookback: ' +
            settings['Candle Lookback'] + '\n' +
            'Volume Lookback: ' +
            settings['Volume Lookback'] + '\n' +
            'Moving Average: ' +
            settings['Moving Average Period'] + '\n' +
            'Minimum Target: ' +
            settings['Minimum Target %'] + '\n' +
            'Simulation Mode: ' +
            settings['Simulation Mode']
        );

    } catch (error) {
        SpreadsheetApp.getUi().alert(
            'Settings error:\n\n' + error.message
        );
    }
}