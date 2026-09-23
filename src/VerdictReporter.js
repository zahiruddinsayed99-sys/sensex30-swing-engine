/**
 * Generates a beginner-friendly Hinglish Verdict Report
 * Explains in simple words why a stock is a BUY, AVERAGING, EXIT, or why it was skipped.
 */
function generateHinglishVerdictReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sigSheet = ss.getSheetByName("SIGNALS");
  const indSheet = ss.getSheetByName("INDICATORS");

  if (!sigSheet || !indSheet) {
    safeAlert("SIGNALS ya INDICATORS sheet missing hai. Pehle EOD Scan run karein.", "Verdict Report");
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
    safeAlert("SIGNALS sheet empty hai. Pehle '4. Generate EOD Signals' run karein.", "Verdict Report");
    return;
  }

  // Header Banner
  repSheet.getRange("B2:F2").merge()
    .setValue("📢 BSE 100 — DAILY HINGLISH VERDICT REPORT")
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
    const nextTranche = row[7] || "T1";
    const cmp = Number(row[8]) || 0;
    const dip = row[12];
    const trend = row[16];
    const finalSig = (row[19] || "NO_ACTION").toString();
    const reasonText = row[20] || "";

    let hinglishExplanation = "";
    let actionGuide = "";

    // 1. BUY Qualification (T1 to T4)
    if (finalSig.startsWith("BUY")) {
      if (finalSig.includes("T1")) {
        hinglishExplanation = "✅ Green Flag (T1 Fresh Entry)! 200 EMA ke upar strong uptrend hai, 20 EMA pullback test complete ho chuka hai, aur buying confirmation mil gaya hai.";
        actionGuide = "Kal subah 09:45 AM - 11:00 AM window me Zerodha me ₹4,000 slot ka fresh order lagayein.";
      } else {
        hinglishExplanation = `🔄 Averaging Dip (${finalSig})! Stock T1 se planned drawdown level par aa chuka hai. Support zone par average cost optimize karne ka mauka hai.`;
        actionGuide = `Planned Tranche (${nextTranche}) ke liye ₹4,000 allocate karein taaki average price kam ho sake.`;
      }
    }
    // 2. PROFIT TARGET HIT
    else if (finalSig === "EXIT_PROFIT") {
      hinglishExplanation = "🎯 Target Hit (+6.0% / +6.5%)! Blended cost par full target achieve ho chuka hai. Capital cycle complete!";
      actionGuide = "Poori position sell karke profit book karein aur capital next setup ke liye free karein.";
    }
    // 3. WAIT_TRIGGER
    else if (finalSig === "WAIT_TRIGGER" || finalSig === "WAIT_RECOVERY") {
      hinglishExplanation = "⏳ Support Test Chalu Hai! Stock 20 EMA zone me dip le chuka hai, par previous day high break (reversal ignition) pending hai.";
      actionGuide = "Watchlist par rakhein. Reversal confirmation candle aane tak wait karein.";
    }
    // 4. PORTFOLIO FULL
    else if (finalSig === "PORTFOLIO_FULL") {
      hinglishExplanation = "💼 Max Portfolio Limit (6 Stocks Full)! System me already 6 distinct open stocks chal rahe hain.";
      actionGuide = "Jab tak purani positions me se profit book (+6%) nahi hota, naye stocks me T1 entry blocked rahegi.";
    }
    // 5. MAX TRANCHES REACHED
    else if (finalSig === "HOLD_MAX") {
      hinglishExplanation = "🛑 All 4 Tranches Full! Is stock me max 4 slots (₹16,000) allocate ho chuke hain. Strict risk discipline.";
      actionGuide = "Aage koi fresh buy nahi karna hai. Target bounce (+6%) ka wait karein.";
    }
    // 6. QUARANTINED
    else if (finalSig === "QUARANTINED") {
      hinglishExplanation = "⚠️ Quarantine Cutoff (-20%)! Stock initial entry se -20% se zyada slip ho chuka hai. System ne further buying freeze kar di hai.";
      actionGuide = "Strict discipline: Loss averaging band hai. Position quarantine me freeze rahegi.";
    }
    // 7. HOLD (Active Position in Range)
    else if (finalSig === "HOLD") {
      hinglishExplanation = `🧘 Active Position In-Play. Current price tranche averaging zone aur target ke beech oscillate kar raha hai. (${reasonText})`;
      actionGuide = "Position hold rakhein. Target (+6%) ya next lower tranche trigger ka wait karein.";
    }
    // 8. NO_ACTION / SKIPPED
    else {
      if (trend === "FAIL") {
        hinglishExplanation = "❌ Structural Trend Weak (200 EMA ke neeche). Stock long-term downtrend me hai. Counter-trend buy lena mana hai.";
        actionGuide = "Avoid karein. Strong trending stocks par focus rahega.";
      } else if (dip === "FAIL") {
        hinglishExplanation = "⏸️ No Dip Setup. Stock 200 EMA ke upar hai par abhi apne 20 EMA support zone se dur chal raha hai.";
        actionGuide = "Chasing/FOMO buy avoid karein. Pullback aane ka wait karein.";
      } else {
        hinglishExplanation = "⏸️ Conditions Unmatched. " + reasonText;
        actionGuide = "No trade. Setup qualify nahi hua.";
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
  repSheet.setColumnWidth(2, 130);
  repSheet.setColumnWidth(3, 110);
  repSheet.setColumnWidth(4, 150);
  repSheet.setColumnWidth(5, 430);
  repSheet.setColumnWidth(6, 280);

  safeAlert("📢 Hinglish Verdict Report Ready!\n\n'VERDICT_REPORT' tab par check karein.", "Verdict Report");
}