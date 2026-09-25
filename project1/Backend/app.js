// Backend: application services, accessible by URIs

const express = require('express')
const cors = require ('cors')
const dotenv = require('dotenv')
dotenv.config()

const app = express();

const dbService = require('./dbService');

app.use(cors());
app.use(express.json())
app.use(express.urlencoded({extended: false}));


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

app.get('/getAll/Users', (request, response) => {    
    const db = dbService.getDbServiceInstance();    
    const result =  db.getAllUsersData(); // call a DB function

    result.then(data => response.json({data: data})).catch(err => console.log(err));
});

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

    result.then(data => response.json({success: true})).catch(err => console.log(err));
});

app.delete('/delete/Users/:username', (request, response) => 
{
    const {username} = request.params; console.log("delete " + username);        
    const db = dbService.getDbServiceInstance();    
    const result = db.deleteRowByUsername(username);
    
    result.then(data => response.json({success: true})).catch(err => console.log(err));
});

app.patch('/update/Users', (request, response) =>
{
    console.log("app: Users update is called");

    // Neat thing we can do here because the backend function filters every invalid data call anyway 
    const { username, ...updateData } = request.body;    
    // const username = request.body.username;

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

// A MAP which defines allowable searchable functions for the singular search endpoint
const SEARCH_USER_ACTIONS = new Map([
    [ "searchByUsersName", async (db, params) => 
        { const { name } = params; return await db.searchByUsersName(name); }
    ],
    [ "searchByUsersID", async (db, params) => 
        { const { username } = params; return await db.searchByUsersID(username); }
    ],
    [ "searchBetweenUsersSalary", async (db, params) => 
        { const { minSalary, maxSalary } = params; return await db.searchBetweenUsersSalary(minSalary, maxSalary); }
    ],
    [ "searchBetweenUsersAges", async (db, params) => 
        { const { minAge, maxAge } = params; return await db.searchBetweenUsersAges(minAge, maxAge); }
    ],
    [ "searchUsersRegistrationAfterUserID", async (db, params) => 
        { const { username } = params; return await db.searchUsersRegistrationTimeAfterUserID(username); }
    ],
    [ "searchUsersRegistrationTimeSameAsUserID", async (db, params) => 
        { const { username } = params; return await db.searchUsersRegistrationTimeSameAsUserID(username); }
    ],
    [ "searchNeverSignedInUsers", async (db, params) => 
        { const { } = params; return await db.searchNeverSignedInUsers(); }
    ],
    [ "searchUsersSignedInToday", async (db, params) => 
        { const { } = params; return await db.searchUsersSignedInToday(); }
    ]
]);
Object.freeze(SEARCH_USER_ACTIONS);

app.post('/search/Users/actions', async (request, response) => {
    /* EXAMPLE USE on the FRONTEND
    fetch('/search/Users/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'searchByAgeRange',
            params: { minAge: 21, maxAge: 35 }
        })
    }).then(res => res.json()).then(result => console.log(result.data));
    */

    const { action, params = {} } = request.body;
    const searchFunc = SEARCH_USER_ACTIONS.get(action);

    let errJson;
    if (!searchFunc) 
    {
        errJson = response.status(400).json({ success: false, message: `Invalid or unauthorized search action: '${action}`});
        console.log(errJson);
        return errJson;
    }        
    
    const db = dbService.getDbServiceInstance();
    const result = await searchHandler(db, params);
    result.then(data => response.json({data: data})).catch(err => console.log(err));
});

// Here, because we have a special case of "all" where we have to call another function, we both map this and have an endpoint
app.get('/search/Users/name/:name', (request, response) => 
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
