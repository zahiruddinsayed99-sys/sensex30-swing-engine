/**
 * Hedge Engine — 3-Tier SENSEXIETF Defensive Strategy
 * Evaluates conditions for index hedging when equity opportunities are scarce.
 */

function evaluateSensexEtfHedge(stockQualifiedCount, openHedgePositions, availableCash) {
  if (!CONFIG.HEDGE || !CONFIG.HEDGE.ENABLED) {
    Logger.log("[HedgeEngine] Hedge is disabled in CONFIG.");
    return [];
  }

  const hedgeActions = [];

  // 1. Liquidity-Contingent Rotation Override
  if (stockQualifiedCount >= 2 && availableCash < CONFIG.HEDGE.SLOT_BUDGET) {
    if (openHedgePositions && openHedgePositions.length > 0) {
      openHedgePositions.forEach(pos => {
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
      Logger.log(`[HedgeEngine] Liquidity rotation triggered: Selling ${hedgeActions.length} hedge tranches.`);
      return hedgeActions;
    }
  }

  // 2. Fetch SENSEXIETF Data
  const etfData = fetchSensexEtfData(CONFIG.HEDGE.TICKER);
  if (!etfData || !etfData.cmp) {
    Logger.log("[HedgeEngine] WARNING: SENSEXIETF data not available or incomplete.");
    return hedgeActions;
  }

  const cmp = etfData.cmp;
  const high20D = etfData.high20D;
  const closeT1 = etfData.closeT1;
  const vwap = etfData.vwap;

  const indexDipPct = ((high20D - cmp) / high20D) * 100;
  Logger.log(`[HedgeEngine] CMP: ₹${cmp} | 20D High: ₹${high20D} | Dip: ${indexDipPct.toFixed(2)}% | Qualified Stocks: ${stockQualifiedCount}`);

  const activeTrancheIds = new Set();

  // 3. FIFO Tranche-wise Profit Harvest (+4.0%)
  if (openHedgePositions && openHedgePositions.length > 0) {
    openHedgePositions.forEach(pos => {
      if (pos.status === "OPEN" || pos.status === "ACTIVE") {
        const trancheBuyPrice = Number(pos.buyPrice);
        activeTrancheIds.add(pos.trancheId || pos.tranche);

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

  // 4. Activation Gate: Only evaluate BUY entry when stockQualifiedCount === 0
  if (stockQualifiedCount === 0) {
    const tiers = CONFIG.HEDGE.TIERS;
    let selectedTier = null;
    let rankScore = 0;

    // Check H3 (>= 5.0% dip)
    const h3 = tiers.find(t => t.id === "H3");
    if (h3 && !activeTrancheIds.has("H3") && indexDipPct >= h3.dipPct && etfData.isPivotBounce) {
      selectedTier = h3;
      rankScore = 90;
    }

    // Check H2 (>= 3.5% dip)
    if (!selectedTier) {
      const h2 = tiers.find(t => t.id === "H2");
      if (h2 && !activeTrancheIds.has("H2") && indexDipPct >= h2.dipPct && cmp >= vwap) {
        selectedTier = h2;
        rankScore = 80;
      }
    }

    // Check H1 (>= 1.5% dip)
    if (!selectedTier) {
      const h1 = tiers.find(t => t.id === "H1");
      if (h1 && !activeTrancheIds.has("H1") && indexDipPct >= h1.dipPct && cmp >= closeT1) {  
        selectedTier = h1;
        rankScore = 70;
      }
    }

    if (selectedTier) {
      const buyAmount = cmp * selectedTier.shares;
      if (availableCash >= buyAmount || availableCash >= CONFIG.HEDGE.SLOT_BUDGET) {
        hedgeActions.push({
          symbol: CONFIG.HEDGE.SYMBOL,
          actionType: "BUY_HEDGE",
          tranche: selectedTier.id,
          assetType: "INDEX_ETF",
          slotAmount: Math.min(buyAmount, CONFIG.HEDGE.MAX_SLOT_BUDGET),
          rank: 1,
          rankScore: rankScore,
          signalId: "HEDGE_ENTRY_" + selectedTier.id,
          validity: "EOD",
          actionStatus: "PENDING_EXECUTION",
          qty: selectedTier.shares
        });
        Logger.log(`[HedgeEngine] Triggered BUY for ${selectedTier.id} (${selectedTier.shares} shares @ ₹${cmp})`);
      } else {
        Logger.log(`[HedgeEngine] Insufficient cash for Hedge Buy: Available ₹${availableCash}`);
      }
    } else {
      Logger.log(`[HedgeEngine] No Hedge Tier met dip/rebound criteria (Index Dip: ${indexDipPct.toFixed(2)}%)`);
    }
  }

  return hedgeActions;
}

function fetchSensexEtfData(ticker) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1mo`;
    const options = { 
      muteHttpExceptions: true,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    };
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());

    if (json.chart && json.chart.result && json.chart.result.length > 0) {
      const result = json.chart.result[0];
      const indicators = result.indicators.quote[0];

      const closes = indicators.close;
      const highs = indicators.high;
      const lows = indicators.low;

      const validData = [];
      for (let i = 0; i < closes.length; i++) {
        if (closes[i] != null && highs[i] != null && lows[i] != null) {
          validData.push({
            close: Number(closes[i].toFixed(2)),
            high: Number(highs[i].toFixed(2)),
            low: Number(lows[i].toFixed(2))
          });
        }
      }

      if (validData.length >= 2) {
        const lastIndex = validData.length - 1;
        const currentData = validData[lastIndex];
        const prevData = validData[lastIndex - 1];

        const cmp = currentData.close;
        const closeT1 = prevData.close;
        const typicalPrice = Number(((currentData.high + currentData.low + currentData.close) / 3).toFixed(2));

        const lookbackWindow = validData.slice(Math.max(0, validData.length - 20));
        let high20D = -1;
        lookbackWindow.forEach(d => {
          if (d.high > high20D) high20D = d.high;
        });

        const isPivotBounce = (cmp >= prevData.high || cmp >= closeT1);

        return {
          cmp: cmp,
          high20D: high20D,
          closeT1: closeT1,
          vwap: typicalPrice,
          isPivotBounce: isPivotBounce
        };
      }
    }
  } catch (err) {
    Logger.log("[HedgeEngine] Fetch Error: " + err.message);
  }

  return null;
}
