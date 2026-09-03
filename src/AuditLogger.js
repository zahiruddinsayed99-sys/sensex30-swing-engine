/**
 * Append system activities and run-times to the SYSTEM_AUDIT tab
 */
function logAudit(funcName, action, status, recordsProcessed, result, error, execTimeMs) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("SYSTEM_AUDIT");
    if (!sheet) return;

    sheet.appendRow([
      new Date(),
      Session.getActiveUser().getEmail() || "System",
      funcName,
      action,
      status,
      recordsProcessed || 0,
      result || "",
      error || "",
      execTimeMs || 0
    ]);
  } catch (e) {
    Logger.log("Failed to write audit log: " + e.message);
  }
}