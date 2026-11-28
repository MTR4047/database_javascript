// Backend: application services, accessible by URIs

import express from 'express';
import cors from 'cors';
import crypto from 'crypto'; // Session tokensss
import dotenv from 'dotenv';
import dbService from './db.js'; // Monolithic DBService that hosts compartmentalized services
import { SESSION_TIMEOUT_MS, UPDATE_THRESHOLD_MS, CHECK_INTERVAL_MS, BUCKET_MS, SessionExpirationBuckets, ROLES, SSID_USER_TOKEN, SSID_USER_ID } from '../Public/sessionMGMT.js';
import { userID_alias } from '../Public/constants.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json())
app.use(express.urlencoded({extended: false}));

// #region Authentication & Client Management

/**
 * @typedef {Object} UserSession
 * @property {number} userNumericalID
 * @property {string} [email]
 * @property {string} role
 * @property {number} lastActive
 * @property {number} lastUpdated
 * @property {number|string|undefined} bucketKey
 */

/** @type {Map<string, UserSession>} */ const activeUserSessions = new Map();
// const SESSION_TIMEOUT_MS = 10.5 * 60 * 1000; // 10.5 minutes in milliseconds
// const UPDATE_THRESHOLD_MS = 2 * 60 * 1000; // Update when necessary, 2 minute update threshold

// #region CLEANUP

/* // Inefficient, O(N)
setInterval(() => {
    const now = Date.now();
    for (const [token, session] of activeUserSessions.entries()) // Parse through the active sessions to see 
    {
        if (now - session.lastActive > SESSION_TIMEOUT_MS) 
        { activeUserSessions.delete(token); }
    }
}, 120 * 1000); // Run every two minutes, if session has been inactive for longer than 10.5 minutes, PERISH IT
*/

const sessionBuckets = new SessionExpirationBuckets(BUCKET_MS);

setInterval(() => {
    const now = Date.now();
    const candidateTokens = sessionBuckets.collectExpiredTokens(now);

    for (const token of candidateTokens) 
    {
        const session = activeUserSessions.get(token);
        
        if (session && now - session.lastActive > SESSION_TIMEOUT_MS) 
        { activeUserSessions.delete(token); }
    }
    
}, BUCKET_MS); // Perform cleanup operations every minute

// #endregion CLEANUP

// Helper to register a session


function registerSession(token, numericalID, email, sessionDate = Date.now(), role = ROLES.CLIENT) 
{
    const session = { userNumericalID: numericalID, [userID_alias]: email, role: role, lastActive: sessionDate, lastUpdated: sessionDate, bucketKey: undefined };
    session.bucketKey = sessionBuckets.addTokenToBucket(token, sessionDate + SESSION_TIMEOUT_MS);
    activeUserSessions.set(token, session);
}

function deregisterSession(token) 
{
    if (!token || typeof token !== 'string') return false;

    const session = activeUserSessions.get(token);
    if (!session) return false;

    sessionBuckets.removeTokenFromBucket(token, session.bucketKey);
    return activeUserSessions.delete(token);
}

// Helper to validate incoming tokens on protected endpoints
function authenticateToken(request, response, next) 
{
    const token = request.headers[SSID_USER_TOKEN];
    
    if (!token || !activeUserSessions.has(token)) {
        return response.status(401).json({ success: false, error: 'Unauthorized. Please log in.' });
    }

    const session = activeUserSessions.get(token);
    const now = Date.now();

    if (now - session.lastActive > SESSION_TIMEOUT_MS) {
        activeUserSessions.delete(token);
        if (session.bucketKey !== undefined && sessionBuckets.buckets.has(session.bucketKey)) 
        { sessionBuckets.buckets.get(session.bucketKey).delete(token); }

        return response.status(401).json({ success: false, error: 'Session expired due to inactivity. Please sign in again.' });
    }

    // Throttled Sliding Window: Only update the expiration time if it's been longer than the threshold
    // We have to note that lastActive would not be fully accurate as long as there is a update threshold MS
    if (now - session.lastUpdated > UPDATE_THRESHOLD_MS) {
        session.lastActive = now;
        session.lastUpdated = now; // Track when we last bumped the expiration

        sessionBuckets.moveTokenToNewBucket(token, session, now + SESSION_TIMEOUT_MS);
    }

    // Note that, if we have authenticate token as "parameter" on the endpoint, it becomes a middleware function!!
    // Attach using the shared alias ("email") and extract the identifier value from `session`
    request[userID_alias] = session[userID_alias];
    request.role = session.role;
    request.userNumericalID = session.userNumericalID;
    
    next();
}

// Ping endpoint for the frontend heartbeat
app.post('/api/session/ping', authenticateToken, (request, response) => {
    // authenticateToken middleware automatically updates `lastActive` if valid and within update threshold period
    response.json({ success: true, message: 'Session revived.' });
});

// If the request reaches this point, authenticateToken has already passed, meaning the session exists, is active, and hasn't timed out.
app.post('/validateUserSession', authenticateToken, (request, response) => {
    const userID = request.body?.[userID_alias]; // const { username: userID } = request.body; // Username from frontend sessionStorage
    const serverSessionUserID = request[userID_alias];

    // Check if the frontend value matches the token's true owner on the server
    if (userID && userID !== serverSessionUserID) 
    { return response.status(401).json({ success: false, error: 'Session security violation: User identifier mismatch. Please sign in again.' }); }

    const role = request.role;

    response.json({ success: true, message: "Session exists", [userID_alias]: serverSessionUserID, role: role });
});

app.post('/update/Clients/signIn', (request, response) => {
    const userID = request.body?.[userID_alias]; 
    const { password } = request.body;
    const db = dbService.getInstance().getClientSRV(); // Note that this function primarily deals with the Clients table
    const result = db.signInUser(userID, password);

    result.then(userData => {
        if (userData) 
        {
            let token = crypto.randomUUID();
            while (activeUserSessions.has(token)) { token = crypto.randomUUID(); } // AVOID DUPLICATES
            const now = Date.now();        

            registerSession(token, userData.clientID, userData.email, now, userData.role); // Store session with timestamp            
            response.json({ success: true, data: userData, token: token, activeTime: now }); 
        } 
        else { response.status(401).json({ success: false, error: 'Invalid user ID or password.' }); }
    })
    .catch(err => {
        console.error(err);
        response.status(500).json({ success: false, error: 'Server error during sign in.' });
    });
});

app.post('/update/Clients/signOut', authenticateToken, (request, response) => {
    const token = request.headers[SSID_USER_TOKEN];    
    if (token) { deregisterSession(token); }
    
    response.json({ success: true, message: 'Signed out successfully.' });
});

app.post('/insert/Clients', (request, response) => {
    const userID = request.body?.[userID_alias]; 
    const { password, clientDetails, address, creditCard } = request.body;
    const db = dbService.getInstance().getClientSRV(); 

    db.insertNewUser(userID, password, clientDetails, address, creditCard).then(userData => {
        if (userData) 
        {
            let token = crypto.randomUUID();
            while (activeUserSessions.has(token)) { token = crypto.randomUUID(); } // AVOID DUPLICATES
            const now = Date.now();
            const role = ROLES.CLIENT; // Ana's admin account will always exist prior, so insert does not make sense

            registerSession(token, userData.clientID, userData.email, now, role); // Store session with timestamp
            
            response.json({ success: true, data: userData, token: token, activeTime: now }); 
        } 
        else { response.status(400).json({ success: false, error: 'Registration failed or user already exists.' }); }
    })
    .catch(err => {
        console.error(err);
        response.status(500).json({ success: false, error: 'Server error during registration.' });
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
        'user-session-token': sessionToken,
        'user-id-name': email // email is editable! So we must pass this as a header
    },
    body: JSON.stringify({
        email: 'johndoe',   // Checked against request.email, only sent if it's to be edited
        firstname: 'Jane',     // Extracted into updateData
        lastname: 'Smith'      // Extracted into updateData
    })
})
.then(res => res.json())
.then(data => console.log(data));
*/
app.patch('/update/Clients', authenticateToken, (request, response) => {
    console.log("app: Clients update is called");

    const serverSessionUserID = request[userID_alias];
    const headerUserID = request.headers[SSID_USER_ID]?.trim().toLowerCase();

    if (typeof serverSessionUserID !== 'string' || serverSessionUserID.trim() === '' || !headerUserID || headerUserID !== serverSessionUserID.trim().toLowerCase()) 
    { return response.status(403).json({ success: false, error: 'User must be authenticated and provide their current user ID in the header.' }); }

    const updateData = { ...(request.body ?? {}) };
    if (Object.keys(updateData).length === 0) 
    { return response.status(400).json({ success: false, error: 'No update fields provided.' }); }

    const db = dbService.getInstance().getClientSRV();
    const result = db.updateDetailsByUserID(updateData, serverSessionUserID)

    result.then((updatedRows) => {
        if (!updatedRows) 
        { return response.status(400).json({ success: false, error: 'Profile could not be updated. Check the values and try again.' }); }

        const normalizedCurrentEmail = serverSessionUserID.trim().toLowerCase();
        const requestedNewEmail = typeof updateData[userID_alias] === 'string' ? updateData[userID_alias].trim().toLowerCase(): '';
        const emailChanged = Boolean(requestedNewEmail && requestedNewEmail !== normalizedCurrentEmail);
        const finalEmail = emailChanged ? requestedNewEmail : serverSessionUserID;

        if (emailChanged) 
        {
            const token = request.headers[SSID_USER_TOKEN];
            if (token && activeUserSessions?.has(token)) 
            {
                const session = activeUserSessions.get(token);
                session[userID_alias] = finalEmail;
            }
        }

        return response.json({ success: true, [userID_alias]: finalEmail, userIDChanged: emailChanged });
    })
    .catch((err) => {
        console.error('PATCH /update/Clients error:', err);
        return response.status(500).json({ success: false, error: 'Server error during profile update.' });
    });
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