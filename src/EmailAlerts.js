/**
 * Automated EOD Email Alert Dispatcher
 * Sends a structured morning execution digest for BUY & EXIT signals.
 */
function sendEODSignalAlert() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sigSheet = ss.getSheetByName("SIGNALS");

    if (!sigSheet) {
        Logger.log("SIGNALS sheet not found.");
        return;
    }

    const sigData = sigSheet.getDataRange().getValues();
    if (sigData.length < 2) {
        Logger.log("No signal data to evaluate.");
        return;
    }

    const buyActions = [];
    const exitActions = [];

    for (let i = 1; i < sigData.length; i++) {
        const row = sigData[i];
        const sym = row[4];
        const cmp = Number(row[9]) || 0;
        const tranche = row[8] || "T1";
        const signal = (row[19] || "").toString();
        const reason = row[20] || "";

        if (signal.startsWith("BUY")) {
            buyActions.push({ symbol: sym, cmp: cmp, tranche: tranche, signal: signal, reason: reason });
        } else if (signal === "EXIT_PROFIT") {
            exitActions.push({ symbol: sym, cmp: cmp, signal: signal, reason: reason });
        }
    }

    if (buyActions.length === 0 && exitActions.length === 0) {
        Logger.log("No BUY or EXIT actions today. Email alert skipped.");
        return;
    }

    const recipientEmail = Session.getActiveUser().getEmail();
    const dateStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "dd MMM yyyy");
    const subject = `🎯 [SENSEX 100 EOD] ${buyActions.length} BUY | ${exitActions.length} EXIT Signals — ${dateStr}`;

    let html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px;">
    <div style="text-align: center; padding-bottom: 15px; border-bottom: 2px solid #0284C7;">
      <h2 style="margin: 0; color: #0F172A; font-size: 20px;">SENSEX 100 SWING TRADING SYSTEM</h2>
      <p style="margin: 4px 0 0 0; color: #64748B; font-size: 13px;">Daily Action Queue Digest — ${dateStr}</p>
    </div>

    <div style="margin-top: 15px; padding: 12px; background-color: #EFF6FF; border-left: 4px solid #2563EB; border-radius: 4px;">
      <p style="margin: 0; font-size: 13px; color: #1E40AF;">
        <strong>Execution Window:</strong> Tomorrow <strong>09:45 AM – 11:00 AM IST</strong>. Max ₹4,000 per slot.
      </p>
    </div>
  `;

    if (exitActions.length > 0) {
        html += `
      <h3 style="color: #059669; font-size: 15px; margin: 20px 0 8px 0;">🎯 Profit Target Hits (+6.0%)</h3>
      <table style="width: 100%; border-collapse: collapse; background: #FFFFFF; border-radius: 6px; overflow: hidden; border: 1px solid #D1FAE5;">
        <tr style="background-color: #059669; color: #FFFFFF; font-size: 12px; text-align: left;">
          <th style="padding: 8px 12px;">Symbol</th>
          <th style="padding: 8px 12px;">CMP</th>
          <th style="padding: 8px 12px;">Action</th>
        </tr>`;
        exitActions.forEach(item => {
            html += `
        <tr style="border-bottom: 1px solid #E2E8F0; font-size: 13px;">
          <td style="padding: 10px 12px; font-weight: bold; color: #0F172A;">${item.symbol}</td>
          <td style="padding: 10px 12px; color: #334155;">₹${item.cmp.toFixed(2)}</td>
          <td style="padding: 10px 12px; color: #059669; font-weight: bold;">SELL 100% (Book Target)</td>
        </tr>`;
        });
        html += `</table>`;
    }

    if (buyActions.length > 0) {
        html += `
      <h3 style="color: #0284C7; font-size: 15px; margin: 20px 0 8px 0;">🛒 Qualified Buy / Averaging Queue</h3>
      <table style="width: 100%; border-collapse: collapse; background: #FFFFFF; border-radius: 6px; overflow: hidden; border: 1px solid #BAE6FD;">
        <tr style="background-color: #0284C7; color: #FFFFFF; font-size: 12px; text-align: left;">
          <th style="padding: 8px 12px;">Symbol</th>
          <th style="padding: 8px 12px;">CMP</th>
          <th style="padding: 8px 12px;">Signal</th>
          <th style="padding: 8px 12px;">Slot Size</th>
        </tr>`;
        buyActions.forEach(item => {
            html += `
        <tr style="border-bottom: 1px solid #E2E8F0; font-size: 13px;">
          <td style="padding: 10px 12px; font-weight: bold; color: #0F172A;">${item.symbol}</td>
          <td style="padding: 10px 12px; color: #334155;">₹${item.cmp.toFixed(2)}</td>
          <td style="padding: 10px 12px; color: #2563EB; font-weight: bold;">${item.signal}</td>
          <td style="padding: 10px 12px; color: #0F172A;">₹4,000</td>
        </tr>`;
        });
        html += `</table>`;
    }

    html += `
    <div style="margin-top: 25px; font-size: 11px; color: #94A3B8; text-align: center;">
      Automated alert from SENSEX 100 Trading Engine. Do not reply to this email.
    </div>
  </div>`;

    MailApp.sendEmail({
        to: recipientEmail,
        subject: subject,
        htmlBody: html
    });

    Logger.log(`Alert email successfully sent to ${recipientEmail}`);
}