/**
 * Phase C — Volume Analysis
 *
 * Analyzes recent volume behavior.
 * No trading signal is generated here.
 */


/**
 * Analyzes volume using the configured lookback.
 *
 * Compares the latest candle's volume against
 * the average volume of the preceding candles.
 */
function analyzeVolume(candles, volumeLookback) {
  if (!candles || candles.length === 0) {
    return {
      status: 'INSUFFICIENT DATA',
      message: 'No candles available.'
    };
  }

  if (
    !Number.isInteger(volumeLookback) ||
    volumeLookback <= 0
  ) {
    return {
      status: 'DATA ERROR',
      message:
        'Invalid volume lookback: ' +
        volumeLookback
    };
  }

  /*
   * We need the latest candle plus the
   * preceding volume-lookback candles.
   */
  if (candles.length < volumeLookback + 1) {
    return {
      status: 'INSUFFICIENT DATA',
      message:
        'Not enough candles for volume analysis. ' +
        'Required: ' +
        (volumeLookback + 1) +
        ', received: ' +
        candles.length
    };
  }

  const latestCandle =
    candles[candles.length - 1];

  const previousStart =
    candles.length - volumeLookback - 1;

  const previousEnd =
    candles.length - 1;

  const previousVolumes = [];

  for (
    let i = previousStart;
    i < previousEnd;
    i++
  ) {
    const volume = Number(candles[i].volume);

    if (!Number.isFinite(volume)) {
      continue;
    }

    previousVolumes.push(volume);
  }

  if (previousVolumes.length === 0) {
    return {
      status: 'INSUFFICIENT DATA',
      message:
        'No valid historical volume values available.'
    };
  }

  const latestVolume =
    Number(latestCandle.volume);

  if (!Number.isFinite(latestVolume)) {
    return {
      status: 'DATA ERROR',
      message:
        'Latest candle has invalid volume.'
    };
  }

  const totalVolume =
    previousVolumes.reduce(
      (sum, volume) => sum + volume,
      0
    );

  const averageVolume =
    totalVolume / previousVolumes.length;

  if (averageVolume <= 0) {
    return {
      status: 'DATA ERROR',
      message:
        'Average historical volume is zero or invalid.'
    };
  }

  const volumeRatio =
    latestVolume / averageVolume;

  const volumeChangePercent =
    ((latestVolume - averageVolume) /
      averageVolume) * 100;

  let volumeCondition = 'NORMAL';

  if (volumeRatio >= 1.5) {
    volumeCondition = 'HIGH';
  } else if (volumeRatio <= 0.5) {
    volumeCondition = 'LOW';
  }

  return {
    status: 'OK',
    latestVolume: latestVolume,
    averageVolume: averageVolume,
    volumeRatio: volumeRatio,
    volumeChangePercent: volumeChangePercent,
    volumeCondition: volumeCondition,
    lookback: previousVolumes.length
  };
}

/**
 * Tests volume analysis using the current
 * RELIANCE.NS data set.
 */
function runVolumeTest() {
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

    const volumeLookback =
      Number(
        settings['Volume Lookback']
      );

    const result =
      getYahooData(
        symbol,
        timeframe,
        candleLookback
      );

    if (result.status !== 'OK') {
      SpreadsheetApp.getUi().alert(
        'Volume test failed.\n\n' +
        'Status: ' +
        result.status +
        '\nMessage: ' +
        result.message
      );
      return;
    }

    const analysis =
      analyzeVolume(
        result.candles,
        volumeLookback
      );

    if (analysis.status !== 'OK') {
      SpreadsheetApp.getUi().alert(
        'Volume analysis failed.\n\n' +
        'Status: ' +
        analysis.status +
        '\nMessage: ' +
        analysis.message
      );
      return;
    }

    Logger.log(
      'Volume Analysis Test'
    );

    Logger.log(
      JSON.stringify(analysis)
    );

    SpreadsheetApp.getUi().alert(
      'Volume Analysis Successful\n\n' +
      'Symbol: ' + symbol + '\n' +
      'Timeframe: ' + timeframe + '\n\n' +
      'Latest Volume: ' +
      analysis.latestVolume + '\n' +
      'Average Volume: ' +
      analysis.averageVolume + '\n' +
      'Volume Ratio: ' +
      analysis.volumeRatio.toFixed(2) +
      'x\n' +
      'Volume Change: ' +
      analysis.volumeChangePercent.toFixed(2) +
      '%\n' +
      'Condition: ' +
      analysis.volumeCondition + '\n' +
      'Lookback: ' +
      analysis.lookback
    );

  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'Volume test failed:\n\n' +
      error.message
    );
  }
}