/**
 * Phase C — Higher Timeframe Analysis
 *
 * Builds the higher-timeframe context required
 * by the Swing Trading System.
 *
 * No final trading decision is generated here.
 */


/**
 * Determines basic trend from price vs 20 MA
 * and recent price movement.
 */
function determineHigherTFTrend(
  candles,
  movingAverage
) {
  if (!candles || candles.length < 3) {
    return 'INSUFFICIENT DATA';
  }

  const latest =
    Number(candles[candles.length - 1].close);

  const previous =
    Number(candles[candles.length - 2].close);

  if (
    !Number.isFinite(latest) ||
    !Number.isFinite(previous) ||
    !Number.isFinite(movingAverage)
  ) {
    return 'INSUFFICIENT DATA';
  }

  /*
   * V1 trend interpretation:
   *
   * ABOVE MA + rising price = UPTREND
   * BELOW MA + falling price = DOWNTREND
   * Otherwise = SIDEWAYS
   */
  if (
    latest > movingAverage &&
    latest > previous
  ) {
    return 'UPTREND';
  }

  if (
    latest < movingAverage &&
    latest < previous
  ) {
    return 'DOWNTREND';
  }

  return 'SIDEWAYS';
}


/**
 * Determines basic market structure from
 * recent swing highs and lows.
 */
function determineMarketStructure(
  candles
) {
  if (!candles || candles.length < 5) {
    return {
      status: 'INSUFFICIENT DATA',
      structure: 'INSUFFICIENT DATA'
    };
  }

  const swingData =
    analyzeSupportResistance(candles);

  if (
    swingData.status !== 'OK' ||
    swingData.supportLevels.length < 2 ||
    swingData.resistanceLevels.length < 2
  ) {
    return {
      status: 'INSUFFICIENT DATA',
      structure: 'INSUFFICIENT DATA'
    };
  }

  /*
   * Use the two most recent support and
   * resistance candidates.
   */
  const supports =
    swingData.supportLevels
      .slice()
      .sort(
        (a, b) =>
          new Date(a.timestamp) -
          new Date(b.timestamp)
      );

  const resistances =
    swingData.resistanceLevels
      .slice()
      .sort(
        (a, b) =>
          new Date(a.timestamp) -
          new Date(b.timestamp)
      );

  const previousSupport =
    supports[supports.length - 2];

  const latestSupport =
    supports[supports.length - 1];

  const previousResistance =
    resistances[resistances.length - 2];

  const latestResistance =
    resistances[resistances.length - 1];

  if (
    latestSupport.price >
    previousSupport.price &&
    latestResistance.price >
    previousResistance.price
  ) {
    return {
      status: 'OK',
      structure: 'HIGHER_HIGHS_HIGHER_LOWS'
    };
  }

  if (
    latestSupport.price <
    previousSupport.price &&
    latestResistance.price <
    previousResistance.price
  ) {
    return {
      status: 'OK',
      structure: 'LOWER_HIGHS_LOWER_LOWS'
    };
  }

  return {
    status: 'OK',
    structure: 'MIXED'
  };
}


/**
 * Builds the complete higher-timeframe
 * analysis for a symbol.
 */
function analyzeHigherTimeframe(
  symbol,
  settings
) {
  if (!symbol) {
    return {
      status: 'DATA ERROR',
      message: 'Stock symbol is missing.'
    };
  }

  if (!settings) {
    return {
      status: 'DATA ERROR',
      message: 'Settings are missing.'
    };
  }

  const timeframe =
    String(
      settings['Higher Timeframe']
    ).trim();

  const candleLookback =
    Number(
      settings['Candle Lookback']
    );

  const volumeLookback =
    Number(
      settings['Volume Lookback']
    );

  const movingAveragePeriod =
    Number(
      settings['Moving Average'] ??
      settings['Moving Average Period']
    );

  /*
  * Retrieve enough higher-timeframe candles
  * for every downstream calculation.
  *
  * Volume Analysis requires:
  * Volume Lookback + 1
  * because the current candle is included.
  */
  const requiredLookback =
    Math.max(
      candleLookback,
      volumeLookback + 1,
      movingAveragePeriod
    );

  const marketData =
    getYahooData(
      symbol,
      timeframe,
      requiredLookback
    );

  if (marketData.status !== 'OK') {
    return {
      status: marketData.status,
      message: marketData.message
    };
  }

  const candles =
    marketData.candles;

  if (!candles || candles.length === 0) {
    return {
      status: 'INSUFFICIENT DATA',
      message:
        'No higher-timeframe candles available.'
    };
  }

  const latestCandle =
    candles[candles.length - 1];

  const previousCandle =
    candles.length >= 2
      ? candles[candles.length - 2]
      : null;

  const currentPrice =
    Number(latestCandle.close);

  const previousClose =
    previousCandle
      ? Number(previousCandle.close)
      : null;

  /*
   * Moving Average
   */
  const movingAverage =
    calculateMovingAverage(
      candles,
      movingAveragePeriod
    );

  if (movingAverage.status !== 'OK') {
    return {
      status: movingAverage.status,
      message: movingAverage.message
    };
  }

  /*
   * Candle
   */
  const candle =
    analyzeCandle(latestCandle);

  if (candle.status !== 'OK') {
    return {
      status: candle.status,
      message: candle.message
    };
  }

  /*
   * Volume
   */
  const volume =
    analyzeVolume(
      candles,
      volumeLookback
    );

  if (volume.status !== 'OK') {
    return {
      status: volume.status,
      message: volume.message
    };
  }

  /*
   * Support / Resistance
   */
  const supportResistance =
    analyzeSupportResistance(candles);

  if (supportResistance.status !== 'OK') {
    return {
      status: supportResistance.status,
      message: supportResistance.message
    };
  }

  const nearestSupport =
    findNearestSupport(
      supportResistance.supportLevels,
      currentPrice
    );

  const nearestResistance =
    findNearestResistance(
      supportResistance.resistanceLevels,
      currentPrice
    );

  /*
   * Trend
   */
  const trend =
    determineHigherTFTrend(
      candles,
      movingAverage.movingAverage
    );

  /*
   * Market structure
   */
  const structure =
    determineMarketStructure(candles);

  /*
   * Context
   *
   * This is descriptive context only.
   * It is NOT the final trading decision.
   */
  let context = 'NEUTRAL';

  if (
    trend === 'UPTREND' &&
    structure.structure ===
    'HIGHER_HIGHS_HIGHER_LOWS' &&
    movingAverage.pricePosition === 'ABOVE'
  ) {
    context = 'POSITIVE';
  } else if (
    trend === 'DOWNTREND' &&
    structure.structure ===
    'LOWER_HIGHS_LOWER_LOWS' &&
    movingAverage.pricePosition === 'BELOW'
  ) {
    context = 'NEGATIVE';
  }

  return {
    status: 'OK',

    symbol: symbol,

    timeframe: timeframe,

    timestamp:
      latestCandle.timestamp,

    currentPrice: currentPrice,

    previousClose: previousClose,

    movingAverage: {
      period:
        movingAverage.period,

      value:
        movingAverage.movingAverage,

      pricePosition:
        movingAverage.pricePosition
    },

    trend: trend,

    marketStructure:
      structure.structure,

    recentSwingHigh:
      supportResistance
        .resistanceLevels[
      supportResistance.resistanceLevels.length - 1
      ],

    recentSwingLow:
      supportResistance
        .supportLevels[
      supportResistance.supportLevels.length - 1
      ],

    candle: candle,

    volume: volume,

    support:
      nearestSupport,

    resistance:
      nearestResistance,

    context: context
  };
}

/**
 * Tests higher-timeframe analysis using
 * RELIANCE.NS.
 */
function runHigherTFAnalysisTest() {
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

    const result =
      analyzeHigherTimeframe(
        symbol,
        settings
      );

    if (result.status !== 'OK') {
      SpreadsheetApp.getUi().alert(
        'Higher TF analysis failed.\n\n' +
        'Status: ' +
        result.status +
        '\nMessage: ' +
        result.message
      );
      return;
    }

    Logger.log(
      'Higher Timeframe Analysis'
    );

    Logger.log(
      JSON.stringify(
        result,
        null,
        2
      )
    );

    SpreadsheetApp.getUi().alert(
      'Higher TF Analysis Successful\n\n' +

      'Symbol: ' +
      result.symbol +
      '\n' +

      'Timeframe: ' +
      result.timeframe +
      '\n\n' +

      'Current Price: ' +
      result.currentPrice.toFixed(2) +
      '\n' +

      'Previous Close: ' +
      (
        result.previousClose !== null
          ? result.previousClose.toFixed(2)
          : 'N/A'
      ) +
      '\n' +

      '20 MA: ' +
      result.movingAverage.value.toFixed(2) +
      '\n' +

      'Price vs 20 MA: ' +
      result.movingAverage.pricePosition +
      '\n' +

      'Trend: ' +
      result.trend +
      '\n' +

      'Market Structure: ' +
      result.marketStructure +
      '\n\n' +

      'Candle: ' +
      result.candle.direction +
      ' / ' +
      result.candle.bodyType +
      '\n' +

      'Volume: ' +
      result.volume.volumeCondition +
      ' (' +
      result.volume.volumeRatio.toFixed(2) +
      'x)\n' +

      'Support: ' +
      (
        result.support
          ? result.support.price.toFixed(2)
          : 'None'
      ) +
      '\n' +

      'Resistance: ' +
      (
        result.resistance
          ? result.resistance.price.toFixed(2)
          : 'None'
      ) +
      '\n\n' +

      'Higher TF Context: ' +
      result.context
    );

  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'Higher TF analysis failed:\n\n' +
      error.message
    );
  }
}