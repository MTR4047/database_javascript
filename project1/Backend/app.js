// Backend: application services, accessible by URIs
// Git Test - KP - KP

const express = require('express');
const cors = require ('cors');
const dotenv = require('dotenv');
const crypto = require('crypto'); // Session tokensss
dotenv.config()

const app = express();
const dbService = require('./dbService');
const constantsSQL = require('../Public/constantsSQL.js');

app.use(cors());
app.use(express.json())
app.use(express.urlencoded({extended: false}));

// #region Authentication
const activeUserSessions = new Map();
// Helper to validate incoming tokens on protected endpoints
function authenticateToken(request, response, next) 
{
    const token = request.headers['user-session-token'];
    
    if (!token || !activeUserSessions.has(token)) {
        return response.status(401).json({ success: false, error: 'Unauthorized. Please log in.' });
    }

    // Note that, if we have authenticate token as "parameter" on the endpoint, it becomes a middleware function!!
    request.username = activeUserSessions.get(token); // Attach username to request object that gets passed into the endpoint
    next();
}

// #region NAMES TABLE
// create
app.post('/insert', (request, response) => {
    console.log("app: insert a row.");
    // console.log(request.body); 

    const {name} = request.body;
    const db = dbService.getDbServiceInstance();

    const result = db.insertNewName(name);
 
    // note that result is a promise
    result 
    .then(data => response.json({data: data})) // return the newly added row to frontend, which will show it
   // .then(data => console.log({data: data})) // debug first before return by response
   .catch(err => console.log(err));
});

// read 
app.get('/getAll', (request, response) => {
    
    const db = dbService.getDbServiceInstance();

    
    const result =  db.getAllData(); // call a DB function

    result
    .then(data => response.json({data: data}))
    .catch(err => console.log(err));
});


app.get('/search/:name', (request, response) => { // we can debug by URL
    
    const {name} = request.params;
    
    console.log(name);

    const db = dbService.getDbServiceInstance();

    let result;
    if(name === "all") // in case we want to search all
       result = db.getAllData()
    else 
       result =  db.searchByName(name); // call a DB function

    result
    .then(data => response.json({data: data}))
    .catch(err => console.log(err));
});


// update
app.patch('/update', 
     (request, response) => {
          console.log("app: update is called");
          //console.log(request.body);
          const{id, name} = request.body;
          console.log(id);
          console.log(name);
          const db = dbService.getDbServiceInstance();

          const result = db.updateNameById(id, name);

          result.then(data => response.json({success: true}))
          .catch(err => console.log(err)); 

     }
);

// delete service
app.delete('/delete/:id', 
     (request, response) => {     
        const {id} = request.params;
        console.log("delete");
        console.log(id);
        const db = dbService.getDbServiceInstance();

        const result = db.deleteRowById(id);

        result.then(data => response.json({success: true}))
        .catch(err => console.log(err));
     }
)   

// debug function, will be deleted later
app.post('/debug', (request, response) => {
    // console.log(request.body); 

    const {debug} = request.body;
    console.log(debug);

    return response.json({success: true});
});   

// debug function: use http://localhost:5050/testdb to try a DB function
// should be deleted finally
app.get('/testdb', (request, response) => {
    
    const db = dbService.getDbServiceInstance();

    
    const result =  db.deleteById("14"); // call a DB function here, change it to the one you want

    result
    .then(data => response.json({data: data}))
    .catch(err => console.log(err));
});
// #endregion NAMES TABLE

// #region USERS TABLE
app.post('/insert/Users', (request, response) => {
    const { username, password } = request.body;
    const db = dbService.getDbServiceInstance();

    db.insertNewUser(username, password)
        .then(userData => {
            if (userData) 
            {
                const token = crypto.randomUUID();
                activeUserSessions.set(token, userData.username); // Associate a username with a token
                response.json({ success: true, data: userData, token: token });
            } 
            else { response.status(400).json({ success: false, error: 'Registration failed or user already exists.' }); }
        })
        .catch(err => {
            console.error(err);
            response.status(500).json({ success: false, error: 'Server error during registration.' });
        });
});

app.post('/update/Users/signIn', (request, response) => {
    const { username, password } = request.body;
    const db = dbService.getDbServiceInstance();
    const result = db.signInUser(username, password);

    result.then(userData => {
            if (userData) 
            {
                const token = crypto.randomUUID();
                activeUserSessions.set(token, userData.username); // Associate a username with a token
                response.json({ success: true, data: userData, token: token }); 
            } 
            else { response.status(401).json({ success: false, error: 'Invalid username or password.' }); }
        })
        .catch(err => {
            console.error(err);
            response.status(500).json({ success: false, error: 'Server error during sign in.' });
        });
});

/*
app.post('/insert/Users', (request, response) => {
    console.log("app: register a user.");
    const { username, password } = request.body;
    const db = dbService.getDbServiceInstance();
    const result = db.insertNewUser(username, password);
 
    result.then(data => response.json({data: data})) // return the newly added row to frontend
   // .then(data => console.log({data: data})) // debug first before return by response
   .catch(err => console.log(err));
});

// Considered an update as signing in updates the sign in time
app.post('/update/Users/signin', (request, response) => {
    const { username, password } = request.body;
    const db = dbService.getDbServiceInstance();
    const result = db.signInUser(username, password);

    result.then(data => response.json({success: true, data: data}))
    .catch(err => {
        console.log(err);

    });
});
*/

// No authentication for session required heres
app.get('/getAll/Users/:page', (request, response) => {    
    const db = dbService.getDbServiceInstance();
    
    // For example: const res = await fetch(`/getAll/Users/${currentPage}?offset=25?sortBy=username`);
    const { page } = request.params;
    const { offset, order } = request.query; // Everything following the pages with '?';    
    const offsetNorm = isNaN(offset) ? 100: Math.min(offset, 100); // Here, we must pass in valid data
    const result = db.getAllUsersData(page, offsetNorm, order); // call a DB function

    result.then(data => response.json({data: data})).catch(err => console.log(err));
});

/* Here, on the app.js, we have to pass something like fetch(http://localhost:5050/delete/Users/${username}),  
{ method: 'DELETE', headers: { 'user-session-token': sessionToken }, body: JSON.stringify({username: username}) }).then
*/
app.delete('/delete/Users', authenticateToken, (request, response) => 
{
    const { username } = request.body; console.log("delete " + username);   
    
    const authUser = request.username;
    if (username !== authUser) 
    { return response.status(403).json({ success: false, error: 'User must be authenticated and can only delete their own records.' }); }

    const db = dbService.getDbServiceInstance();    
    const result = db.deleteRowByUsername(username);
    result.then(data => response.json({success: true}))
    .catch(err => {
        console.log(err);
        response.status(500).json({ success: false, error: 'Database deletion failed.' });
    });
});

/* Here, on the app.js, we have to pass something like 
fetch('http://localhost:5050/update/Users', {
    method: 'PATCH',
    headers: {
        'Content-Type': 'application/json',
        'user-session-token': sessionToken
    },
    body: JSON.stringify({
        username: 'johndoe',   // Checked against request.username
        firstname: 'Jane',     // Extracted into updateData
        lastname: 'Smith'      // Extracted into updateData
    })
})
.then(res => res.json())
.then(data => console.log(data));
*/
app.patch('/update/Users', authenticateToken, (request, response) =>
{
    console.log("app: Users update is called");

    // Neat thing we can do here because the backend function filters every invalid data call anyway 
    const { username, ...updateData } = request.body;    
    // const username = request.body.username;

    const authUser = request.username;
    if (username !== authUser) 
    { return response.status(403).json({ success: false, error: 'User must be authenticated and can only update their own records.' }); }

    const db = dbService.getDbServiceInstance();
    const result = db.updateDetailsByUsername(updateData, username);

    result.then(data => response.json({success: true})).catch(err => console.log(err)); 
});

// #region OTHER READ OPERATIONS

// Map of allowed search operations

/*
const SEARCH_USER_ACTIONS = Object.freeze({
    "searchByUsersName": async (db, params) => {
        const { name } = params;
        return await db.searchByUsersName(name);
    },
    "searchByUsersID": async (db, params) => {
        const { username } = params;
        return await db.searchByUsersID(username);
    },
    "searchBetweenUsersSalary": async (db, params) => {
        const { minSalary, maxSalary } = params;
        return await db.searchBetweenUsersSalary(minSalary, maxSalary);
    },
    "searchBetweenUsersAges": async (db, params) => {
        const { minAge, maxAge } = params;
        return await db.searchBetweenUsersAges(minAge, maxAge);
    },    
    "searchUsersRegistrationAfterUserID": async (db, params) => {
        const { username } = params;
        return await db.searchUsersRegistrationTimeAfterUserID(username);
    },
    "searchUsersRegistrationTimeSameAsUserID": async (db, params) => {
        const { username } = params;
        return await db.searchUsersRegistrationTimeSameAsUserID(username);
    },
    "searchNeverSignedInUsers": async (db, params) => {
        const { } = params;
        return await db.searchNeverSignedInUsers();
    },
    "searchUsersSignedInToday": async (db, params) => {
        const { } = params;
        return await db.searchUsersSignedInToday();
    }
});
*/

/* A MAP which defines allowable searchable functions for the singular search endpoint; 
    This is much simpler than having to do the alternative:
    const SEARCH_USER_ACTIONS = new Map([
        [
            srchOps.searchBetweenUsersSalary.key, 
            (db, page, params) => db.searchBetweenUsersSalary(
                page, 
                params[srchOps.searchBetweenUsersSalary.params.minSalary], 
                params[srchOps.searchBetweenUsersSalary.params.maxSalary]
            )
        ],
        [
            srchOps.searchByUsersID.key, 
            (db, page, params) => db.searchByUsersID(
                page, 
                params[srchOps.searchByUsersID.params.username]
            )
        ]
        // ...
    ]);
*/
const SEARCH_USER_ACTIONS = new Map([
    [constantsSQL.srchOps.searchByUsersName.key,                         async (db, page, params) => { return await db.searchByUsersName(page, params.name) } ],
    [constantsSQL.srchOps.searchByUsersID.key,                           async (db, page, params) => { return await db.searchByUsersID(page, params.username) } ],
    [constantsSQL.srchOps.searchBetweenUsersSalary.key,                  async (db, page, params) => { return await db.searchBetweenUsersSalary(page, params.minSalary, params.maxSalary) } ],
    [constantsSQL.srchOps.searchBetweenUsersAges.key,                    async (db, page, params) => { return await db.searchBetweenUsersAges(page, params.minAge, params.maxAge) } ],
    [constantsSQL.srchOps.searchUsersRegistrationAfterUserID.key,        async (db, page, params) => { return await db.searchUsersRegistrationTimeAfterUserID(page, params.username) } ],
    [constantsSQL.srchOps.searchUsersRegistrationTimeSameAsUserID.key,   async (db, page, params) => { return await db.searchUsersRegistrationTimeSameAsUserID(page, params.username) } ],
    [constantsSQL.srchOps.searchNeverSignedInUsers.key,                  async (db, page) => { return await db.searchNeverSignedInUsers(page) } ],
    [constantsSQL.srchOps.searchUsersSignedInToday.key,                  async (db, page) => { return await db.searchUsersSignedInToday(page) } ]
]);

Object.freeze(SEARCH_USER_ACTIONS);

/* EXAMPLE USE on the FRONTEND, note how we send in the page number 
fetch('/search/Users/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        action: 'searchByAgeRange',
        page: 1,
        params: { minAge: 21, maxAge: 35 }
    })
}).then(res => res.json()).then(result => console.log(result.data));
*/
app.post('/search/Users/actions', authenticateToken, async (request, response) => {   
    const { action, page, params = {} } = request.body;
    const searchFunc = SEARCH_USER_ACTIONS.get(action);

    let errJson;
    if (!searchFunc) 
    {
        errJson = response.status(400).json({ success: false, message: `Invalid or unauthorized search action: '${action}`});
        console.log(errJson);
        return errJson;
    }        
    
    const db = dbService.getDbServiceInstance();
    const result = await searchHandler(db, page, params);
    result.then(data => response.json({data: data})).catch(err => console.log(err));
});

// Here, because we have a special case of "all" where we have to call another function, we both map this and have an endpoint
app.get('/search/Users/name/:name', authenticateToken, (request, response) => 
{
    const {name} = request.params; console.log(name);
    let result;

    const db = dbService.getDbServiceInstance();
    if(name.toLowerCase() === "all") result = db.getAllUsersData();
    else result =  db.searchByUsersName(name); // call a DB function

    result.then(data => response.json({data: data})).catch(err => console.log(err));
});

/*
app.get('/search/Users/username/:username', (request, response) => 
{
    const {username} = request.params; console.log(username);

    const db = dbService.getDbServiceInstance();    
    const result = db.searchByUsersID(username);

    result.then(data => response.json({data: data})).catch(err => console.log(err));
});

app.get('/search/Users/searchBetweenUsersSalary', (request, response) => 
{
    const {salary1, salary2} = request.body; 
    let result;

    const db = dbService.getDbServiceInstance();    
    result = db.searchBetweenUsersSalary(salary1, salary2);

    result.then(data => response.json({data: data})).catch(err => console.log(err));
});

app.get('/search/Users/searchBetweenUsersAges', (request, response) => 
{
    const {age1, age2} = request.body; 
    let result;

    const db = dbService.getDbServiceInstance();    
    result = db.searchBetweenUsersAges(age1, age2);

    result.then(data => response.json({data: data})).catch(err => console.log(err));
});

app.get('/search/Users/searchUsersRegistrationAfterUserID/:userId', (request, response) => 
{
    const {userId} = request.params; 
    let result;

    const db = dbService.getDbServiceInstance();    
    result = db.searchUsersRegistrationAfterUserID(userId);

    result.then(data => response.json({data: data})).catch(err => console.log(err));
});

app.get('/search/Users/searchUsersRegistrationSameAsUserID/:userId', (request, response) => 
{
    const {age1, age2} = request.body; 
    let result;

    const db = dbService.getDbServiceInstance();    
    result = db.searchBetweenUsersAges(age1, age2);

    result.then(data => response.json({data: data})).catch(err => console.log(err));
});

app.get('/search/Users/searchUsersSignedInToday', (request, response) => 
{
    const db = dbService.getDbServiceInstance();    
    const result = db.searchUsersSignedInToday();

    result.then(data => response.json({data: data})).catch(err => console.log(err));
});
*/
// #endregion

// #endregion USERS TABLE

// set up the web server listener
// if we use .env to configure
/*
app.listen(process.env.PORT, 
    () => {
        console.log("I am listening on the configured port " + process.env.PORT)
    }
);
*/

// if we configure here directly
app.listen(5050, 
    () => {
        console.log("I am listening on the fixed port 5050.")
    }
);
