/**
 * Generates a beginner-friendly Hinglish Verdict Report
 * Explains in simple words why a stock is a BUY or why it was rejected.
 */
function generateHinglishVerdictReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sigSheet = ss.getSheetByName("SIGNALS");
  const indSheet = ss.getSheetByName("INDICATORS");

  if (!sigSheet || !indSheet) {
    SpreadsheetApp.getUi().alert("SIGNALS ya INDICATORS sheet missing hai. Pehle EOD Scan run karein.");
    return;
  }

  let repSheet = ss.getSheetByName("VERDICT_REPORT");
  if (!repSheet) {
    repSheet = ss.insertSheet("VERDICT_REPORT");
  } else {
    repSheet.clear();
  }

  const sigData = sigSheet.getDataRange().getValues();
  if (sigData.length < 2) {
    SpreadsheetApp.getUi().alert("SIGNALS sheet empty hai.");
    return;
  }

  // Header Banner
  repSheet.getRange("B2:F2").merge()
    .setValue("📢 SENSEX 30 — DAILY HINGLISH VERDICT REPORT")
    .setFontWeight("bold").setFontSize(13)
    .setBackground("#2c3e50").setFontColor("#ffffff")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  repSheet.setRowHeight(2, 36);

  const headers = ["Symbol", "CMP (₹)", "Status / Signal", "Simple Hinglish Verdict (Kyu aur Kya karein?)", "Action Guide"];
  repSheet.getRange("B4:F4").setValues([headers])
    .setFontWeight("bold").setBackground("#34495e").setFontColor("#ffffff")
    .setHorizontalAlignment("center");

  const reportRows = [];

  for (let i = 1; i < sigData.length; i++) {
    const row = sigData[i];
    const sym = row[4];
    const cmp = row[8];
    const dip = row[12];
    const recovery = row[13];
    const dma20Rec = row[14];
    const vwapRec = row[15];
    const trend = row[16];
    const finalSig = row[19];

    let hinglishExplanation = "";
    let actionGuide = "";

    // 1. BUY Qualification
    if (finalSig.toString().startsWith("BUY")) {
      hinglishExplanation = "✅ Green Flag! Trend strong hai, 5% ka badhiya discount mila, recovery shuru ho chuki hai, aur stock ne 20 DMA + VWAP dono ko reclaim kar liya hai.";
      actionGuide = "Kal 09:45 AM - 11:00 AM window me Zerodha me ₹4,000 slot ka order place karein.";
    } 
    // 2. WAIT_RECLAIM
    else if (finalSig === "WAIT_RECLAIM") {
      if (dma20Rec === "FAIL" && vwapRec === "FAIL") {
        hinglishExplanation = "⏳ Discount aur recovery toh aa gayi hai, par stock abhi 20 DMA aur VWAP dono ke neeche atka hua hai. Buyer strength aana baaki hai.";
      } else if (dma20Rec === "FAIL") {
        hinglishExplanation = "⏳ Setup lagbhag ready hai! Bas 20 DMA ke upar closing nahi mili hai.";
      } else {
        hinglishExplanation = "⏳ 20 DMA toh paar kar liya, par intraday benchmark (VWAP) ke neeche close hua hai.";
      }
      actionGuide = "Radar par rakhein. Kal agar breakout deta hai toh signal generate ho sakta hai.";
    } 
    // 3. WAIT_RECOVERY
    else if (finalSig === "WAIT_RECOVERY") {
      hinglishExplanation = "🔪 Falling Knife! Stock 5% se zyada gir chuka hai, par abhi tak sambhla nahi hai (koi recovery sign nahi mila).";
      actionGuide = "Bilkul hath na lagayein! Jab tak bottom ban kar curve upar na ghume, wait karein.";
    } 
    // 4. MAXED or QUARANTINED
    else if (finalSig === "MAXED") {
      hinglishExplanation = "🛑 Slot Full! Is stock ke 5 tranches (₹20,000 max) poore ho chuke hain.";
      actionGuide = "No more buying. Purane positions ka target (+6.5%) wait karein.";
    } else if (finalSig === "QUARANTINED") {
      hinglishExplanation = "⚠️ Red Alert! Position -20% se zyada down hai. System ne isme loss averaging freeze kar di hai.";
      actionGuide = "Capital safe rakhne ke liye averaging band hai. Position hold rahegi.";
    } 
    // 5. NO_ACTION
    else {
      if (trend === "FAIL" && dip === "FAIL") {
        hinglishExplanation = "❌ Trend kamzor hai (50 DMA ke neeche ya 20 DMA gir raha hai) aur koi discount bhi nahi hai.";
        actionGuide = "No trade. Setup nahi bana.";
      } else if (trend === "FAIL") {
        hinglishExplanation = "❌ Downward Trend! Stock gir toh raha hai, par 50 DMA ke neeche hai. Trend ke against trade lena risky hai.";
        actionGuide = "Avoid karein. Strong trend wale stocks par focus rahega.";
      } else if (dip === "FAIL") {
        hinglishExplanation = "⏸️ Price High hai! Stock strong uptrend me hai lekin apne peak ke paas hai. 5% ka discount nahi mila hai.";
        actionGuide = "Wait karein. High prices par FOMO me buy nahi karna hai.";
      } else {
        hinglishExplanation = "⏸️ Market conditions favorable nahi hain. Entry rules satisfy nahi huye.";
        actionGuide = "Patience rakhein. Cash preserve karna hi best trade hai.";
      }
    }

    reportRows.push([sym, cmp, finalSig, hinglishExplanation, actionGuide]);
  }

  repSheet.getRange(5, 2, reportRows.length, reportRows[0].length).setValues(reportRows);

  // Formatting & Styling
  repSheet.getRange(5, 2, reportRows.length, 1).setFontWeight("bold").setHorizontalAlignment("center");
  repSheet.getRange(5, 3, reportRows.length, 1).setHorizontalAlignment("right").setNumberFormat("₹#,##0.00");
  repSheet.getRange(5, 4, reportRows.length, 1).setFontWeight("bold").setHorizontalAlignment("center");
  repSheet.getRange(5, 5, reportRows.length, 2).setWrap(true);

  repSheet.setColumnWidth(1, 20);
  repSheet.setColumnWidth(2, 130); // Symbol
  repSheet.setColumnWidth(3, 100); // CMP
  repSheet.setColumnWidth(4, 140); // Status
  repSheet.setColumnWidth(5, 420); // Hinglish Verdict
  repSheet.setColumnWidth(6, 260); // Action Guide

  SpreadsheetApp.getUi().alert("📢 Hinglish Verdict Report Ready!\n\n'VERDICT_REPORT' tab par check karein.");
}
