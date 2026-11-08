// Backend: application services, accessible by URIs

const express = require('express');
const cors = require ('cors');
const crypto = require('crypto'); 
const app = express();

import express from 'express';
import cors from 'cors';
import crypto from 'crypto'; // Session tokensss
import dotenv from 'dotenv';
import dbService from './db.js'; // Monolithic DBService that hosts compartmentalized services

app.use(cors());
app.use(express.json())
app.use(express.urlencoded({extended: false}));

// #region Authentication & Client Management
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

app.post('/update/Clients/signIn', (request, response) => {
    const { username, password } = request.body;
    const db = dbService.getInstance().getClientSRV(); // Note that this function primarily deals with the Clients table
    const result = db.signInUser(username, password);

    result.then(userData => {
        if (userData) 
        {
            let token = crypto.randomUUID();
            while (activeUserSessions.has(token)) { token = crypto.randomUUID(); }
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

app.post('/update/Clients/signOut', authenticateToken, (request, response) => {
    const token = request.headers['user-session-token'];
    
    if (token) { activeUserSessions.delete(token); }
    
    response.json({ success: true, message: 'Signed out successfully.' });
});

app.post('/insert/Clients', (request, response) => {
    const { username, password } = request.body;
    const db = dbService.getInstance().getClientSRV(); 

    db.insertNewUser(username, password).then(userData => {
        if (userData) 
        {
            let token = crypto.randomUUID();
            while (activeUserSessions.has(token)) { token = crypto.randomUUID(); }
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


/* Here, on the app.js, we have to pass something like fetch(http://localhost:5050/delete/Users/${username}),  
{ method: 'DELETE', headers: { 'user-session-token': sessionToken }, body: JSON.stringify({username: username}) }).then
*/
app.delete('/delete/Clients', authenticateToken, (request, response) => 
{
    const { username } = request.body; console.log("delete " + username);   
    
    const authUser = request.username;
    if (username !== authUser) 
    { return response.status(403).json({ success: false, error: 'User must be authenticated and can only delete their own records.' }); }

    const token = request.headers['user-session-token'];
    const db = dbService.getInstance().getClientSRV();
    const result = db.deleteRowByUsername(username);
    
    result.then(data => {
        // Remove active token from server memory map; Return success payload to client
        if (token) { activeUserSessions.delete(token); }            
        response.json({ success: true });
    })
    .catch(err => {
        console.error('Database deletion error:', err);
        response.status(500).json({ success: false, error: 'Database deletion failed.' });
    });
});

// #endregion Authentication

// #region CLIENTS TABLE

// Here, because we have a special case of "all" where we have to call another function, we both map this and have an endpoint
app.get('/search/Clients/name/:name/:page', authenticateToken, (request, response) => 
{
    const {name} = request.params; console.log(name);
    const page = parseInt(request.params.page, 10) || 1;
    let result;

    const db = dbService.getInstance().getClientSRV();
    if(name.toLowerCase() === "all") result = db.getAllUsersData(page, 100);
    else result =  db.searchByUsersName(page, name); // call a DB function

    result.then(data => response.json({data: data})).catch(err => console.log(err));
});

/* Here, on the app.js, we have to pass something like 
fetch('http://localhost:5050/update/Clients', {
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
app.patch('/update/Clients', authenticateToken, (request, response) =>
{
    console.log("app: Clients update is called");

    // Neat thing we can do here because the backend function filters every invalid data call anyway 
    const { username, ...updateData } = request.body;    
    // const username = request.body.username;

    const authUser = request.username;
    if (username !== authUser) 
    { return response.status(403).json({ success: false, error: 'User must be authenticated and can only update their own records.' }); }

    const db = dbService.getInstance().getClientSRV();
    const result = db.updateDetailsByUsername(updateData, username);

    result.then(data => {
        // updateDetailsByUsername returns the number of rows updated, or false if the update failed
        if (data) response.json({ success: true });
        else response.status(400).json({ success: false, error: 'Profile could not be updated. Check the values and try again.' });
    }).catch(err => { console.log(err); response.status(500).json({ success: false, error: 'Server error during profile update.' }); });
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
    "searchUsersRegisteredToday": async (db, params) => {
        const { } = params;
        return await db.searchUsersRegisteredToday();
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
    [constantsSQL.srchOps.searchUsersRegisteredToday.key,                async (db, page) => { return await db.searchUsersRegisteredToday(page) } ]
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

    if (!searchFunc) 
    {
        console.log(`Invalid or unauthorized search action: '${action}'`);
        return response.status(400).json({ success: false, message: `Invalid or unauthorized search action: '${action}'` });
    }

    try 
    {
        const db = dbService.getInstance();
        const data = await searchFunc(db, page, params); 
        return response.json({ data: data });
    } 
    catch (err) 
    {
        console.error('Search action failed:', err);
        return response.status(500).json({ 
            success: false, 
            message: 'Database query execution failed.' 
        });
    }
});

// #endregion

// #endregion USERS TABLE

// set up the web server listener
dotenv.config();
app.listen(process.env.PORT, 
    () => {
        console.log("I am listening on the configured port " + process.env.PORT)
    }
);