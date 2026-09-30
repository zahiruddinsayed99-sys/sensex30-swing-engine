/**
 * Swing Trading System V1
 * Main entry points
 */

/**
 * Adds the Swing Trading System menu when the spreadsheet opens.
 */
/**
 * Adds the Swing Trading System menu
 * when the spreadsheet opens.
 *
 * Only verified/current workflow actions
 * are exposed to the user.
 */
function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu('Swing Trading System')
        .addItem(
            'Test Settings',
            'testSettings'
        )
        .addItem('Test Yahoo Data', 'runDataTest')
        .addItem('Run Analysis', 'runAnalysis')
        .addItem(
            'Test Decision Engine',
            'runDecisionEngineTest'
        )
        .addItem(
            'Test Potential Trade',
            'runPotentialTradeTest'
        )
        .addToUi();
}


/**
 * Phase F placeholder.
 */
function simulateSelectedTrade() {
    showNotImplemented('Simulate Selected Trade');
}


/**
 * Phase F placeholder.
 */
function updatePaperTrades() {
    showNotImplemented('Update Paper Trades');
}


/**
 * Phase F placeholder.
 */
function closePaperTrade() {
    showNotImplemented('Close Paper Trade');
}


/**
 * Phase G placeholder.
 */
function refreshDashboard() {
    showNotImplemented('Refresh Dashboard');
}