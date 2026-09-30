/**
 * 17_AnalysisOrchestrator.js
 *
 * Production orchestration for Swing Trading System V1.
 *
 * Workflow:
 *
 * Stock_List
 *     ↓
 * Higher TF Analysis
 *     ↓
 * Lower TF Analysis
 *     ↓
 * Volume Divergence
 *     ↓
 * Target Analysis
 *     ↓
 * Decision Engine
 *     ↓
 * Analysis sheet
 *     ↓
 * Potential Trade when CONFIRM
 *
 * Responsibility:
 * - Orchestrate existing analysis modules.
 * - Write one row per stock into Analysis.
 * - Continue processing when one stock fails.
 * - Create Potential Trade only for CONFIRM.
 *
 * Does NOT:
 * - duplicate analysis calculations
 * - modify Decision Engine rules
 * - modify Potential Trade rules
 * - create Paper Trades
 * - execute real trades
 */

const ANALYSIS_SHEET_NAME = 'Analysis';

const ANALYSIS_HEADERS = [
    'Run ID',
    'Analysis Date',
    'Analysis Time',
    'Stock',
    'Yahoo Symbol',
    'Higher Timeframe',
    'Lower Timeframe',
    'Analysis Status',
    'Error Message',

    'HTF Current Price',
    'HTF Previous Close',
    'HTF 20 MA',
    'HTF Price vs 20 MA',
    'HTF Trend',
    'HTF Market Structure',
    'HTF Recent Swing High',
    'HTF Recent Swing Low',
    'HTF Candle Direction',
    'HTF Candle Strength',
    'HTF Current Volume',
    'HTF Average Volume',
    'HTF Volume Ratio',
    'HTF Volume Condition',
    'HTF Support',
    'HTF Resistance',
    'HTF Context',

    'LTF Current Price',
    'LTF VWAP',
    'LTF Price vs VWAP',
    'LTF VWAP Reclaim',
    'LTF 20 MA',
    'LTF Price vs 20 MA',
    'LTF 20 MA Reclaim',
    'LTF Candle Direction',
    'LTF Candle Strength',
    'LTF Close Position',
    'LTF Current Volume',
    'LTF Average Volume',
    'LTF Volume Ratio',
    'LTF Volume Condition',
    'LTF Volume Confirmation',
    'LTF Support',
    'LTF Resistance',
    'LTF Context',

    'Volume Divergence',
    'Target Price',
    'Target Potential %',
    'Minimum Target %',
    'Target Room Adequate?',

    'Conditions Satisfied',
    'Total Conditions',
    'Satisfied Conditions',
    'Failed Conditions',
    'Final Decision',
    'Primary Reason',
    'Secondary Reason',

    'Potential Trade Status',
    'Potential Trade ID'
];


/**
 * ============================================================
 * MAIN ENTRY POINT
 * ============================================================
 *
 * Existing menu can continue calling:
 *
 *     runAnalysis()
 *
 * The function is now located in this modular script instead
 * of 01_Main.js.
 */
function runAnalysis() {

    const lock =
        LockService.getDocumentLock();

    if (!lock.tryLock(1000)) {

        SpreadsheetApp.getUi().alert(
            'Run Analysis is already in progress.\n\n' +
            'Please wait for the current run to finish.'
        );

        return;
    }

    try {

        /*
         * --------------------------------------------------------
         * 1. Settings
         * --------------------------------------------------------
         */

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
         * --------------------------------------------------------
         * 2. Spreadsheet
         * --------------------------------------------------------
         */

        const spreadsheet =
            SpreadsheetApp.getActiveSpreadsheet();


        /*
         * --------------------------------------------------------
         * 3. Stock_List
         * --------------------------------------------------------
         */

        const stockListSheet =
            spreadsheet.getSheetByName(
                'Stock_List'
            );

        if (!stockListSheet) {

            SpreadsheetApp.getUi().alert(
                'Stock_List sheet was not found.'
            );

            return;
        }


        /*
         * --------------------------------------------------------
         * 4. Analysis
         * --------------------------------------------------------
         */

        const analysisSheet =
            spreadsheet.getSheetByName(
                ANALYSIS_SHEET_NAME
            );

        if (!analysisSheet) {

            SpreadsheetApp.getUi().alert(
                'Analysis sheet was not found.\n\n' +
                'Please create a sheet named "Analysis".'
            );

            return;
        }


        /*
         * --------------------------------------------------------
         * 5. Active stocks
         * --------------------------------------------------------
         */

        const activeStocks =
            readActiveStocks(
                stockListSheet
            );

        if (activeStocks.length === 0) {

            SpreadsheetApp.getUi().alert(
                'No active stocks found in Stock_List.'
            );

            return;
        }


        /*
         * --------------------------------------------------------
         * 6. Run metadata
         * --------------------------------------------------------
         */

        const now =
            new Date();

        const runId =
            createAnalysisRunId();

        const runDate =
            formatAnalysisDate(
                now
            );

        const runTime =
            formatAnalysisTime(
                now
            );


        /*
         * --------------------------------------------------------
         * 7. Process all active stocks
         * --------------------------------------------------------
         */

        const rows = [];

        const results = [];

        activeStocks.forEach(
            function (stockInfo) {

                const result =
                    analyzeOneStock(
                        stockInfo,
                        settings,
                        runId,
                        runDate,
                        runTime
                    );

                rows.push(
                    result.row
                );

                results.push(
                    result.summary
                );
            }
        );


        /*
         * --------------------------------------------------------
         * 8. Write complete current run
         * --------------------------------------------------------
         */

        writeAnalysisRows(
            analysisSheet,
            rows
        );


        /*
         * --------------------------------------------------------
         * 9. Summary
         * --------------------------------------------------------
         */

        showAnalysisSummary(
            runId,
            results
        );

    } catch (error) {

        SpreadsheetApp.getUi().alert(
            'Run Analysis failed:\n\n' +
            error.message
        );

        throw error;

    } finally {

        lock.releaseLock();
    }
}


/**
 * ============================================================
 * STOCK LIST
 * ============================================================
 */

function readActiveStocks(
    sheet
) {

    const values =
        sheet
            .getDataRange()
            .getValues();

    if (
        !values ||
        values.length < 2
    ) {

        return [];
    }


    const headers =
        values[0].map(
            function (header) {

                return String(header)
                    .trim()
                    .toLowerCase();
            }
        );


    const stockIndex =
        headers.indexOf(
            'stock'
        );

    const symbolIndex =
        headers.indexOf(
            'yahoo symbol'
        );

    const activeIndex =
        headers.indexOf(
            'active?'
        );


    if (
        stockIndex === -1 ||
        symbolIndex === -1 ||
        activeIndex === -1
    ) {

        throw new Error(
            'Stock_List must contain these columns:\n' +
            'Stock\n' +
            'Yahoo Symbol\n' +
            'Active?'
        );
    }


    const stocks = [];


    for (
        let rowIndex = 1;
        rowIndex < values.length;
        rowIndex++
    ) {

        const row =
            values[rowIndex];


        const active =
            String(
                row[activeIndex] || ''
            )
                .trim()
                .toUpperCase();


        if (
            active !== 'YES'
        ) {

            continue;
        }


        const stock =
            String(
                row[stockIndex] || ''
            ).trim();


        const symbol =
            String(
                row[symbolIndex] || ''
            ).trim();


        if (!symbol) {

            continue;
        }


        stocks.push({

            stock:
                stock || symbol,

            symbol:
                symbol
        });
    }


    return stocks;
}


/**
 * ============================================================
 * SINGLE STOCK ANALYSIS
 * ============================================================
 */

function analyzeOneStock(
    stockInfo,
    settings,
    runId,
    runDate,
    runTime
) {

    const symbol =
        stockInfo.symbol;


    try {

        /*
         * --------------------------------------------------------
         * 1. Higher Timeframe
         * --------------------------------------------------------
         */

        const higherTF =
            analyzeHigherTimeframe(
                symbol,
                settings
            );


        if (
            !higherTF ||
            higherTF.status !== 'OK'
        ) {

            return {

                row:
                    buildErrorRow(
                        stockInfo,
                        settings,
                        runId,
                        runDate,
                        runTime,
                        higherTF
                            ? higherTF.status
                            : 'DATA ERROR',
                        higherTF
                            ? higherTF.message
                            : 'Higher TF analysis failed.'
                    ),

                summary: {

                    stock:
                        stockInfo.stock,

                    symbol:
                        symbol,

                    status:
                        higherTF
                            ? higherTF.status
                            : 'DATA ERROR',

                    decision:
                        '',

                    potentialTrade:
                        ''
                }
            };
        }


        /*
         * --------------------------------------------------------
         * 2. Lower Timeframe
         * --------------------------------------------------------
         */

        const lowerTF =
            analyzeLowerTimeframe(
                symbol,
                settings
            );


        if (
            !lowerTF ||
            lowerTF.status !== 'OK'
        ) {

            return {

                row:
                    buildErrorRow(
                        stockInfo,
                        settings,
                        runId,
                        runDate,
                        runTime,
                        lowerTF
                            ? lowerTF.status
                            : 'DATA ERROR',
                        lowerTF
                            ? lowerTF.message
                            : 'Lower TF analysis failed.'
                    ),

                summary: {

                    stock:
                        stockInfo.stock,

                    symbol:
                        symbol,

                    status:
                        lowerTF
                            ? lowerTF.status
                            : 'DATA ERROR',

                    decision:
                        '',

                    potentialTrade:
                        ''
                }
            };
        }


        /*
         * --------------------------------------------------------
         * 3. Market Data for Volume Divergence
         * --------------------------------------------------------
         */

        const candleLookback =
            Number(
                settings['Candle Lookback']
            );


        const volumeLookback =
            Number(
                settings['Volume Lookback']
            );


        const requiredCandles =
            Math.max(
                candleLookback,
                volumeLookback + 1
            );


        const marketData =
            getYahooData(
                symbol,
                settings['Lower Timeframe'],
                requiredCandles
            );


        if (
            !marketData ||
            marketData.status !== 'OK'
        ) {

            return {

                row:
                    buildErrorRow(
                        stockInfo,
                        settings,
                        runId,
                        runDate,
                        runTime,
                        marketData
                            ? marketData.status
                            : 'DATA ERROR',
                        marketData
                            ? marketData.message
                            : 'Market data failed.'
                    ),

                summary: {

                    stock:
                        stockInfo.stock,

                    symbol:
                        symbol,

                    status:
                        marketData
                            ? marketData.status
                            : 'DATA ERROR',

                    decision:
                        '',

                    potentialTrade:
                        ''
                }
            };
        }


        /*
         * --------------------------------------------------------
         * 4. Volume Divergence
         * --------------------------------------------------------
         */

        const volumeDivergence =
            analyzeVolumeDivergence(
                marketData.candles,
                volumeLookback
            );


        if (
            !volumeDivergence ||
            volumeDivergence.status !== 'OK'
        ) {

            return {

                row:
                    buildErrorRow(
                        stockInfo,
                        settings,
                        runId,
                        runDate,
                        runTime,
                        volumeDivergence
                            ? volumeDivergence.status
                            : 'DATA ERROR',
                        volumeDivergence
                            ? volumeDivergence.message
                            : 'Volume divergence failed.'
                    ),

                summary: {

                    stock:
                        stockInfo.stock,

                    symbol:
                        symbol,

                    status:
                        volumeDivergence
                            ? volumeDivergence.status
                            : 'DATA ERROR',

                    decision:
                        '',

                    potentialTrade:
                        ''
                }
            };
        }


        /*
         * --------------------------------------------------------
         * 5. Target
         * --------------------------------------------------------
         */

        const minimumTarget =
            Number(
                settings['Minimum Target %']
            );


        if (
            !Number.isFinite(
                minimumTarget
            ) ||
            minimumTarget <= 0
        ) {

            return {

                row:
                    buildErrorRow(
                        stockInfo,
                        settings,
                        runId,
                        runDate,
                        runTime,
                        'DATA ERROR',
                        'Invalid Minimum Target %.'
                    ),

                summary: {

                    stock:
                        stockInfo.stock,

                    symbol:
                        symbol,

                    status:
                        'DATA ERROR',

                    decision:
                        '',

                    potentialTrade:
                        ''
                }
            };
        }


        const targetAnalysis =
            calculateTarget(
                lowerTF.currentPrice,

                /*
                * Prefer complete LTF resistance levels.
                * Fall back to existing nearest resistance
                * for backward compatibility.
                */
                lowerTF.resistanceLevels ||
                lowerTF.resistance,

                minimumTarget,

                /*
                * Prefer complete HTF resistance levels.
                * Fall back to existing nearest resistance
                * for backward compatibility.
                */
                higherTF.resistanceLevels ||
                higherTF.resistance
            );


        if (
            !targetAnalysis ||
            targetAnalysis.status !== 'OK'
        ) {

            return {

                row:
                    buildErrorRow(
                        stockInfo,
                        settings,
                        runId,
                        runDate,
                        runTime,
                        targetAnalysis
                            ? targetAnalysis.status
                            : 'DATA ERROR',
                        targetAnalysis
                            ? targetAnalysis.message
                            : 'Target calculation failed.'
                    ),

                summary: {

                    stock:
                        stockInfo.stock,

                    symbol:
                        symbol,

                    status:
                        targetAnalysis
                            ? targetAnalysis.status
                            : 'DATA ERROR',

                    decision:
                        '',

                    potentialTrade:
                        ''
                }
            };
        }


        /*
         * --------------------------------------------------------
         * 6. Decision Engine
         * --------------------------------------------------------
         */

        const decision =
            evaluateDecision(
                higherTF,
                lowerTF,
                volumeDivergence,
                targetAnalysis
            );


        if (
            !decision ||
            decision.status !== 'OK'
        ) {

            return {

                row:
                    buildErrorRow(
                        stockInfo,
                        settings,
                        runId,
                        runDate,
                        runTime,
                        decision
                            ? decision.status
                            : 'DATA ERROR',
                        decision
                            ? decision.message
                            : 'Decision Engine failed.'
                    ),

                summary: {

                    stock:
                        stockInfo.stock,

                    symbol:
                        symbol,

                    status:
                        decision
                            ? decision.status
                            : 'DATA ERROR',

                    decision:
                        '',

                    potentialTrade:
                        ''
                }
            };
        }


        /*
         * --------------------------------------------------------
         * 7. Potential Trade
         *
         * IMPORTANT:
         * Only CONFIRM creates a Potential Trade.
         * --------------------------------------------------------
         */

        let potentialTradeStatus =
            'NOT CREATED';


        let potentialTradeId =
            '';


        if (
            decision.finalDecision ===
            'CONFIRM'
        ) {

            const potentialTrade =
                createPotentialTrade(
                    symbol,
                    settings,
                    higherTF,
                    lowerTF,
                    volumeDivergence,
                    targetAnalysis,
                    decision
                );


            potentialTradeStatus =
                potentialTrade
                    ? potentialTrade.status
                    : 'ERROR';


            potentialTradeId =
                potentialTrade &&
                    potentialTrade.tradeId
                    ? potentialTrade.tradeId
                    : '';
        }


        /*
         * --------------------------------------------------------
         * 8. Build Analysis Row
         * --------------------------------------------------------
         */

        const row =
            buildSuccessRow(
                stockInfo,
                settings,
                runId,
                runDate,
                runTime,
                higherTF,
                lowerTF,
                volumeDivergence,
                targetAnalysis,
                decision,
                potentialTradeStatus,
                potentialTradeId
            );


        return {

            row:
                row,

            summary: {

                stock:
                    stockInfo.stock,

                symbol:
                    symbol,

                status:
                    'OK',

                decision:
                    decision.finalDecision,

                potentialTrade:
                    potentialTradeStatus,

                tradeId:
                    potentialTradeId
            }
        };


    } catch (error) {

        return {

            row:
                buildErrorRow(
                    stockInfo,
                    settings,
                    runId,
                    runDate,
                    runTime,
                    'ERROR',
                    error.message
                ),

            summary: {

                stock:
                    stockInfo.stock,

                symbol:
                    symbol,

                status:
                    'ERROR',

                decision:
                    '',

                potentialTrade:
                    ''
            }
        };
    }
}


/**
 * ============================================================
 * BUILD SUCCESS ROW
 * ============================================================
 */

function buildSuccessRow(
    stockInfo,
    settings,
    runId,
    runDate,
    runTime,
    higherTF,
    lowerTF,
    volumeDivergence,
    targetAnalysis,
    decision,
    potentialTradeStatus,
    potentialTradeId
) {

    return [

        runId,
        runDate,
        runTime,

        stockInfo.stock,
        stockInfo.symbol,

        String(
            settings['Higher Timeframe'] || ''
        ).trim(),

        String(
            settings['Lower Timeframe'] || ''
        ).trim(),

        'OK',
        '',


        /*
         * HTF
         */

        higherTF.currentPrice,

        higherTF.previousClose,

        higherTF.movingAverage.value,

        higherTF.movingAverage.pricePosition,

        higherTF.trend,

        higherTF.marketStructure,

        getPrice(
            higherTF.recentSwingHigh
        ),

        getPrice(
            higherTF.recentSwingLow
        ),

        higherTF.candle.direction,

        getCandleStrength(
            higherTF.candle
        ),

        getHTFVolumeValue(
            higherTF.volume,
            'latestVolume'
        ),

        getHTFVolumeValue(
            higherTF.volume,
            'averageVolume'
        ),

        getHTFVolumeValue(
            higherTF.volume,
            'volumeRatio'
        ),

        getHTFVolumeValue(
            higherTF.volume,
            'volumeCondition'
        ),

        getPrice(
            higherTF.support
        ),

        getPrice(
            higherTF.resistance
        ),

        higherTF.context,


        /*
         * LTF
         */

        lowerTF.currentPrice,

        lowerTF.vwap,

        lowerTF.priceVsVWAP,

        lowerTF.vwapReclaim,

        lowerTF.movingAverage.value,

        lowerTF.movingAverage.pricePosition,

        lowerTF.movingAverage.reclaim,

        lowerTF.candle.direction,

        getCandleStrength(
            lowerTF.candle
        ),

        lowerTF.candle.closePosition,

        getLTFVolumeValue(
            lowerTF.volume,
            'currentVolume'
        ),

        getLTFVolumeValue(
            lowerTF.volume,
            'averageVolume'
        ),

        getLTFVolumeValue(
            lowerTF.volume,
            'volumeRatio'
        ),

        getLTFVolumeValue(
            lowerTF.volume,
            'condition'
        ),

        getLTFVolumeValue(
            lowerTF.volume,
            'confirmation'
        ),

        getPrice(
            lowerTF.support
        ),

        getPrice(
            lowerTF.resistance
        ),

        lowerTF.context,


        /*
         * Volume / Target
         */

        getOptional(
            volumeDivergence,
            'divergence'
        ),

        targetAnalysis.targetPrice,

        targetAnalysis.potentialReturn,

        Number(
            settings['Minimum Target %']
        ),

        targetAnalysis.targetSatisfied
            ? 'YES'
            : 'NO',


        /*
        * Decision
        */

        decision.conditionsSatisfied,

        decision.totalConditions,

        (decision.satisfiedConditions || []).join('; '),

        (decision.failedConditions || []).join('; '),

        decision.finalDecision,

        decision.primaryReason,

        decision.secondaryReason,

        /*
         * Potential Trade
         */

        potentialTradeStatus,

        potentialTradeId
    ];
}


/**
 * ============================================================
 * BUILD ERROR ROW
 * ============================================================
 */

function buildErrorRow(
    stockInfo,
    settings,
    runId,
    runDate,
    runTime,
    status,
    message
) {

    const row =
        new Array(
            ANALYSIS_HEADERS.length
        ).fill('');


    row[0] =
        runId;

    row[1] =
        runDate;

    row[2] =
        runTime;

    row[3] =
        stockInfo.stock;

    row[4] =
        stockInfo.symbol;

    row[5] =
        String(
            settings['Higher Timeframe'] || ''
        ).trim();

    row[6] =
        String(
            settings['Lower Timeframe'] || ''
        ).trim();

    row[7] =
        status;

    row[8] =
        message;


    return row;
}


/**
 * ============================================================
 * WRITE ANALYSIS
 * ============================================================
 *
 * IMPORTANT:
 *
 * One active stock = one row.
 *
 * If 3 active stocks:
 *
 * Row 2 -> MOTHERSON
 * Row 3 -> COALINDIA
 * Row 4 -> LODHA
 *
 * The previous run is replaced by the latest run.
 */

function writeAnalysisRows(
    sheet,
    rows
) {

    /*
     * Clear old data.
     */

    const maxRows =
        sheet.getMaxRows();

    const maxColumns =
        sheet.getMaxColumns();


    if (
        maxRows > 1 &&
        maxColumns > 0
    ) {

        sheet
            .getRange(
                2,
                1,
                maxRows - 1,
                maxColumns
            )
            .clearContent();
    }


    /*
     * Header.
     */

    sheet
        .getRange(
            1,
            1,
            1,
            ANALYSIS_HEADERS.length
        )
        .setValues([
            ANALYSIS_HEADERS
        ]);


    /*
     * Data.
     */

    if (
        rows.length > 0
    ) {

        sheet
            .getRange(
                2,
                1,
                rows.length,
                ANALYSIS_HEADERS.length
            )
            .setValues(
                rows
            );
    }


    /*
     * Formatting.
     */

    sheet
        .getRange(
            1,
            1,
            1,
            ANALYSIS_HEADERS.length
        )
        .setFontWeight(
            'bold'
        );


    sheet.setFrozenRows(1);
}


/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function createAnalysisRunId() {

    const now =
        new Date();

    return (
        'AR-' +
        Utilities.formatDate(
            now,
            Session.getScriptTimeZone(),
            'yyyyMMdd-HHmmss'
        )
    );
}


function formatAnalysisDate(
    date
) {

    return Utilities.formatDate(
        date,
        Session.getScriptTimeZone(),
        'yyyy-MM-dd'
    );
}


function formatAnalysisTime(
    date
) {

    return Utilities.formatDate(
        date,
        Session.getScriptTimeZone(),
        'HH:mm:ss'
    );
}


function getPrice(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return '';
    }


    if (
        typeof value === 'number'
    ) {

        return value;
    }


    if (
        typeof value === 'object' &&
        value.price !== undefined
    ) {

        return Number(
            value.price
        );
    }


    return '';
}


function getOptional(
    object,
    property
) {

    if (
        !object ||
        object[property] === undefined ||
        object[property] === null
    ) {

        return '';
    }


    return object[property];
}


/**
 * Existing candle implementations may expose
 * bodyType or strength depending on the module.
 *
 * Prefer strength when available.
 */
function getCandleStrength(
    candle
) {

    if (!candle) {
        return '';
    }


    if (
        candle.strength !== undefined
    ) {

        return candle.strength;
    }


    if (
        candle.bodyType !== undefined
    ) {

        return candle.bodyType;
    }


    return '';
}


/**
 * HTF volume helper.
 *
 * The existing HTF analysis uses:
 * - latestVolume
 * - averageVolume
 * - volumeRatio
 * - volumeCondition
 */
function getHTFVolumeValue(
    volume,
    property
) {

    if (
        !volume ||
        volume[property] === undefined
    ) {

        return '';
    }


    return volume[property];
}


/**
 * LTF volume helper.
 *
 * Supports the existing V1 naming.
 */
function getLTFVolumeValue(
    volume,
    property
) {

    if (
        !volume ||
        volume[property] === undefined
    ) {

        return '';
    }


    return volume[property];
}


/**
 * ============================================================
 * SUMMARY
 * ============================================================
 */

function showAnalysisSummary(
    runId,
    results
) {

    const successful =
        results.filter(
            function (item) {

                return item.status === 'OK';
            }
        ).length;


    const failed =
        results.length -
        successful;


    let message =
        'Run Analysis Complete\n\n' +

        'Run ID: ' +
        runId +
        '\n\n' +

        'Stocks processed: ' +
        results.length +
        '\n' +

        'Successful: ' +
        successful +
        '\n' +

        'Failed: ' +
        failed +
        '\n\n';


    results.forEach(
        function (item) {

            message +=
                item.stock +
                ' (' +
                item.symbol +
                '): ';


            if (
                item.status === 'OK'
            ) {

                message +=
                    item.decision +
                    ' / ' +
                    item.potentialTrade;


                if (
                    item.tradeId
                ) {

                    message +=
                        '\nTrade ID: ' +
                        item.tradeId;
                }

            } else {

                message +=
                    item.status;
            }


            message +=
                '\n\n';
        }
    );


    SpreadsheetApp.getUi().alert(
        message
    );
}