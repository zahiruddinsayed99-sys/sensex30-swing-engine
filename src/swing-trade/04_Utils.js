/**
 * Shared utility functions.
 */


/**
 * Displays a simple placeholder message
 * for features belonging to later phases.
 */
function showNotImplemented(featureName) {
    SpreadsheetApp.getUi().alert(
        featureName + ' is not implemented yet.'
    );
}