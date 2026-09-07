/**
 * Master function to update both sheets sequentially.
 * Set your daily 5:00 PM trigger to run THIS function.
 */
function runAllUpdates() {
  updateTop250Stocks();
  updateShortListBuySheet();
}

/**
 * Updates "Top 250 Stocks" sheet with 20 DMA, 50 DMA, 100 DMA, 200 DMA, and CAR Rating.
 * Columns populated: B (CMP), C (20 DMA), D (50 DMA), E (100 DMA), F (200 DMA), G (Trend), H (% Diff 200), I (CAR Rating)
 */
function updateTop250Stocks() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Top 250 Stocks");
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  const dataRange = sheet.getRange(2, 1, lastRow - 1, 9);
  const data = dataRange.getValues();
  
  const allRequests = [];
  const validRowIndices = [];

  for (let i = 0; i < data.length; i++) {
    const nseCode = data[i][0];
    
    if (nseCode && nseCode.toString().trim() !== "") {
      const symbol = nseCode.toString().replace("NSE:", "").trim() + ".NS";
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`;
      
      allRequests.push({ url: url, muteHttpExceptions: true });
      validRowIndices.push(i);
    }
  }

  // Fetch in parallel batches of 30
  const BATCH_SIZE = 30;
  const responseMap = {};

  for (let i = 0; i < allRequests.length; i += BATCH_SIZE) {
    const requestBatch = allRequests.slice(i, i + BATCH_SIZE);
    const indexBatch = validRowIndices.slice(i, i + BATCH_SIZE);
    
    const responses = UrlFetchApp.fetchAll(requestBatch);
    
    for (let k = 0; k < indexBatch.length; k++) {
      responseMap[indexBatch[k]] = responses[k];
    }
    
    if (i + BATCH_SIZE < allRequests.length) {
      Utilities.sleep(100);
    }
  }

  const results = [];

  for (let i = 0; i < data.length; i++) {
    const nseCode = data[i][0];
    
    if (!nseCode || nseCode.toString().trim() === "") {
      results.push([data[i][1], data[i][2], data[i][3], data[i][4], data[i][5], data[i][6], data[i][7], data[i][8]]);
      continue;
    }
    
    try {
      const response = responseMap[i];
      if (!response || response.getResponseCode() !== 200) throw new Error("API Error");
      
      const json = JSON.parse(response.getContentText());
      const result = json.chart.result[0];
      const closePrices = result.indicators.quote[0].close;
      const highPrices = result.indicators.quote[0].high;
      
      const validCloses = closePrices.filter(p => p !== null && p !== undefined);
      const validHighs = highPrices.filter(p => p !== null && p !== undefined);
      
      if (validCloses.length < 200) {
        results.push([validCloses[validCloses.length - 1] || "N/A", "N/A", "N/A", "N/A", "N/A", "Unconfirmed", "N/A", "Short History"]);
        continue;
      }
      
      const cmp = validCloses[validCloses.length - 1];
      
      // Calculate 20, 50, 100, 200 DMAs
      const dma20 = average(validCloses.slice(-20));
      const dma50 = average(validCloses.slice(-50));
      const dma100 = average(validCloses.slice(-100));
      const dma200 = average(validCloses.slice(-200));
      
      let output = "Unconfirmed";
      if (cmp > dma50 && dma50 > dma100 && dma100 > dma200) {
        output = "In Bull Run";
      } else if (cmp < dma50 && dma50 < dma100 && dma100 < dma200) {
        output = "In Bear Run";
      }
      
      const diff200 = ((cmp - dma200) / dma200) * 100;
      
      // --- CAR Rating Logic ---
      let maxHigh = -1;
      let maxHighIndex = -1;
      for (let j = 0; j < validHighs.length; j++) {
        if (validHighs[j] > maxHigh) {
          maxHigh = validHighs[j];
          maxHighIndex = j;
        }
      }
      
      const closesSinceHigh = validCloses.slice(maxHighIndex);
      let carRating = "Avoid/Hold";
      
      if (closesSinceHigh.length < 10) {
        carRating = "Short History";
      } else {
        const cumAvgs = [];
        let sum = 0;
        for (let j = 0; j < closesSinceHigh.length; j++) {
          sum += closesSinceHigh[j];
          cumAvgs.push(sum / (j + 1));
        }
        
        const last10 = cumAvgs.slice(-10);
        const latestCumAvg = last10[last10.length - 1];
        
        let checkCount = 1;
        for (let k = 0; k < last10.length - 1; k++) {
          if (latestCumAvg > last10[k]) {
            checkCount++;
          }
        }
        
        if (checkCount === 10) {
          carRating = "Buy/Average Out";
        }
      }
      
      results.push([cmp, dma20, dma50, dma100, dma200, output, diff200, carRating]);
      
    } catch (e) {
      results.push([data[i][1], data[i][2], data[i][3], data[i][4], data[i][5], data[i][6], data[i][7], "TICKER NOT FOUND"]);
    }
  }

  // Write updated metrics (Cols B to I) back to "Top 250 Stocks"
  sheet.getRange(2, 2, results.length, 8).setValues(results);
}

/**
 * Reads "Buy/Average Out" rows from "Top 250 Stocks", calculates VWAP & 20 DMA via API,
 * and populates "Short List- Buy" with 11 columns:
 * [Stock Code, Clean Ticker, Signal, CMP, VWAP, CAR Rating, 20 DMA, Vs VWAP, Vs 20 DMA, Previous Day Status, Today's Signal]
 */
function updateShortListBuySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mainSheet = ss.getSheetByName("Top 250 Stocks");
  const buySheet = ss.getSheetByName("Short List- Buy");
  
  if (!mainSheet || !buySheet) return;
  
  const lastRow = mainSheet.getLastRow();
  if (lastRow < 2) return;
  
  // Fetch columns A through I from Top 250 Stocks
  const data = mainSheet.getRange(2, 1, lastRow - 1, 9).getValues();
  
  const buyCandidates = [];
  const requests = [];

  for (let i = 0; i < data.length; i++) {
    const rawTicker = data[i][0];
    const cmp = data[i][1];
    const dma20FromMain = data[i][2]; // 20 DMA from Top 250 Stocks sheet
    const carRating = data[i][8];
    
    if (carRating === "Buy/Average Out" && rawTicker && rawTicker.toString().trim() !== "") {
      const cleanTicker = rawTicker.toString().replace("NSE:", "").trim();
      const symbol = cleanTicker + ".NS";
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`;
      
      buyCandidates.push({
        rawTicker: rawTicker,
        cleanTicker: cleanTicker,
        cmp: cmp,
        dma20: dma20FromMain,
        carRating: carRating
      });
      requests.push({ url: url, muteHttpExceptions: true });
    }
  }

  // Fetch Yahoo Finance data for VWAP calculation
  const buyRows = [];
  if (requests.length > 0) {
    const responses = UrlFetchApp.fetchAll(requests);

    for (let i = 0; i < buyCandidates.length; i++) {
      const item = buyCandidates[i];
      let vwap = "N/A";

      try {
        const resp = responses[i];
        if (resp.getResponseCode() === 200) {
          const json = JSON.parse(resp.getContentText());
          const quotes = json.chart.result[0].indicators.quote[0];
          
          const highs = quotes.high || [];
          const lows = quotes.low || [];
          const closes = quotes.close || [];
          const volumes = quotes.volume || [];

          // Collect valid entries for the last 20 trading sessions
          let totalTPV = 0;
          let totalVol = 0;
          let count = 0;

          for (let j = closes.length - 1; j >= 0 && count < 20; j--) {
            if (closes[j] != null && highs[j] != null && lows[j] != null && volumes[j] != null && volumes[j] > 0) {
              const typicalPrice = (highs[j] + lows[j] + closes[j]) / 3;
              totalTPV += typicalPrice * volumes[j];
              totalVol += volumes[j];
              count++;
            }
          }

          if (totalVol > 0) {
            vwap = totalTPV / totalVol;
          }
        }
      } catch (e) {
        vwap = "N/A";
      }

      // Current row index in "Short List- Buy" (Header = row 1)
      const r = buyRows.length + 2;

      // Column Map:
      // B = Clean Ticker, C = Signal, D = CMP, E = VWAP, F = CAR Rating, G = 20 DMA, H = Vs VWAP, I = Vs 20 DMA, J = Prev Day Status, K = Today's Signal
      const signalColCFormula = `=IF(OR(B${r}=""),"",IF((H${r}="Above")*(I${r}="Above"), "BUY", IF((H${r}="Below")*(I${r}="Below"), "SELL", "NA")))`;
      const vsVwapFormula     = `=IF(OR(B${r}="",D${r}=""),"",IF(D${r}>=E${r},"Above","Below"))`;
      const vs20DmaFormula    = `=IF(OR(B${r}="",D${r}=""),"",IF(D${r}>=G${r},"Above","Below"))`;
      const todaysSignalFormula = `=IF(OR(B${r}="",D${r}="",J${r}=""),"",IF(AND(J${r}="Dip",H${r}="Above",I${r}="Above"),"RECLAIM - TRIGGER",IF(OR(H${r}="Below",I${r}="Below"),"DIP","NEUTRAL")))`;

      // 11 Columns:
      // A: Stock Code, B: Clean Ticker, C: Signal, D: CMP, E: VWAP, F: CAR Rating, G: 20 DMA, H: Vs VWAP, I: Vs 20 DMA, J: Previous Day Status, K: Today's Signal
      buyRows.push([
        item.rawTicker,
        item.cleanTicker,
        signalColCFormula,
        item.cmp,
        vwap,
        item.carRating,
        item.dma20,
        vsVwapFormula,
        vs20DmaFormula,
        "", // Column J (Previous Day Status) left empty for manual entry
        todaysSignalFormula
      ]);
    }
  }

  // Clear existing content in "Short List- Buy" starting from Row 2
  const buyLastRow = buySheet.getLastRow();
  const buyLastCol = buySheet.getLastColumn();
  if (buyLastRow > 1) {
    buySheet.getRange(2, 1, buyLastRow - 1, Math.max(buyLastCol, 11)).clearContent();
  }

  // Write the 11 columns to "Short List- Buy"
  if (buyRows.length > 0) {
    buySheet.getRange(2, 1, buyRows.length, 11).setValues(buyRows);
  }
}

// Menu item to trigger execution manually
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📈 Stock Tools')
    .addItem('Run All Updates', 'runAllUpdates')
    .addToUi();
}

function average(arr) {
  const sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length;
}
