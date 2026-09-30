/**
 * Phase B — Yahoo Finance Market Data
 */


/**
 * Phase B — Yahoo Finance Market Data
 */


/**
 * Retrieves OHLCV data from Yahoo Finance.
 *
 * V1 market-data safeguard:
 * For intraday timeframes, Yahoo may return a trailing
 * candle with zero volume. Such a candle is not suitable
 * for volume analysis.
 *
 * We therefore remove ONLY trailing zero-volume candles
 * from intraday data.
 *
 * Daily data is not affected.
 */
function getYahooData(
  symbol,
  timeframe,
  requiredCandles
) {

  const intervalMap = {

    'Daily': '1d',

    '4 Hour': '1h',

    '1 Hour': '1h',

    '30 Min': '30m',

    '15 Min': '15m'
  };


  const interval =
    intervalMap[timeframe];


  if (!interval) {

    return {

      status: 'DATA ERROR',

      message:
        'Unsupported timeframe: ' +
        timeframe,

      candles: []
    };
  }


  const period2 =
    Math.floor(
      Date.now() / 1000
    );


  const required =
    Number.isInteger(
      requiredCandles
    ) &&
      requiredCandles > 0

      ? requiredCandles

      : 20;


  /*
   * Allow extra calendar days for
   * weekends and market holidays.
   */
  const calendarDays =
    timeframe === 'Daily'

      ? Math.max(
        60,
        required * 3
      )

      : 30;


  const period1 =
    period2 -
    (
      calendarDays *
      24 *
      60 *
      60
    );


  const url =
    'https://query1.finance.yahoo.com/v8/finance/chart/' +
    encodeURIComponent(symbol) +
    '?period1=' + period1 +
    '&period2=' + period2 +
    '&interval=' + interval +
    '&events=history';


  try {

    const response =
      UrlFetchApp.fetch(
        url,
        {
          method: 'get',
          muteHttpExceptions: true
        }
      );


    const responseCode =
      response.getResponseCode();


    const responseText =
      response.getContentText();


    if (
      responseCode !== 200
    ) {

      return {

        status: 'DATA ERROR',

        message:
          'Yahoo Finance HTTP status: ' +
          responseCode,

        candles: []
      };
    }


    /*
     * Parse Yahoo response.
     */
    const parsed =
      parseYahooResponse(
        responseText
      );


    if (
      parsed.status !== 'OK'
    ) {

      return parsed;
    }


    /*
     * --------------------------------------------------------
     * Intraday trailing zero-volume safeguard
     * --------------------------------------------------------
     *
     * Do NOT alter Daily data.
     *
     * Do NOT remove zero-volume candles from the middle.
     *
     * Only remove trailing zero-volume candles because they
     * are unusable as the latest volume observation.
     */
    const cleanedCandles =
      removeTrailingZeroVolumeCandles(
        parsed.candles,
        timeframe
      );


    /*
     * Make sure enough candles remain after cleanup.
     */
    if (
      cleanedCandles.length <
      required
    ) {

      return {

        status:
          'INSUFFICIENT DATA',

        message:
          'After removing trailing zero-volume ' +
          'intraday candles, only ' +
          cleanedCandles.length +
          ' candles remained; required at least ' +
          required +
          '.',

        candles:
          cleanedCandles
      };
    }


    return {

      status: 'OK',

      message:
        'Yahoo Finance data parsed successfully.',

      candles:
        cleanedCandles
    };


  } catch (error) {

    return {

      status: 'DATA ERROR',

      message:
        error.message,

      candles: []
    };
  }
}


/**
 * Removes ONLY trailing zero-volume candles
 * from intraday data.
 *
 * Why:
 * Yahoo can expose a latest intraday candle whose
 * OHLC values are present but whose volume is zero.
 *
 * We do not modify:
 * - Daily data
 * - non-trailing candles
 * - normal non-zero-volume candles
 */
function removeTrailingZeroVolumeCandles(
  candles,
  timeframe
) {

  if (
    !candles ||
    candles.length === 0
  ) {

    return [];
  }


  /*
   * Daily data remains untouched.
   */
  if (
    timeframe === 'Daily'
  ) {

    return candles;
  }


  /*
   * Work on a copy so the original
   * parsed array is not mutated.
   */
  const cleaned =
    candles.slice();


  /*
   * Remove only trailing zero-volume
   * candles.
   */
  while (
    cleaned.length > 0 &&
    Number(cleaned[cleaned.length - 1].volume) === 0
  ) {

    cleaned.pop();
  }


  return cleaned;
}


/**
 * Parses Yahoo Finance chart API response.
 */
function parseYahooResponse(responseText) {
  try {
    const data = JSON.parse(responseText);

    if (
      !data.chart ||
      !data.chart.result ||
      !data.chart.result.length
    ) {
      return {
        status: 'DATA ERROR',
        message:
          'Yahoo Finance returned no chart result.',
        candles: []
      };
    }

    const result = data.chart.result[0];

    if (
      !result.timestamp ||
      !result.indicators ||
      !result.indicators.quote
    ) {
      return {
        status: 'INSUFFICIENT DATA',
        message:
          'Yahoo Finance response contains no usable candle data.',
        candles: []
      };
    }

    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];

    const candles = [];

    for (let i = 0; i < timestamps.length; i++) {
      const open = quote.open[i];
      const high = quote.high[i];
      const low = quote.low[i];
      const close = quote.close[i];
      const volume = quote.volume[i];

      if (
        open == null ||
        high == null ||
        low == null ||
        close == null ||
        volume == null
      ) {
        continue;
      }

      candles.push({
        timestamp: new Date(
          timestamps[i] * 1000
        ),
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume)
      });
    }

    if (candles.length === 0) {
      return {
        status: 'INSUFFICIENT DATA',
        message:
          'No complete OHLCV candles were returned.',
        candles: []
      };
    }

    return {
      status: 'OK',
      message:
        'Yahoo Finance data parsed successfully.',
      candles: candles
    };

  } catch (error) {
    return {
      status: 'DATA ERROR',
      message:
        'Unable to parse Yahoo Finance response: ' +
        error.message,
      candles: []
    };
  }
}


/**
 * Validates retrieved market data.
 */
function validateMarketData(
  candles,
  requiredCandles
) {
  if (!candles || candles.length === 0) {
    return {
      valid: false,
      status: 'INSUFFICIENT DATA',
      message: 'No candles available.'
    };
  }

  if (candles.length < requiredCandles) {
    return {
      valid: false,
      status: 'INSUFFICIENT DATA',
      message:
        'Received ' + candles.length +
        ' candles; required at least ' +
        requiredCandles + '.'
    };
  }

  return {
    valid: true,
    status: 'OK',
    message:
      'Market data validation passed.'
  };
}


/**
 * ============================================================
 * Yahoo Finance DATA TEST
 * ============================================================
 *
 * Uses the FIRST active stock from Stock_List.
 *
 * Stock_List order determines which stock is tested.
 *
 * Example:
 *
 * MARUTI       | MARUTI.NS       | YES
 * HEROMOTOCO   | HEROMOTOCO.NS   | YES
 * MOTHERSON    | MOTHERSON.NS   | YES
 *
 * → Tests MARUTI.NS
 *
 * If MARUTI is changed to NO:
 *
 * → Tests HEROMOTOCO.NS
 */
function runDataTest() {

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
        'Yahoo Finance Test\n\n' +
        'Stock_List sheet was not found.'
      );

      return;
    }


    /*
     * --------------------------------------------------------
     * 4. Read active stocks
     * --------------------------------------------------------
     *
     * IMPORTANT:
     * Reuse the existing readActiveStocks(sheet)
     * helper from 17_AnalysisOrchestrator.js.
     */

    const activeStocks =
      readActiveStocks(
        stockListSheet
      );


    if (
      !activeStocks ||
      activeStocks.length === 0
    ) {

      SpreadsheetApp.getUi().alert(
        'Yahoo Finance Test\n\n' +
        'No active stocks found in Stock_List.\n\n' +
        'Set Active? = YES for at least one stock.'
      );

      return;
    }


    /*
     * --------------------------------------------------------
     * 5. FIRST active stock
     * --------------------------------------------------------
     */

    const stockInfo =
      activeStocks[0];

    const stock =
      String(
        stockInfo.stock || ''
      ).trim();

    const symbol =
      String(
        stockInfo.symbol || ''
      ).trim();


    if (!symbol) {

      SpreadsheetApp.getUi().alert(
        'Yahoo Finance Test\n\n' +
        'The first active stock does not have a Yahoo Symbol.\n\n' +
        'Stock: ' + stock
      );

      return;
    }


    /*
     * --------------------------------------------------------
     * 6. Test configuration
     * --------------------------------------------------------
     */

    const timeframe =
      String(
        settings['Lower Timeframe'] || ''
      ).trim();

    const requiredCandles =
      Number(
        settings['Candle Lookback']
      );


    /*
     * --------------------------------------------------------
     * 7. Yahoo Finance
     * --------------------------------------------------------
     */

    const result =
      getYahooData(
        symbol,
        timeframe,
        requiredCandles
      );


    if (
      !result ||
      result.status !== 'OK'
    ) {

      SpreadsheetApp.getUi().alert(

        'Yahoo Finance Test\n\n' +

        'Stock: ' +
        stock + '\n' +

        'Symbol: ' +
        symbol + '\n' +

        'Timeframe: ' +
        timeframe + '\n\n' +

        'Status: ' +
        (
          result
            ? result.status
            : 'DATA ERROR'
        ) + '\n' +

        'Message: ' +
        (
          result
            ? result.message
            : 'No result returned.'
        )
      );

      return;
    }


    /*
     * --------------------------------------------------------
     * 8. Market-data validation
     * --------------------------------------------------------
     */

    const marketValidation =
      validateMarketData(
        result.candles,
        requiredCandles
      );


    if (!marketValidation.valid) {

      SpreadsheetApp.getUi().alert(

        'Yahoo Finance Test\n\n' +

        'Stock: ' +
        stock + '\n' +

        'Symbol: ' +
        symbol + '\n' +

        'Timeframe: ' +
        timeframe + '\n\n' +

        'Status: ' +
        marketValidation.status + '\n' +

        'Message: ' +
        marketValidation.message
      );

      return;
    }


    /*
     * --------------------------------------------------------
     * 9. Candle details
     * --------------------------------------------------------
     */

    const candles =
      result.candles;

    const firstCandle =
      candles[0];

    const latestCandle =
      candles[
      candles.length - 1
      ];


    /*
     * --------------------------------------------------------
     * 10. Logging
     * --------------------------------------------------------
     */

    Logger.log(
      'Yahoo Finance Data Test'
    );

    Logger.log(
      'Stock: ' +
      stock
    );

    Logger.log(
      'Symbol: ' +
      symbol
    );

    Logger.log(
      'Timeframe: ' +
      timeframe
    );

    Logger.log(
      'Status: ' +
      result.status
    );

    Logger.log(
      'Candles: ' +
      candles.length
    );

    Logger.log(
      'Earliest: ' +
      JSON.stringify(
        firstCandle
      )
    );

    Logger.log(
      'Latest: ' +
      JSON.stringify(
        latestCandle
      )
    );


    /*
     * --------------------------------------------------------
     * 11. Success
     * --------------------------------------------------------
     */

    SpreadsheetApp.getUi().alert(

      'Yahoo Finance Test Successful\n\n' +

      'Stock: ' +
      stock + '\n' +

      'Symbol: ' +
      symbol + '\n' +

      'Timeframe: ' +
      timeframe + '\n' +

      'Status: ' +
      result.status + '\n' +

      'Candles received: ' +
      candles.length +

      '\n\n' +

      'Earliest candle:\n' +

      firstCandle.timestamp +

      '\nClose: ' +

      firstCandle.close +

      '\n\n' +

      'Latest candle:\n' +

      latestCandle.timestamp +

      '\nClose: ' +

      latestCandle.close
    );


  } catch (error) {

    SpreadsheetApp.getUi().alert(

      'Yahoo Finance test failed:\n\n' +
      error.message

    );

  }
}