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
        label: "Search users registered at same day as username",
        actions: { [srchOps.searchUsersRegistrationTimeSameAsUserID.params.username]: { label: "Target Username", placeholder: "e.g. bob", type: "text" } }
    },
    [srchOps.searchNeverSignedInUsers.key]: {
        label: "Search users who never signed in",
        actions: {}
    },
    [srchOps.searchUsersSignedInToday.key]: {
        label: "Search users registered today",
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
        signOutBtn.addEventListener('click', async () => {
            const confirmed = confirm('Are you sure you want to sign out?');
            if (!confirmed) return;

            try {
                const response = await fetch('http://localhost:5050/update/Users/signOut', {
                    method: 'POST',
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

// #region Search panel
let currentSearch = null;   // { action, params } of the last search run, reused by Previous/Next
let currentSearchPage = 1;

function showSearchError(message) { document.querySelector('#search-error').textContent = message; }
function clearSearchError() { document.querySelector('#search-error').textContent = ''; }

// Fill the dropdown from searchSelect, so the labels and backend keys stay in one place
function buildSearchDropdown()
{
    const select = document.querySelector('#search-type'); if (!select) return;
    select.innerHTML = Object.entries(searchSelect)
        .map(([key, option]) => `<option value="${key}">${option.label}</option>`).join('');
    select.addEventListener('change', renderSearchInputs);
    renderSearchInputs();
}

// Show the input boxes the selected search needs (none for "never signed in" and "registered today")
function renderSearchInputs()
{
    clearSearchError();
    const action = document.querySelector('#search-type').value;
    const container = document.querySelector('#search-inputs');
    const fields = Object.entries(searchSelect[action]?.actions ?? {});

    if (fields.length === 0) { container.innerHTML = '<span class="search-hint">No inputs needed for this search.</span>'; return; }

    container.innerHTML = fields.map(([param, field]) => `
        <span class="search-field">
            <label for="search-param-${param}">${field.label}:</label>
            <input id="search-param-${param}" data-param="${param}" data-label="${field.label}" type="${field.type}"
                placeholder="${field.placeholder}" ${field.type === 'number' ? 'min="0"' : ''}>
        </span>`).join('');
}

// Read and check the inputs; throws an Error with a message for the user if something is wrong
function readSearchParams()
{
    const params = {};
    for (const input of document.querySelectorAll('#search-inputs input'))
    {
        const raw = input.value.trim();
        if (raw === '') throw new Error(`Please enter ${input.dataset.label}.`);

        if (input.type === 'number')
        {
            const num = Number(raw);
            if (!Number.isFinite(num) || num < 0) throw new Error(`${input.dataset.label} must be a number of 0 or more.`);
            params[input.dataset.param] = num;
        }
        else params[input.dataset.param] = raw;
    }

    // Range searches (salary, age): the minimum must not be above the maximum
    const keys = Object.keys(params);
    const minKey = keys.find(k => k.startsWith('min')); const maxKey = keys.find(k => k.startsWith('max'));
    if (minKey && maxKey && params[minKey] > params[maxKey]) throw new Error('The minimum cannot be greater than the maximum.');

    return params;
}

// Send the current search to the backend for one page and show the results in #selectTable
async function runSearch(page)
{
    if (!currentSearch) return;
    clearSearchError();

    try {
        const response = await fetch('http://localhost:5050/search/Users/actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'user-session-token': sessionToken },
            body: JSON.stringify({ action: currentSearch.action, page: page, params: currentSearch.params })
        });
        const resData = await response.json();

        if (!response.ok || resData.data === false) { showSearchError(resData.error || resData.message || 'Search failed. Please try again.'); return; }

        currentSearchPage = page;
        displaySQLTable(resData, '#selectTable');
        updatePaginationUI('#selectTable-pagination', page, resData.data.length > tableLimit);
    }
    catch (err) { console.error('Search failed:', err); showSearchError('Unable to connect to server.'); }
}

document.addEventListener('DOMContentLoaded', () => {
    buildSearchDropdown();

    document.querySelector('#search-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        let params;
        try { params = readSearchParams(); }
        catch (err) { showSearchError(err.message); return; }

        currentSearch = { action: document.querySelector('#search-type').value, params: params };
        runSearch(1);
    });

    const pager = document.querySelector('#selectTable-pagination');
    pager?.querySelector('.prev-btn').addEventListener('click', () => { if (currentSearchPage > 1) runSearch(currentSearchPage - 1); });
    pager?.querySelector('.next-btn').addEventListener('click', () => runSearch(currentSearchPage + 1));
});
// #endregion Search panel

// #region Current user table (editable)
// Shows the signed-in user's own details (no password). The Edit button turns the editable
// cells into input boxes; Save sends the changes to PATCH /update/Users.
let currentUserData = null;
const editableColumns = Object.freeze({
    [USERS_TABLE_COLUMNS.firstname]: 'text',
    [USERS_TABLE_COLUMNS.lastname]:  'text',
    [USERS_TABLE_COLUMNS.salary]:    'number',
    [USERS_TABLE_COLUMNS.age]:       'number'
});

function showProfileMessage(message, isSuccess = false)
{
    const p = document.querySelector('#profile-message'); if (!p) return;
    p.textContent = message;
    p.classList.toggle('success', isSuccess);
}

// Make a value safe to put inside an HTML attribute
function escapeAttr(value) { return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

async function loadCurrentUser()
{
    const table = document.querySelector('#userDisplayTable'); if (!table) return;
    const columns = Object.keys(columnLabels);
    table.querySelector('thead').innerHTML = `<tr>${columns.map(col => `<th sql-column="${col}">${columnLabels[col]}</th>`).join('')}<th>Actions</th></tr>`;

    try {
        const response = await fetch('http://localhost:5050/search/Users/actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'user-session-token': sessionToken },
            body: JSON.stringify({ action: srchOps.searchByUsersID.key, page: 1, params: { [srchOps.searchByUsersID.params.username]: userName } })
        });
        const resData = await response.json();
        currentUserData = (response.ok && Array.isArray(resData.data)) ? resData.data[0] : null;

        if (!currentUserData) { table.querySelector('tbody').innerHTML = `<tr><td colspan="${columns.length + 1}">Could not load your details.</td></tr>`; return; }
        renderCurrentUserRow(false);
    }
    catch (err) { console.error('Failed to load current user:', err); }
}

// Draw the row, either as plain text or with input boxes in the editable cells
function renderCurrentUserRow(editing)
{
    const user = currentUserData; if (!user) return;
    const tbody = document.querySelector('#userDisplayTable tbody');
    const show = (col) => (user[col] !== null && user[col] !== undefined) ? user[col] : '';

    const cells = Object.keys(columnLabels).map(col => {
        if (editing && editableColumns[col])
            return `<td><input id="edit-${col}" data-col="${col}" type="${editableColumns[col]}" value="${escapeAttr(show(col))}" ${editableColumns[col] === 'number' ? 'min="0"' : ''}></td>`;
        return `<td>${show(col)}</td>`;
    }).join('');

    const actions = editing
        ? `<button id="profile-save-btn">Save</button><button id="profile-cancel-btn">Cancel</button>`
        : `<button id="profile-edit-btn">Edit</button>`;

    tbody.innerHTML = `<tr ${usernm_attrib}="${user[USERS_TABLE_COLUMNS.username]}">${cells}<td>${actions}</td></tr>`;

    if (editing)
    {
        document.querySelector('#profile-save-btn').addEventListener('click', saveCurrentUserRow);
        document.querySelector('#profile-cancel-btn').addEventListener('click', () => { showProfileMessage(''); renderCurrentUserRow(false); });
        tbody.querySelectorAll('input').forEach(input => input.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveCurrentUserRow(); }));
        document.querySelector(`#edit-${USERS_TABLE_COLUMNS.firstname}`)?.focus();
    }
    else document.querySelector('#profile-edit-btn').addEventListener('click', () => { showProfileMessage(''); renderCurrentUserRow(true); });
}

// Read and check the boxes; empty boxes are left out so those values stay as they are
function readEditedValues()
{
    const updates = {};
    const namePattern = /^[A-Za-z][A-Za-z -]*$/;

    for (const input of document.querySelectorAll('#userDisplayTable tbody input'))
    {
        const col = input.dataset.col; const label = columnLabels[col]; const raw = input.value.trim();
        if (raw === '') continue;

        if (col === USERS_TABLE_COLUMNS.firstname || col === USERS_TABLE_COLUMNS.lastname)
        {
            if (raw.length < 2 || !namePattern.test(raw)) throw new Error(`${label} must be at least 2 letters (letters, spaces and hyphens only).`);
            updates[col] = raw;
        }
        else if (col === USERS_TABLE_COLUMNS.salary)
        {
            const salary = Number(raw);
            if (!Number.isFinite(salary) || salary < 0) throw new Error('Salary must be a number of 0 or more.');
            updates[col] = salary;
        }
        else if (col === USERS_TABLE_COLUMNS.age)
        {
            const age = Number(raw);
            if (!Number.isInteger(age) || age < 0 || age > 120) throw new Error('Age must be a whole number from 0 to 120.');
            updates[col] = age;
        }
    }

    if (Object.keys(updates).length === 0) throw new Error('Enter at least one value to update.');
    return updates;
}

async function saveCurrentUserRow()
{
    showProfileMessage('');
    let updates;
    try { updates = readEditedValues(); }
    catch (err) { showProfileMessage(err.message); return; }

    try {
        const response = await fetch('http://localhost:5050/update/Users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'user-session-token': sessionToken },
            body: JSON.stringify({ [USERS_TABLE_COLUMNS.username]: userName, ...updates })
        });
        const resData = await response.json();

        if (!response.ok || !resData.success) { showProfileMessage(resData.error || 'Profile could not be updated.'); return; }

        showProfileMessage('Profile updated.', true);
        await loadCurrentUser();            // reload My Account from the database (back to plain text)
        loadUserData(currentAllUsersPage);  // refresh the all-users table
    }
    catch (err) { console.error('Profile update failed:', err); showProfileMessage('Unable to connect to server.'); }
}

document.addEventListener('DOMContentLoaded', () => { if (sessionToken && userName) loadCurrentUser(); });
// #endregion Current user table (editable)
