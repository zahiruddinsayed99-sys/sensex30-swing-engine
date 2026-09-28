/**
 * Phase B — Yahoo Finance Market Data
 */


/**
 * Retrieves OHLCV data from Yahoo Finance.
 */
function getYahooData(symbol, timeframe) {
  const intervalMap = {
    'Daily': '1d',
    '4 Hour': '1h',
    '1 Hour': '1h',
    '30 Min': '30m',
    '15 Min': '15m'
  };

  const interval = intervalMap[timeframe];

  if (!interval) {
    return {
      status: 'DATA ERROR',
      message: 'Unsupported timeframe: ' + timeframe,
      candles: []
    };
  }

  const period2 = Math.floor(Date.now() / 1000);

  // Initial test window: 30 days.
  const period1 =
    period2 - (30 * 24 * 60 * 60);

  const url =
    'https://query1.finance.yahoo.com/v8/finance/chart/' +
    encodeURIComponent(symbol) +
    '?period1=' + period1 +
    '&period2=' + period2 +
    '&interval=' + interval +
    '&events=history';

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true
    });

    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode !== 200) {
      return {
        status: 'DATA ERROR',
        message:
          'Yahoo Finance HTTP status: ' +
          responseCode,
        candles: []
      };
    }

    return parseYahooResponse(responseText);

  } catch (error) {
    return {
      status: 'DATA ERROR',
      message: error.message,
      candles: []
    };
  }
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
 * First Phase B data test.
 *
 * RELIANCE.NS is temporary test data only.
 */
function runDataTest() {
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

    const timeframe = String(
      settings['Lower Timeframe']
    ).trim();

    const requiredCandles = Number(
      settings['Candle Lookback']
    );

    const result =
      getYahooData(symbol, timeframe);

    if (result.status !== 'OK') {
      SpreadsheetApp.getUi().alert(
        'Yahoo Finance Test\n\n' +
        'Symbol: ' + symbol + '\n' +
        'Timeframe: ' + timeframe + '\n\n' +
        'Status: ' + result.status + '\n' +
        'Message: ' + result.message
      );
      return;
    }

    const marketValidation =
      validateMarketData(
        result.candles,
        requiredCandles
      );

    if (!marketValidation.valid) {
      SpreadsheetApp.getUi().alert(
        'Yahoo Finance Test\n\n' +
        'Symbol: ' + symbol + '\n' +
        'Timeframe: ' + timeframe + '\n\n' +
        'Status: ' +
        marketValidation.status + '\n' +
        'Message: ' +
        marketValidation.message
      );
      return;
    }

    const candles = result.candles;

    const firstCandle = candles[0];
    const latestCandle =
      candles[candles.length - 1];

    Logger.log(
      'Yahoo Finance Data Test'
    );

    Logger.log(
      'Symbol: ' + symbol
    );

    Logger.log(
      'Timeframe: ' + timeframe
    );

    Logger.log(
      'Status: ' + result.status
    );

    Logger.log(
      'Candles: ' + candles.length
    );

    Logger.log(
      'Earliest: ' +
      JSON.stringify(firstCandle)
    );

    Logger.log(
      'Latest: ' +
      JSON.stringify(latestCandle)
    );

    SpreadsheetApp.getUi().alert(
      'Yahoo Finance Test Successful\n\n' +
      'Symbol: ' + symbol + '\n' +
      'Timeframe: ' + timeframe + '\n' +
      'Status: ' + result.status + '\n' +
      'Candles received: ' + candles.length +
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
