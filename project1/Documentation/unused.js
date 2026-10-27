// #region tableContents.js

/** Helper function. Updates or creates a row in a target table, matching cells strictly to the preexisting thead columns.
 * @param {string} tableKey - HTML ID of the target table (such as 'userDisplayTable')
 * @param {number} index - Target row position (0-based) inside tbody.children
 * @param {Object} responseData - Record object's data values returned from the backend
 */
function changeHTMLTableElements(responseData, tableKey, idx)
{
    // In this function, we assume we have the columns set up already, this way we do not disrespect the order set
    const table = document.querySelector(`${tableKey}`); if (!table) return;
    const tableHeadCols = table.querySelectorAll('thead th[sql-column]');
    const tableContents = table.querySelector('tbody'); if (!tableContents) return;
    const tableContentsLength = tableContents.childElementCount;
    
    idx = parseInt(idx, 10);
    if (isNaN(idx) || idx >= tableLimit) return;
    if (idx > tableContentsLength) idx = tableContentsLength; // If index is greater than the table contents length, than just use the index corresponding to the non existent row for append

    let targetRow = tableContents.children[idx];
    const isNewRow = (!targetRow && idx <= (tableLimit - 1)); // This means that with the given index, the target row was not found
    if (isNewRow) { insertRowIntoTable(responseData, tableKey); return; }

    let rowCellsHTML = ``;
    tableHeadCols.forEach(th => { // For each header column, get its sql-column for parsing first, then match the value from the responseData with the key
        const colKey = th.getAttribute('sql-column');
        const value = (responseData && responseData[colKey] !== undefined && responseData[colKey] !== null) ? responseData[colKey]: '';            
        rowCellsHTML += `<td>${value}</td>`;
    });

    const usernameVal = responseData ? (responseData[USERS_TABLE_COLUMNS.username] || '') : '';
    targetRow.innerHTML = rowCellsHTML;
    targetRow.setAttribute(`${usernm_attrib}`, usernameVal);
}

/** Helper function. Inserts a row into a given table if it is not larger than the table limit.
 * @param {Object} responseData - Record object's data values returned from the backend
 * @param {string} tableKey - HTML ID of the target table
 */
function insertRowIntoTable(responseData, tableKey) 
{
    const table = document.querySelector(`${tableKey}`); if (!table) return;
    const tableHeadCols = table.querySelectorAll('thead th[sql-column]');
    const tableContents = table.querySelector('tbody'); if (!tableContents) return;
    if (tableContents.children.length >= tableLimit) return;

    const newRow = document.createElement('tr');    
    let rowCellsHTML = '';    
    tableHeadCols.forEach(th => { // For each header column, get its sql-column for parsing first, then match the value from the responseData with the key
        const colKey = th.getAttribute('sql-column');
        const value = (responseData && responseData[colKey] !== undefined && responseData[colKey] !== null) ? responseData[colKey]: '';            
        rowCellsHTML += `<td>${value}</td>`;
    });

    // Use the username to as an attribute, then append the row into the table
    const usernameVal = responseData ? (responseData[USERS_TABLE_COLUMNS.username] || '') : '';
    newRow.innerHTML = rowCellsHTML; newRow.setAttribute(`${usernm_attrib}`, usernameVal);
    tableContents.appendChild(newRow);
}

/** Helper function. Updates or creates a row in a target table, matching cells strictly to the preexisting thead columns.
 * @param {string} tableKey - HTML ID of the target table (such as 'userDisplayTable')
 * @param {number} index - Target row position (0-based) inside tbody.children
 * @param {Object} responseData - Record object's data values returned from the backend
 */
function changeHTMLTableElements(responseData, tableKey, idx)
{
    // In this function, we assume we have the columns set up already, this way we do not disrespect the order set
    const table = document.querySelector(`${tableKey}`); if (!table) return;
    const tableHeadCols = table.querySelectorAll('thead th[sql-column]');
    const tableContents = table.querySelector('tbody'); if (!tableContents) return;
    const tableContentsLength = tableContents.childElementCount;
    
    idx = parseInt(idx, 10);
    if (isNaN(idx) || idx >= tableLimit) return;
    if (idx > tableContentsLength) idx = tableContentsLength; // If index is greater than the table contents length, than just use the index corresponding to the non existent row for append

    let targetRow = tableContents.children[idx];
    const isNewRow = (!targetRow && idx <= (tableLimit - 1)); // This means that with the given index, the target row was not found
    if (isNewRow) { insertRowIntoTable(responseData, tableKey); return; }

    let rowCellsHTML = ``;
    tableHeadCols.forEach(th => { // For each header column, get its sql-column for parsing first, then match the value from the responseData with the key
        const colKey = th.getAttribute('sql-column');
        const value = (responseData && responseData[colKey] !== undefined && responseData[colKey] !== null) ? responseData[colKey]: '';            
        rowCellsHTML += `<td>${value}</td>`;
    });

    const usernameVal = responseData ? (responseData[USERS_TABLE_COLUMNS.username] || '') : '';
    targetRow.innerHTML = rowCellsHTML;
    targetRow.setAttribute(`${usernm_attrib}`, usernameVal);
}

/** Used to update a row to reflect the backend.
 * @param {Object} responseData - Record object's data values returned from the backend
 * @param {string} tableKey - HTML ID of the target table
 */
function updateRowFromTable(responseData, tableKey)
{
    if (!responseData) return;
    const usernameVal = responseData.username; if (!usernameVal) return;

    const table = document.querySelector(`${tableKey}`); if (!table) return;
    const tableHeadCols = table.querySelectorAll('thead th[sql-column]');
    const tableContents = table.querySelector('tbody'); if (!tableContents) return;
    const targetRow = tableContents.querySelector(`tr[${usernm_attrib}="${CSS.escape(responseData.username)}"]`); if (!targetRow) return;

    let rowCellsHTML = '';
    tableHeadCols.forEach(th => { // For each header column, get its sql-column for parsing first, then match the value from the responseData with the key
        const colKey = th.getAttribute('sql-column');
        const value = (responseData && responseData[colKey] !== undefined && responseData[colKey] !== null) ? responseData[colKey]: '';            
        rowCellsHTML += `<td>${value}</td>`;
    });

    targetRow.innerHTML = rowCellsHTML; // Atomic update
}

/** Helper function. This should be used in case of a user deleting own records. Note that we have the data-username attribute!
 * @param {string} username - Username to delete
 * @param {string} tableKey - HTML ID of the target table 
 */
function deleteRowFromTable(username, tableKey)
{
    const table = document.querySelector(`${tableKey}`); if (!table) return;    
    const tableContents = table.querySelector('tbody'); if (!tableContents) return;

    const targetRow = tableContents.querySelector(`tr[${usernm_attrib}="${CSS.escape(username)}"]`);
    if (targetRow) targetRow.remove();
    else return;
}

// #endregion

// #region

