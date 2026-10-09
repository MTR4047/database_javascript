// We have to run this through the XAMMP directory, not open the HTML on its own!
import { USERS_TABLE_NAME, USERS_TABLE_COLUMNS, tableLimit, srchOps } from '../Public/constantsSQL.js';

const columnLabels = Object.freeze({
    [USERS_TABLE_COLUMNS.username]: "Username",
    [USERS_TABLE_COLUMNS.firstname]: "First Name",
    [USERS_TABLE_COLUMNS.lastname]: "Last Name",
    [USERS_TABLE_COLUMNS.salary]: "Salary",
    [USERS_TABLE_COLUMNS.age]: "Age",
    [USERS_TABLE_COLUMNS.registerday]: "Date Added",
    [USERS_TABLE_COLUMNS.signintime]: "Last Sign-In"
});

/** Effectively, we built a drop down menu for the search operations. It is denoted by labels found from the srchOps, which will get sent to app.js. 
 * Because of the keys, tableContents.js would know the correct fetch method as long as the label remains valid.
 * The label here are the UI friendly versions, the type correspoinds to the HTML input types. THere is yet to be a builder function from this.
 * The placeholder here indicates what value to show in a faded manner when the input fields are empty. *
 */
const searchSelect = Object.freeze({
    [srchOps.searchByUsersName.key]: {
        label: "Search by user's first or last name",
        actions: { [srchOps.searchByUsersName.params.name]: { label: "User's Name", placeholder: "e.g. John", type: "text" } }
    },
    [srchOps.searchByUsersID.key]: {
        label: "Search by user's username",
        actions: { [srchOps.searchByUsersID.params.username]: { label: "Username", placeholder: "e.g. johndoe", type: "text" } }
    },
    [srchOps.searchBetweenUsersSalary.key]: {
        label: "Search between two salaries",
        actions: { 
            [srchOps.searchBetweenUsersSalary.params.minSalary]: { label: "Minimum Salary", placeholder: "0", type: "number" },
            [srchOps.searchBetweenUsersSalary.params.maxSalary]: { label: "Maximum Salary", placeholder: "100000", type: "number" }
        }
    },
    [srchOps.searchBetweenUsersAges.key]: {
        label: "Search between two ages",
        actions: { 
            [srchOps.searchBetweenUsersAges.params.minAge]: { label: "Minimum Age", placeholder: "18", type: "number" },
            [srchOps.searchBetweenUsersAges.params.maxAge]: { label: "Maximum Age", placeholder: "65", type: "number" }
        }
    },
    [srchOps.searchUsersRegistrationAfterUserID.key]: {
        label: "Search users registered after username",
        actions: { [srchOps.searchUsersRegistrationAfterUserID.params.username]: { label: "Target Username", placeholder: "e.g. alice", type: "text" } }
    },
    [srchOps.searchUsersRegistrationTimeSameAsUserID.key]: {
        label: "Search users registered at same time as username",
        actions: { [srchOps.searchUsersRegistrationTimeSameAsUserID.params.username]: { label: "Target Username", placeholder: "e.g. bob", type: "text" } }
    },
    [srchOps.searchNeverSignedInUsers.key]: {
        label: "Search users who never signed in",
        actions: {}
    },
    [srchOps.searchUsersSignedInToday.key]: {
        label: "Search users signed in today",
        actions: {}
    }
});

const usernm_attrib = "data-username";
const sessionToken = sessionStorage.getItem('sessionToken'); // Session token to send to the app.js
const userName = sessionStorage.getItem('loggedInUser'); // Username for reference

/* Have to add this here for specific funcs!
headers : { 'user-session-token': sessionToken }
*/

function displayUserTablesHeader() 
{
    const thead = document.querySelector('#userDisplayTable thead');
    const thead2 = document.querySelector('#allUserDisplayTable thead');
    let headerHTML = `<tr><th>#</th>`; // #1 or #2, etc..., unnecessary when displaying the current user

    // Object.entries returns [colKey, label] pairs, note the use of sql-column here with the appropriate key!
    Object.entries(columnLabels).forEach(([colKey, label]) => {
        headerHTML += `<th sql-column="${colKey}">${label}</th>`;
    });

    // TODO: Add action columns
    // headerHTML += `<th>Delete</th><th>Edit</th></tr>`;

    thead.innerHTML = headerHTML;
    thead2.innerHTML = headerHTML;
}

// 
/**
 * @param {*} response - Response data ({ data: [...] })
 * @param {string} tableKey - CSS selector string (e.g. '#allUserDisplayTable')
 */
function displaySQLTable(response, tableKey) 
{
    // Ensure selector has leading '#' if omitted
    const selector = tableKey.startsWith('#') ? tableKey: `#${tableKey}`;
    const table = document.querySelector(selector); if (!table) return;
    const tableHead = table.querySelector(`thead`);
    const tableContents = table.querySelector(`tbody`); if (!tableContents) return; // This actually doesn't doesn't check against if the table's contents are empty

    if (!response || !response.data || response.data.length === 0) {
        if (tableHead) tableHead.innerHTML = '';
        tableContents.innerHTML = '<tr><td colspan="100%">No records found.</td></tr>';
        return;
    }

    // Slice up to tableLimit (e.g., 25 records)
    const hasNextPage = response.data.length > tableLimit;
    const rows = hasNextPage === true ? response.data.slice(0, tableLimit) : response.data; const returnedKeys = Object.keys(rows[0]);    

    // 1. Build Header HTML (Initialized to empty string)
    let headerHTML = ``;
    returnedKeys.forEach(colKey => {
        const displayLabel = columnLabels[colKey] || colKey;
        headerHTML += `<th sql-column="${colKey}">${displayLabel}</th>`;
    }); 
    // headerHTML += `<th>Actions</th>`; // Action column header

    // 2. Build Body HTML
    let bodyHTML = ``;
    rows.forEach((row, index) => {
        bodyHTML += `<tr data-index="${index}" ${usernm_attrib}="${row[USERS_TABLE_COLUMNS.username]}">`; // Row index counter

        // Match each cell value to its respective column key
        returnedKeys.forEach(colKey => {
            const value = row[colKey] !== null && row[colKey] !== undefined ? row[colKey]: '';
            bodyHTML += `<td>${value}</td>`;
        });

        /* Action Buttons Cell
        bodyHTML += `<td> <button class="delete-btn" data-username="${row[USERS_TABLE_COLUMNS.username]}">Delete</button> </td>`;
        */

        bodyHTML += `</tr>`;
    });

    if (tableHead) tableHead.innerHTML = headerHTML;
    tableContents.innerHTML = bodyHTML;
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

/** Helper to update button state based on backend response (e.g. res.hasNextPage)
 *  
 */ 
function updatePaginationUI(paginationContainerSelector, currentPage, hasNextPage) 
{
    const container = document.querySelector(paginationContainerSelector);
    if (!container) return;

    const prevBtn = container.querySelector('.prev-btn');
    const nextBtn = container.querySelector('.next-btn');
    const pageNumSpan = container.querySelector('.page-num');

    if (pageNumSpan) pageNumSpan.textContent = `Page ${currentPage}`;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = !hasNextPage;
}

let currentAllUsersPage = 1;
async function loadUserData(page = 1, sortBy = `username`) 
{
    try {
        const response = await fetch(`http://localhost:5050/getAll/Users/${page}?offset=${tableLimit}&sortBy=${sortBy}`);
        const resData = await response.json(); console.log(resData);
        
        displaySQLTable(resData, `#allUserDisplayTable`);
        const hasNextPage = resData.data.length > tableLimit;
        // console.log(`resData.data.length vs resData.length: `, resData.data.length, resData.length);
        updatePaginationUI('#allUserDisplayTable-pagination', page, hasNextPage);  
    } catch (err) {
        console.error('Failed to load table data:', err);
    }
}

// Attach Pagination Click Listeners
document.addEventListener('DOMContentLoaded', () => {
    
});

document.addEventListener('DOMContentLoaded', () => {
    // Redirect to login if user isn't authenticated
    if (!sessionToken || !userName) { window.location.href = 'index.html'; return; }

    // 1. Render Hello message
    const welcomeMsg = document.querySelector('#welcome-message');
    if (welcomeMsg) { welcomeMsg.textContent = `Hello, ${userName}`; }

    // 2. Sign Out Action
    const signOutBtn = document.querySelector('#signout-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            const confirmed = confirm('Are you sure you want to sign out?');
            if (!confirmed) return;

            try {
                const response = await fetch('http://localhost:5050/update/Users/signOut', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'user-session-token': sessionToken },
                    body: JSON.stringify({ username: userName })
                });

                // Clear active session from client storage
                if (response.ok) {
                    
                    sessionStorage.clear();
                    window.location.href = 'index.html';
                }
            }
            catch (err) 
            {
                console.error('Sign out request failed:', err);
                alert('An error occurred while attempting to sign out of your account.');
            }            
        });
    }

    // 3. Delete Account Action
    const deleteAccountBtn = document.querySelector('#delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            const confirmed = confirm(`WARNING: Are you sure you want to permanently delete your account (${userName})? This action cannot be undone.`);
            if (!confirmed) return;

            try {
                const response = await fetch('http://localhost:5050/delete/Users', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', 'user-session-token': sessionToken },
                    body: JSON.stringify({ username: userName })
                });

                const result = await response.json();

                if (response.ok && result.success) 
                {
                    alert('Your account has been successfully deleted.');
                    sessionStorage.clear();
                    window.location.href = 'index.html';
                }
                else { alert(`Deletion failed: ${result.error || 'Unknown error'}`); }
            } 
            catch (err) 
            {
                console.error('Delete request failed:', err);
                alert('An error occurred while attempting to delete your account.');
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {   
    const paginationWrapper = document.querySelector('#allUserDisplayTable-pagination');
    
    if (paginationWrapper) {
        paginationWrapper.querySelector('.prev-btn').addEventListener('click', () => {
            if (currentAllUsersPage > 1) {
                currentAllUsersPage--;
                loadUserData(currentAllUsersPage);
            }
        });

        paginationWrapper.querySelector('.next-btn').addEventListener('click', () => {
            currentAllUsersPage++;
            loadUserData(currentAllUsersPage);
        });
    }

    // Initial load
    loadUserData(currentAllUsersPage);
});

document.addEventListener('DOMContentLoaded', function() 
{
    console.log(`loaded`);
    displayUserTablesHeader();
});