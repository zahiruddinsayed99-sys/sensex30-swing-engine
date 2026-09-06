/**
 * Hedge Engine — 3-Tier SENSEXIETF Defensive Strategy
 * Evaluates conditions for index hedging when equity opportunities are scarce.
 */

/**
 * Evaluates the SENSEX ETF Hedge criteria and generates corresponding ACTION_QUEUE entries.
 *
 * @param {number} stockQualifiedCount Number of equity buy candidates.
 * @param {Array} openHedgePositions List of open hedge positions from HEDGE_POSITIONS tab.
 * @param {number} availableCash Available capital for execution.
 * @returns {Array} List of actions (buys/sells) to append to the ACTION_QUEUE.
 */
function evaluateSensexEtfHedge(stockQualifiedCount, openHedgePositions, availableCash) {
  if (!CONFIG.HEDGE || !CONFIG.HEDGE.ENABLED) {
    return [];
  }

  const hedgeActions = [];

  // Liquidity-Contingent Rotation Override
  // If stockQualifiedCount >= 2 AND availableCash < 4000, emit SELL_HEDGE_ALL to liberate capital for equity entries.
  if (stockQualifiedCount >= 2 && availableCash < CONFIG.HEDGE.SLOT_BUDGET) {
    if (openHedgePositions && openHedgePositions.length > 0) {
      openHedgePositions.forEach(pos => {
        // Only sell if position is OPEN
        if (pos.status === "OPEN" || pos.status === "ACTIVE") {
          hedgeActions.push({
            symbol: CONFIG.HEDGE.SYMBOL,
            actionType: "SELL_HEDGE_ALL",
            tranche: pos.trancheId || pos.tranche,
            assetType: "INDEX_ETF",
            slotAmount: 0,
            rank: 0,
            rankScore: 0,
            signalId: "HEDGE_LIQUIDATION",
            validity: "EOD",
            actionStatus: "PENDING_EXECUTION"
          });
        }
      });
      return hedgeActions; // Priority exit
    }
  }

  // Fetch SENSEXIETF Data
  const etfData = fetchSensexEtfData(CONFIG.HEDGE.TICKER);
  if (!etfData || !etfData.cmp) {
    return hedgeActions;
  }

  const cmp = etfData.cmp;
  const high20D = etfData.high20D;
  const closeT1 = etfData.closeT1; // Previous session close
  const vwap = etfData.vwap;

  const indexDipPct = ((high20D - cmp) / high20D) * 100;

  // Track existing open tranches by ID to avoid duplicate re-buys
  const activeTrancheIds = new Set();

  // FIFO Tranche-wise Profit Harvest (+4.0%):
  if (openHedgePositions && openHedgePositions.length > 0) {
    openHedgePositions.forEach(pos => {
      if (pos.status === "OPEN" || pos.status === "ACTIVE") {
        const trancheBuyPrice = Number(pos.buyPrice);
        activeTrancheIds.add(pos.trancheId || pos.tranche);

        // If CMP >= Tranche Buy Price * 1.04, emit SELL_HEDGE_TRANCHE
        if (trancheBuyPrice && cmp >= (trancheBuyPrice * (1 + (CONFIG.HEDGE.TARGET_PROFIT_PCT / 100)))) {
          hedgeActions.push({
            symbol: CONFIG.HEDGE.SYMBOL,
            actionType: "SELL_HEDGE_TRANCHE",
            tranche: pos.trancheId || pos.tranche,
            assetType: "INDEX_ETF",
            slotAmount: 0,
            rank: 0,
            rankScore: 0,
            signalId: "HEDGE_PROFIT_" + (pos.trancheId || pos.tranche),
            validity: "EOD",
            actionStatus: "PENDING_EXECUTION"
          });
        }
      }
    });
  }

  // Activation Gate: Only evaluate for new entries when stockQualifiedCount === 0.
  if (stockQualifiedCount === 0) {
    // Evaluate Staged Accumulator (H1/H2/H3)
    const tiers = CONFIG.HEDGE.TIERS;
    let selectedTier = null;
    let rankScore = 0;

    // Check H3 first (highest priority)
    const h3 = tiers.find(t => t.id === "H3");
    if (h3 && !activeTrancheIds.has("H3") && indexDipPct >= h3.dipPct && etfData.isPivotBounce) {
      selectedTier = h3;
      rankScore = 90; // High conviction
    }

    // Check H2 next
    if (!selectedTier) {
      const h2 = tiers.find(t => t.id === "H2");
      if (h2 && !activeTrancheIds.has("H2") && indexDipPct >= h2.dipPct && cmp > vwap) {
        selectedTier = h2;
        rankScore = 80;
      }
    }

    // Check H1
    if (!selectedTier) {
      const h1 = tiers.find(t => t.id === "H1");
      if (h1 && !activeTrancheIds.has("H1") && indexDipPct >= h1.dipPct && cmp >= closeT1) {
        selectedTier = h1;
        rankScore = 70;
      }
    }

    if (selectedTier) {
      // Estimated slot amount for hedge
      const buyAmount = cmp * selectedTier.shares;
      if (availableCash >= buyAmount || availableCash >= CONFIG.HEDGE.SLOT_BUDGET) {
        hedgeActions.push({
          symbol: CONFIG.HEDGE.SYMBOL,
          actionType: "BUY_HEDGE",
          tranche: selectedTier.id,
          assetType: "INDEX_ETF",
          slotAmount: Math.min(buyAmount, CONFIG.HEDGE.MAX_SLOT_BUDGET), // Roughly
          rank: 1, // High priority when stockQualifiedCount === 0
          rankScore: rankScore,
          signalId: "HEDGE_ENTRY_" + selectedTier.id,
          validity: "EOD",
          actionStatus: "PENDING_EXECUTION",
          qty: selectedTier.shares // passing qty for execution layer
        });
      }
    }
  }

  return hedgeActions;
}

/**
 * Fetches recent market data for SENSEXIETF to compute 20D High, VWAP, and previous close.
 * Uses the existing Yahoo Finance integration pattern from DataIngestion.js if available.
 *
 * @param {string} ticker
 * @returns {Object} { cmp, high20D, closeT1, vwap, isPivotBounce }
 */
function fetchSensexEtfData(ticker) {
  // Try to use DataIngestion's fetchYahooFinanceData method if it exists
  try {
    const lookbackDays = 30; // Fetch 30 days to compute 20D high
    const today = new Date();
    const period2 = Math.floor(today.getTime() / 1000);
    const startDate = new Date();
    startDate.setDate(today.getDate() - lookbackDays);
    const period1 = Math.floor(startDate.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d`;

    const options = { muteHttpExceptions: true };
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());

    if (json.chart && json.chart.result && json.chart.result.length > 0) {
      const result = json.chart.result[0];
      const indicators = result.indicators.quote[0];

      const closes = indicators.close;
      const highs = indicators.high;
      const volumes = indicators.volume;
      const lows = indicators.low;

      // Filter out nulls
      const validData = [];
      for (let i = 0; i < closes.length; i++) {
        if (closes[i] !== null && highs[i] !== null && lows[i] !== null) {
          validData.push({
            close: closes[i],
            high: highs[i],
            low: lows[i],
            volume: volumes[i]
          });
        }
      }

      if (validData.length >= 2) {
        const lastIndex = validData.length - 1;
        const currentData = validData[lastIndex];
        const prevData = validData[lastIndex - 1];

        const cmp = currentData.close;
        const closeT1 = prevData.close;

        // VWAP approximation for the day (Typical Price)
        const typicalPrice = (currentData.high + currentData.low + currentData.close) / 3;
        const vwap = typicalPrice; // Simplified daily VWAP

        // 20-day high
        const lookbackWindow = validData.slice(Math.max(0, validData.length - 20));
        let high20D = -1;
        lookbackWindow.forEach(d => {
          if (d.high > high20D) high20D = d.high;
        });

        // Pivot Bounce logic: CMP > previous high after a downtrend, or simplified as CMP > Open & CMP > Low
        const isPivotBounce = (cmp > prevData.high && cmp > closeT1);

        return {
          cmp: cmp,
          high20D: high20D,
          closeT1: closeT1,
          vwap: vwap,
          isPivotBounce: isPivotBounce
        };
      }
    }
  } catch (err) {
    console.error("Failed to fetch SENSEXIETF data: " + err.message);
  }

  return null;
}
