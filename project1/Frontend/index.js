
// This is the frontEnd that modifies the HTML page directly
// event-based programming,such as document load, click a button

/*
What is a Promise in Javascript? 

A Promise can be in one of three states:

    - Pending: The initial state; the promise is neither fulfilled nor rejected.

    - Fulfilled: The operation completed successfully, and the promise has a 
      resulting value.

    - Rejected: The operation failed, and the promise has a reason for the failure.

Promises have two main methods: then and catch.

    - The then method is used to handle the successful fulfillment of a promise. 
    It takes a callback function that will be called when the promise is resolved, 
    and it receives the resulting value.

    - The catch method is used to handle the rejection of a promise. It takes a 
    callback function that will be called when the promise is rejected, and it 
    receives the reason for the rejection.

What is a promise chain? 
    The Promise chain starts with some asyncOperation1(), which returns a promise, 
    and each subsequent ``then`` is used to handle the result of the previous Promise.

    The catch is used at the end to catch any errors that might occur at any point 
    in the chain.

    Each then returns a new Promise, allowing you to chain additional ``then`` calls to 
    handle subsequent results.

What is an arrow function?

    An arrow function in JavaScript is a concise way to write anonymous function 
    expressions.

    Traditional function syntax: 
        const add = function(x, y) {
           return x + y;
        };

    Arrow function syntax:
        const add = (x, y) => x + y;
    
    
Arrow functions have a few notable features:

    - Shorter Syntax: Arrow functions eliminate the need for the function keyword, 
      curly braces {}, and the return keyword in certain cases, making the syntax 
      more concise.

    - Implicit Return: If the arrow function consists of a single expression, it is 
      implicitly returned without needing the return keyword.

    - Lexical this: Arrow functions do not have their own this context; instead, they 
      inherit this from the surrounding code. This can be beneficial in certain situations,
      especially when dealing with callbacks and event handlers.
*/

// We have to run this through the XAMMP directory, not open the HTML on its own!
import { USERS_TABLE_NAME, USERS_TABLE_COLUMNS, tableLimit } from '../Public/constantsSQL.js';

const columnLabels = Object.freeze({
    [USERS_TABLE_COLUMNS.username]: "Username",
    [USERS_TABLE_COLUMNS.firstname]: "First Name",
    [USERS_TABLE_COLUMNS.lastname]: "Last Name",
    [USERS_TABLE_COLUMNS.salary]: "Salary",
    [USERS_TABLE_COLUMNS.age]: "Age",
    [USERS_TABLE_COLUMNS.registerday]: "Date Added",
    [USERS_TABLE_COLUMNS.signintime]: "Last Sign-In"
});

const usernm_attrib = "data-username";

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
 * @param {*} response - Response data, the frontend sends the page, then gets returned a paginated query
 * @param {*} tableKey 
 */
function displaySQLTable(response, tableKey)
{
    const table = document.querySelector(`${tableKey}`); if (!table) return;
    const tableHead = table.querySelector(`thead`);
    const tableContents = table.querySelector(`tbody`); if (!tableContents) return; // This doesn't doesn't check against if the table's contents are empty

    if (!response || !response.data || response.data.length === 0) {
        tableHead.innerHTML = '';
        tableContents.innerHTML = '<tr><td colspan="100%">No records found.</td></tr>';
        return;
    }

    // Extract the first 25 rows from the response data
    const hasNextPage = response.data.length > tableLimit;
    const rows = hasNextPage === true ? response.data.slice(0, tableLimit): response.data; const returnedKeys = Object.keys(rows[0]);    

    // Begin building the header HTML using the columns label constant
    let headerHTML;
    returnedKeys.forEach(colKey => { // Check each column key from the query data and match
        // Fallback: Use columnLabels[colKey] if mapped; otherwise, use colKey as-is
        const displayLabel = columnLabels[colKey] || colKey;
        headerHTML += `<th sql-column="${colKey}">${displayLabel}</th>`; // Custom SQL-Column attribute
    });    

    // Build the body data (table rows, with table data corresponding) dynamically using the extracted keys
    let bodyHTML = ``;
    rows.forEach((row, index) => { // For each row of data from the query data
        bodyHTML += `<tr data-index=${index} ${usernm_attrib}="${row[USERS_TABLE_COLUMNS.username]}">`; // Row index counter

        // Match each cell value to its respective column key
        returnedKeys.forEach(colKey => {
            const value = row[colKey] !== null && row[colKey] !== undefined ? row[colKey]: '';
            bodyHTML += `<td>${value}</td>`;
        });

        // TODO: Implement the action buttons bound to the record's primary identifier
        
        bodyHTML += `</tr>`;
    });

    tableHead.innerHTML = headerHTML;
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

document.addEventListener('DOMContentLoaded', function() 
{
    console.log(`loaded`);
    displayUserTablesHeader();
    fetch(`http://localhost:5050/getAll/Users/1?offset=${tableLimit}?sortBy=username`);
});

/*
// fetch call is to call the backend
document.addEventListener('DOMContentLoaded', function() 
{
    // one can point your browser to http://localhost:5050/getAll to check what it returns first.
    fetch('http://localhost:5050/getAll')     
    .then(response => response.json())
    .then(data => loadHTMLTable(data['data']));
});
*/

// when the addBtn is clicked
const addBtn = document.querySelector('#add-name-btn');
addBtn.onclick = function (){
    const nameInput = document.querySelector('#name-input');
    const name = nameInput.value;
    nameInput.value = "";

    fetch('http://localhost:5050/insert', {
        headers: {
            'Content-type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({name: name})
    })
    .then(response => response.json())
    .then(data => insertRowIntoTable(data['data']));
}

// when the searchBtn is clicked
const searchBtn =  document.querySelector('#search-btn');
searchBtn.onclick = function (){
    const searchInput = document.querySelector('#search-input');
    const searchValue = searchInput.value;
    searchInput.value = "";

    fetch('http://localhost:5050/search/' + searchValue)
    .then(response => response.json())
    .then(data => loadHTMLTable(data['data']));
}

let rowToDelete; 

// when the delete button is clicked, since it is not part of the DOM tree, we need to do it differently
document.querySelector('table tbody').addEventListener('click', 
      function(event){
        if(event.target.className === "delete-row-btn"){

            deleteRowById(event.target.dataset.id);   
            rowToDelete = event.target.parentNode.parentNode.rowIndex;    
            debug("delete which one:");
            debug(rowToDelete);
        }   
        if(event.target.className === "edit-row-btn"){
            showEditRowInterface(event.target.dataset.id); // display the edit row interface
        }
      }
);

function deleteRowById(id){
    // debug(id);
    fetch('http://localhost:5050/delete/' + id,
       { 
        method: 'DELETE'
       }
    )
    .then(response => response.json())
    .then(
         data => {
             if(data.success){
                document.getElementById("table").deleteRow(rowToDelete);
                // location.reload();
             }
         }
    );
}

let idToUpdate = 0;

function showEditRowInterface(id){
    debug("id clicked: ");
    debug(id);
    document.querySelector('#update-name-input').value = ""; // clear this field
    const updateSetction = document.querySelector("#update-row");  
    updateSetction.hidden = false;
    // we assign the id to the update button as its id attribute value
    idToUpdate = id;
    debug("id set!");
    debug(idToUpdate+"");
}


// when the update button on the update interface is clicked
const updateBtn = document.querySelector('#update-row-btn');

updateBtn.onclick = function(){
    debug("update clicked");
    debug("got the id: ");
    debug(updateBtn.value);
    
    const updatedNameInput = document.querySelector('#update-name-input');

    fetch('http://localhost:5050/update',
          {
            headers: {
                'Content-type': 'application/json'
            },
            method: 'PATCH',
            body: JSON.stringify(
                  {
                    id: idToUpdate,
                    name: updatedNameInput.value
                  }
            )
          }
    ) 
    .then(response => response.json())
    .then(data => {
        if(data.success){
            location.reload();
        }
        else 
           debug("no update occurs");
    })
}


// this function is used for debugging only, and should be deleted afterwards
function debug(data)
{
    fetch('http://localhost:5050/debug', {
        headers: {
            'Content-type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({debug: data})
    })
}

function insertRowIntoTable(data){

   debug("index.js: insertRowIntoTable called: ");
   debug(data);

   const table = document.querySelector('table tbody');
   debug(table);

   const isTableData = table.querySelector('.no-data');

  // debug(isTableData);

   let tableHtml = "<tr>";
   
   for(var key in data){ // iterating over the each property key of an object data
      if(data.hasOwnProperty(key)){   // key is a direct property for data
            if(key === 'dateAdded'){  // the property is 'dataAdded'
                data[key] = new Date(data[key]).toLocaleString(); // format to javascript string
            }
            tableHtml += `<td>${data[key]}</td>`;
      }
   }

   tableHtml +=`<td><button class="delete-row-btn" data-id=${data.id}>Delete</td>`;
   tableHtml += `<td><button class="edit-row-btn" data-id=${data.id}>Edit</td>`;

   tableHtml += "</tr>";

    if(isTableData){
       debug("case 1");
       table.innerHTML = tableHtml;
    }
    else {
        debug("case 2");
        // debug(tableHtml);

        const newrow = table.insertRow();
        newrow.innerHTML = tableHtml;
    }
}

function loadHTMLTable(data){
    debug("index.js: loadHTMLTable called.");

    const table = document.querySelector('table tbody'); 
    
    if(data.length === 0){
        table.innerHTML = "<tr><td class='no-data' colspan='5'>No Data</td></tr>";
        return;
    }
  
    /*
    In the following JavaScript code, the forEach method is used to iterate over the 
    elements of the data array. The forEach method is a higher-order function 
    that takes a callback function as its argument. The callback function is 
    executed once for each element in the array.
    
    In this case, the callback function takes a single argument, which is an object 
    destructuring pattern:


    function ({id, name, date_added}) {
        // ... code inside the callback function
    }

    This pattern is used to extract the id, name, and date_added properties from each 
    element of the data array. The callback function is then executed for each element
    in the array, and within the function, you can access these properties directly 
    as variables (id, name, and date_added).

    
    In summary, the forEach method is a convenient way to iterate over each element in 
    an array and perform some operation or execute a function for each element. 
    The provided callback function is what gets executed for each element in the 
    data array.
    */

    let tableHtml = "";
    data.forEach(function ({id, name, date_added}){
         tableHtml += "<tr>";
         tableHtml +=`<td>${id}</td>`;
         tableHtml +=`<td>${name}</td>`;
         tableHtml +=`<td>${new Date(date_added).toLocaleString()}</td>`;
         tableHtml +=`<td><button class="delete-row-btn" data-id=${id}>Delete</td>`;
         tableHtml += `<td><button class="edit-row-btn" data-id=${id}>Edit</td>`;
         tableHtml += "</tr>";
    });

    table.innerHTML = tableHtml;
}
