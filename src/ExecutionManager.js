/**
 * Execution Manager — Handles Morning Execution Window (09:45 - 11:00 AM)
 * Implements HITL workflow: Manual Zerodha execution -> Sheet position update
 */

/**
 * Validates Action Queue and logs start of the execution window
 */
function startExecutionSession() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const queueSheet = ss.getSheetByName("ACTION_QUEUE");

    if (!queueSheet || queueSheet.getLastRow() < 2) {
        SpreadsheetApp.getUi().alert("Action Queue is empty. No orders pending for today.");
        return;
    }

    const queueData = queueSheet.getDataRange().getValues();
    let pendingCount = 0;

    for (let i = 1; i < queueData.length; i++) {
        if (queueData[i][9] === "READY") {
            pendingCount++;
        }
    }

    logAudit("startExecutionSession", "EXECUTION_WINDOW_OPEN", "SUCCESS", pendingCount, pendingCount + " candidates ready for manual Zerodha execution", "", 0);

    SpreadsheetApp.getUi().alert(
        "🔔 Morning Execution Session (09:45 - 11:00 AM)\n\n" +
        "Pending Orders in Queue: " + pendingCount + "\n\n" +
        "Workflow:\n" +
        "1. Review candidates in 'ACTION_QUEUE'.\n" +
        "2. Execute orders manually in Zerodha (₹4,000 slot per stock).\n" +
        "3. Run 'Complete Executed Trade' from menu to enter actual Qty & Price."
    );
}

/**
 * Modal prompt to enter broker executed details and update positions
 */
function completeExecutedTrade() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    const queueSheet = ss.getSheetByName("ACTION_QUEUE");
    const posSheet = ss.getSheetByName("POSITIONS");
    const logSheet = ss.getSheetByName("TRADE_LOG");

    if (!queueSheet || !posSheet || !logSheet) return;

    const queueData = queueSheet.getDataRange().getValues();
    const readyRows = [];

    for (let i = 1; i < queueData.length; i++) {
        if (queueData[i][9] === "READY") {
            readyRows.push({
                rowIndex: i + 1,
                symbol: queueData[i][1],
                actionType: queueData[i][2],
                tranche: queueData[i][3],
                signalId: queueData[i][7]
            });
        }
    }

    if (readyRows.length === 0) {
        ui.alert("No pending 'READY' orders found in ACTION_QUEUE.");
        return;
    }

    // 1. Ask user which symbol was executed
    const symbolList = readyRows.map(r => r.symbol + " (" + r.tranche + ")").join(", ");
    const symPrompt = ui.prompt(
        "Complete Trade Confirmation",
        "Available in Queue: " + symbolList + "\n\nEnter Symbol executed (e.g. " + readyRows[0].symbol + "):",
        ui.ButtonSet.OK_CANCEL
    );

    if (symPrompt.getSelectedButton() !== ui.Button.OK) return;
    const inputSymbol = symPrompt.getResponseText().trim().toUpperCase();

    const selectedTarget = readyRows.find(r => r.symbol === inputSymbol);
    if (!selectedTarget) {
        ui.alert("Symbol '" + inputSymbol + "' is not marked READY in today's Action Queue.");
        return;
    }

    // 2. Ask user for Actual Executed Quantity
    const qtyPrompt = ui.prompt("Zerodha Execution", "Enter actual executed Quantity for " + inputSymbol + ":", ui.ButtonSet.OK_CANCEL);
    if (qtyPrompt.getSelectedButton() !== ui.Button.OK) return;
    const actualQty = parseInt(qtyPrompt.getResponseText().trim());
    if (isNaN(actualQty) || actualQty <= 0) {
        ui.alert("Invalid quantity. Trade cancelled.");
        return;
    }

    // 3. Ask user for Actual Executed Price
    const pricePrompt = ui.prompt("Zerodha Execution", "Enter actual execution Price (₹) for " + inputSymbol + ":", ui.ButtonSet.OK_CANCEL);
    if (pricePrompt.getSelectedButton() !== ui.Button.OK) return;
    const actualPrice = parseFloat(pricePrompt.getResponseText().trim());
    if (isNaN(actualPrice) || actualPrice <= 0) {
        ui.alert("Invalid price. Trade cancelled.");
        return;
    }

    const grossValue = Number((actualQty * actualPrice).toFixed(2));
    const now = new Date();
    const dateStr = Utilities.formatDate(now, "Asia/Kolkata", "yyyy-MM-dd");
    const timeStr = Utilities.formatDate(now, "Asia/Kolkata", "HH:mm:ss");
    const execId = "EXEC-" + Utilities.formatDate(now, "Asia/Kolkata", "yyyyMMdd-HHmmss") + "-" + inputSymbol;

    // 4. Append to TRADE_LOG
    logSheet.appendRow([
        execId,
        dateStr,
        timeStr,
        inputSymbol,
        selectedTarget.actionType,
        selectedTarget.tranche,
        actualQty,
        actualPrice,
        grossValue,
        "ZERODHA_MANUAL",
        selectedTarget.signalId,
        "CONFIRMED_HITL",
        "Slot executed"
    ]);

    // 5. Update or create row in POSITIONS tab
    const posData = posSheet.getDataRange().getValues();
    let existingRow = -1;

    for (let p = 1; p < posData.length; p++) {
        if (posData[p][0] === inputSymbol && posData[p][1] === "OPEN") {
            existingRow = p + 1;
            break;
        }
    }

    if (existingRow === -1) {
        // New Position (T1)
        posSheet.appendRow([
            inputSymbol,
            "OPEN",
            "T1",
            1,
            grossValue,
            actualQty,
            actualPrice,
            actualPrice,
            "0.00%",
            "ACTIVE",
            dateStr,
            "T2"
        ]);
    } else {
        // Averaging into existing position (T2 -> T5)
        const curSlots = Number(posSheet.getRange(existingRow, 4).getValue()) || 1;
        const curInvested = Number(posSheet.getRange(existingRow, 5).getValue()) || 0;
        const curQty = Number(posSheet.getRange(existingRow, 6).getValue()) || 0;

        const newSlots = curSlots + 1;
        const newInvested = curInvested + grossValue;
        const newQty = curQty + actualQty;
        const newAvgPrice = Number((newInvested / newQty).toFixed(2));
        const nextTrancheStr = newSlots < CONFIG.MAX_TRANCHES_PER_STOCK ? "T" + (newSlots + 1) : "MAXED";

        posSheet.getRange(existingRow, 3).setValue("T" + newSlots); // Current Tranche
        posSheet.getRange(existingRow, 4).setValue(newSlots);       // Slots Used
        posSheet.getRange(existingRow, 5).setValue(newInvested);    // Total Invested
        posSheet.getRange(existingRow, 6).setValue(newQty);         // Quantity
        posSheet.getRange(existingRow, 7).setValue(newAvgPrice);    // Blended Avg Price
        posSheet.getRange(existingRow, 11).setValue(dateStr);       // Last Buy Date
        posSheet.getRange(existingRow, 12).setValue(nextTrancheStr);// Next Tranche
    }

    // 6. Mark ACTION_QUEUE row as COMPLETED
    queueSheet.getRange(selectedTarget.rowIndex, 10).setValue("COMPLETED");
    queueSheet.getRange(selectedTarget.rowIndex, 11).setValue("CONFIRMED");
    queueSheet.getRange(selectedTarget.rowIndex, 12).setValue(execId);

    logAudit("completeExecutedTrade", "TRADE_CONFIRMED", "SUCCESS", 1, inputSymbol + " " + selectedTarget.tranche + " confirmed @ ₹" + actualPrice, "", 0);

    ui.alert("✅ Trade Confirmed & Position Updated!\n\nSymbol: " + inputSymbol + "\nAction: " + selectedTarget.tranche + "\nQty: " + actualQty + " @ ₹" + actualPrice + "\nGross: ₹" + grossValue);
}