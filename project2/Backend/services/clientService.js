import { ADDRESS_TC, ADDRESS_TN, CLIENT_TC as ADDRESS_TC, CLIENT_TN as ADDRESS_TN, limitString, nonAlphanumericRegex, nonNumericRegex, sanitizeDateValue, sanitizeString, CLIENT_TN, CLIENT_TC, sanitizeInteger } from "../../Public/constants.js";
import { ROLES as userRoles } from "../../Public/sessionMGMT.js";
import { DbService, getTransformFn } from "../db.js";
import crypto from 'crypto';
import dotenv from 'dotenv';
import FinancialService from "./financialService.js";
import ProjectRequestService from "./projectRequestService.js";
dotenv.config();

function hashPasswordPBKDF2(password) 
{
    // Unique 16-byte salt, 64 bytes = 512 bits
    const salt = crypto.randomBytes(16).toString('hex'); 
    const iterations = 10000; const keylen = 64;
    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keylen, 'sha512');
    
    // Store salt + iterations + hash together to be in the DB
    return `${salt}:${iterations}:${derivedKey.toString('hex')}`;
}

function verifyPasswordPBKDF2(plainPWD, storedCombinedHash) 
{
    const [salt, iterations, originalHash] = storedCombinedHash.split(':');    
    const derivedKey = crypto.pbkdf2Sync(plainPWD, salt, parseInt(iterations, 10), 64, 'sha512');
    return derivedKey.toString('hex') === originalHash; // Rehash to compare
}

/** Handles clients, sign ins, registers as well as address services */
export default class ClientService 
{
    #connection; 
    constructor(connection) { this.#connection = connection; }
    updateConnection(connection) { this.#connection = connection; }

    // #region CLIENT TABLE
    static CLIENT_SRV_TN = CLIENT_TN;
    static CLIENT_SRV_TC = CLIENT_TC;
    static ALLOWED_CLIENTS_COLUMNS_SET = new Set(Object.values(this.CLIENT_SRV_TC));
    static ALLOWED_CLIENTS_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_CLIENTS_COLUMNS_SET);
        updateSet.delete(this.CLIENT_SRV_TC.clientID);
        return updateSet;
    })();

    static CLIENT_SRV_STR_LIMITS = Object.freeze({
        [this.CLIENT_SRV_TC.firstname]: 50,
        [this.CLIENT_SRV_TC.lastname]: 50,
        [this.CLIENT_SRV_TC.passwordHash]: 255,
        [this.CLIENT_SRV_TC.phoneNumber]: 50,
        [this.CLIENT_SRV_TC.email]: 100,
        [this.CLIENT_SRV_TC.cardNumber]: 50,
        [this.CLIENT_SRV_TC.cardCVV]: 50
    });

    // Helper strictly for pagination on SELECT queries
    returnOffsetSTMT_Client(page = 1, sortColumn = ClientService.CLIENT_SRV_TC.clientID, isAscending = true) 
    { return DbService.returnOffsetSTMT(page, sortColumn, isAscending); }

    // #region helper update funcs
    // No need to transform Address ID
    #transformersClientsMap = new Map([
        [ClientService.CLIENT_SRV_TC.addressID, (val) => val ],
        
        [ClientService.CLIENT_SRV_TC.firstname, 
            (val) => this.#transformName(val, ClientService.CLIENT_SRV_STR_LIMITS.firstname) 
        ], 
        [ClientService.CLIENT_SRV_TC.lastname, 
            (val) => this.#transformName(val, ClientService.CLIENT_SRV_STR_LIMITS.lastname) 
        ], 
        
        [ClientService.CLIENT_SRV_TC.passwordHash, (val) => this.#transformPassword(val, true) ], 
        
        [ClientService.CLIENT_SRV_TC.phoneNumber, 
            (val) => this.#transformPhoneNumber(val, ClientService.CLIENT_SRV_STR_LIMITS.phoneNumber) 
        ], 
        [ClientService.CLIENT_SRV_TC.email, 
            (val) => this.#transformEmail(val, ClientService.CLIENT_SRV_STR_LIMITS.email) 
        ], 
        [ClientService.CLIENT_SRV_TC.cardNumber, 
            (val) => this.#transformCardNumber(val, ClientService.CLIENT_SRV_STR_LIMITS.cardNumber) 
        ],
        [ClientService.CLIENT_SRV_TC.cardCVV, 
            (val) => this.#transformCVV(val, ClientService.CLIENT_SRV_STR_LIMITS.cardCVV) 
        ],
        
        [ClientService.CLIENT_SRV_TC.cardExpiration, (val) => sanitizeDateValue(val) ]
    ]);
    
    #transformName(val, limit)
    {
        val = sanitizeString(val, limit);
        return typeof val === 'string' ? val: undefined;
    }

    #transformPassword(val, cryptoRun = false) {
        if (typeof val !== 'string') return undefined;

        const trimmed = limitString(val, ClientService.CLIENT_SRV_STR_LIMITS.passwordHash); 
        if (trimmed.length < 8) return undefined;
        
        return cryptoRun === true ? hashPasswordPBKDF2(trimmed): trimmed;
    }

    #transformPhoneNumber(val, limit)
    {
        val = sanitizeString(val, limit);
        if (typeof val !== 'string') return undefined;

        const numeric = val.replace(nonNumericRegex, ""); // +1 111-222-3333 is 15 characters
        return numeric.length >= 10 ? numeric: undefined;
    }
    
    // We can check using the regex in a later step
    #transformEmail(val, limit) 
    {
        val = sanitizeString(val, limit);
        if (typeof val !== 'string') return undefined;
        
        const trimmed = val.toLowerCase();
        return trimmed.length >= 2 ? trimmed: undefined;
    }

    #transformCardNumber(val, limit)
    {
        val = sanitizeString(val, limit);
        if (typeof val !== 'string') return undefined;

        const alphanumeric = val.replace(nonAlphanumericRegex, "");
        return alphanumeric.length >= 3 ? alphanumeric: undefined;
    }
    #transformCVV(val, limit)
    {
        val = sanitizeString(val, limit);
        if (typeof val !== 'string') return undefined;

        const alphanumeric = val.replace(nonAlphanumericRegex, "");
        return alphanumeric.length >= 3 ? alphanumeric: undefined;
    }

    // #endregion HELPER UPDATE FUNCS
    
    // #region OPERATIONAL FUNCTIONS

    async signInUser(email, password)
    {
        try {
            const CLIENT_TN = ClientService.CLIENT_SRV_TN; const CLIENT_TC = ClientService.CLIENT_SRV_TC;

            // const signInAttempt = new Date(); 
            const transformedUserID = this.#transformEmail(email); const transformedPassword = this.#transformPassword(password);
            // Abort if input validation failed
            if (!transformedUserID || !transformedPassword) { return false; }            

            const success = await new Promise((resolve, reject) => {
                const pwQuery = `SELECT ${CLIENT_TC.clientID}, ${CLIENT_TC.email}, ${CLIENT_TC.passwordHash}, ${CLIENT_TC.firstname}, ${CLIENT_TC.lastname} FROM ${CLIENT_TN} WHERE ${CLIENT_TC.email} LIKE ?`;
                
                this.#connection.query(pwQuery, [transformedUserID], (err, results) => {
                    if (err) reject(new Error(err.message));
                    else resolve(results);
                });
            });

            // Step 2: Verify a returned row and PBKDF2 hash against incoming password
            if (!success || success.length === 0) return false; const user = success[0];
            if (!verifyPasswordPBKDF2(transformedPassword, user[CLIENT_TC.passwordHash])) {return false;} // It's better to perform sanitization on the frontend, and hashing on the backend; though for this task, we stuck with sanitization in the backend as well
            
            // Step 3: Add check to see if admin or client
            const role = user[CLIENT_TC.email] === process.env.CONTRACTOR ? userRoles.CONTRACTOR: userRoles.CLIENT;

            // Return the newly created record using the custom non auto increment primary key            
            return {
                [CLIENT_TC.clientID]: user[CLIENT_TC.clientID],
                [CLIENT_TC.email]: user[CLIENT_TC.email],
                [CLIENT_TC.firstname]: user[CLIENT_TC.firstname],
                [CLIENT_TC.lastname]: user[CLIENT_TC.lastname],
                role: role
            };
        } 
        catch (error) { console.log(error); return false; }
    }

    async insertNewUser(email, password, address = {}, creditCard = {}) 
    {
        const CLIENT_TN = ClientService.CLIENT_SRV_TN; const CLIENT_TC = ClientService.CLIENT_SRV_TC;
        const ADDRESS_TC = ClientService.ADDRESS_SRV_TC;

        const runQuery = (sql, params = []) =>
            new Promise((resolve, reject) => {
                this.#connection.query(sql, params, (err, result) => {
                    if (err) reject(new Error(err.message));
                    else resolve(result);
                });
            });

        let inTransaction = false;

        try {
            // 1. Transform & validate all inputs upfront
            const transformedUserID = this.#transformEmail(email);
            const transformedPassword = this.#transformPassword(password);

            const safeAddr = address ?? {};
            const transformedStreet = getTransformFn(this.#transformersAddressMap, ADDRESS_TC.street)?.(safeAddr.street);
            const transformedCity = getTransformFn(this.#transformersAddressMap, ADDRESS_TC.city)?.(safeAddr.city);
            const transformedState = getTransformFn(this.#transformersAddressMap, ADDRESS_TC.state)?.(safeAddr.state);
            const transformedPostalCode = getTransformFn(this.#transformersAddressMap, ADDRESS_TC.postalCode)?.(safeAddr.postalCode);

            const safeCC = creditCard ?? {};
            const transformedCardNumber = getTransformFn(this.#transformersClientsMap, CLIENT_TC.cardNumber)?.(safeCC.cardNumber); 
            const transformedCardCVV = getTransformFn(this.#transformersClientsMap, CLIENT_TC.cardCVV)?.(safeCC.cardCVV);
            const transformedCardExpiry = getTransformFn(this.#transformersClientsMap, CLIENT_TC.cardExpiration)?.(safeCC.cardExpiration);

            const invalidAddr = Boolean(!transformedStreet || !transformedCity || !transformedState || !transformedPostalCode);
            const invalidCC = Boolean(!transformedCardNumber || !transformedCardCVV || !transformedCardExpiry);

            if (!transformedUserID || !transformedPassword || invalidAddr || invalidCC) { return false; }

            // 2. Start transaction
            await runQuery('BEGIN;'); inTransaction = true;

            // 3. Resolve existing addressID or create a new Address row on this connection
            let addressID = await this.checkAddressIDByContents(transformedStreet, transformedCity, transformedState, transformedPostalCode);

            if (addressID === null) 
            {
                const insertedAddress = await this.insertNewAddress(transformedStreet, transformedCity, transformedState, transformedPostalCode);

                if (!insertedAddress || typeof insertedAddress[ADDRESS_TC.addressID] !== 'number') 
                { throw new Error('Failed to create new address row'); }

                addressID = insertedAddress[ADDRESS_TC.addressID];
            }

            // 4. Single atomic INSERT into Client with addressID and credit card fields
            const hashedPw = hashPasswordPBKDF2(transformedPassword);
            const userInsertSql = `INSERT INTO ${CLIENT_TN} (${CLIENT_TC.email}, ${CLIENT_TC.password}, ${CLIENT_TC.addressID}, ${CLIENT_TC.cardNumber}, ${CLIENT_TC.cardCVV}, ${CLIENT_TC.cardExpiration}) VALUES (?, ?, ?, ?, ?, ?);`;
            const userResult = await runQuery(userInsertSql, [ transformedUserID, hashedPw, addressID, transformedCardNumber, transformedCardCVV, transformedCardExpiry ]);

            if (userResult?.affectedRows !== 1) 
            { throw new Error('Client insert did not affect 1 row'); }

            // 5. Commit all changes together
            await runQuery('COMMIT;'); inTransaction = false;

            // Insert always assume client
            const role = userRoles.CLIENT;

            return {
                [CLIENT_TC.clientID]: userResult.insertId,
                [CLIENT_TC.email]: transformedUserID,
                [ADDRESS_TC.addressID]: addressID,
                role: role
            };
        } 
        catch (error) 
        {
            if (inTransaction) 
            {
                try { await runQuery('ROLLBACK;'); } 
                catch (rollbackErr) { console.error('Transaction rollback failed:', rollbackErr); }
            }
            console.log(error); return false;
        }
    }

    /*
    async deleteRowByUserID(email)
    {
        try
        {
            const CLIENT_TN = ClientService.CLIENT_SRV_TN; const CLIENT_TC = ClientService.CLIENT_SRV_TC;
            const transformedUserID = this.#transformEmail(email);
            
            // use await to call an asynchronous function
            const response = await new Promise((resolve, reject) => {
                const query = `DELETE FROM ${CLIENT_TN} WHERE ${CLIENT_TC.email} = ?;`;
                connection.query(query, [transformedUserID], (err, result) => {
                    if(err) reject(new Error(err.message));
                    else resolve(result.affectedRows);
                });
            });

            console.log(response);  // for debugging to see the result of select
            return response === 1 ? true: false;
        }
        catch(error) { console.log(error); return false; }
    }
    */

    async updateDetailsByUserID(data = {}, originalUserID) 
    {
        try {
            const CLIENT_TN = ClientService.CLIENT_SRV_TN; const CLIENT_TC = ClientService.CLIENT_SRV_TC;
            const setClauses = []; const queryParams = [];

            // For every key value pair given
            for (const [key, value] of Object.entries(data)) 
            {
                // Fast O(1) check against the allowable updatable Set
                if (ClientService.ALLOWED_CLIENTS_UPDATE_SET.has(key)) 
                {
                    // Get precise field transformer or fall back to raw value
                    const transform = this.#transformersClientsMap.get(key);
                    const processedValue = transform ? transform(value): value;

                    // Only append valid, successfully parsed attributes
                    if (processedValue !== undefined) { setClauses.push(`${key} = ?`); queryParams.push(processedValue); }
                }
            }

            // If no fields passed validation, abort query execution
            if (setClauses.length === 0) return false;

            queryParams.push(originalUserID); // The very last ? refers to the username ID
            const query = `UPDATE ${CLIENT_TN} SET ${setClauses.join(', ')} WHERE ${CLIENT_TC.username} = ?;`;

            const response = await new Promise((resolve, reject) => {
                this.#connection.query(query, queryParams, (err, result) => {
                    if (err) reject(new Error(err.message));
                    else resolve(result.affectedRows);
                });
            });
            
            console.log(response);
            return response;
        } 
        catch (error) { console.log(error); return false; }
    }

    // #endregion OPERATIONAL FUNCTIONS

    // #endregion

    // #region ADDRESS TABLE
    static ADDRESS_SRV_TN = ADDRESS_TN;
    static ADDRESS_SRV_TC = ADDRESS_TC;
    static ALLOWED_ADDRESS_COLUMNS_SET = new Set(Object.values(this.ADDRESS_SRV_TC));
    static ALLOWED_ADDRESS_UPDATE_SET = (() => {
        const updateSet = new Set(this.ALLOWED_ADDRESS_COLUMNS_SET);
        updateSet.delete(this.ADDRESS_SRV_TC.addressID);
        return updateSet;
    })();

    static ADDRESS_SRV_STR_LIMITS = Object.freeze({
        [this.ADDRESS_SRV_TC.street]: 100,
        [this.ADDRESS_SRV_TC.city]: 50,
        [this.ADDRESS_SRV_TC.state]: 2,
        [this.ADDRESS_SRV_TC.postalCode]: 50
    });

    static states = new Map([
        ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
        ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
        ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
        ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
        ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
        ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"],
        ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
        ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
        ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"],
        ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"],
        ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
        ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
        ["VT", "Vermont"], ["VA", "Virginia"],
        ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],

        ["DC", "District of Columbia"],
        ["AS", "American Samoa"],
        ["GU", "Guam"],
        ["MP", "Northern Mariana Islands"],
        ["PR", "Puerto Rico"],
        ["UM", "United States Minor Outlying Islands"],
        ["VI", "Virgin Islands, U.S."]
    ]);    

    // Helper strictly for pagination on SELECT queries
    returnOffsetSTMT_Address(page = 1, sortColumn = ClientService.ADDRESS_SRV_TC.addressID, isAscending = true) 
    { return DbService.returnOffsetSTMT(page, sortColumn, isAscending); }

    // #region helper update funcs
    // No need to transform Address ID
    #transformersAddressMap = new Map([
        [ClientService.ADDRESS_SRV_TC.street, 
            (val) => this.#transformAddressStreet(val, ClientService.ADDRESS_SRV_STR_LIMITS.street)
        ],
        [ClientService.ADDRESS_SRV_TC.city, 
            (val) => this.#transformAddressCity(val, ClientService.ADDRESS_SRV_STR_LIMITS.city)
        ],
        [ClientService.ADDRESS_SRV_TC.state, 
            (val) => this.#transformAddressState(val, ClientService.ADDRESS_SRV_STR_LIMITS.state)
        ],
        [ClientService.ADDRESS_SRV_TC.postalCode, 
            (val) => this.#transformAddressPostalCode(val, ClientService.ADDRESS_SRV_STR_LIMITS.postalCode)
        ]
    ]);
    
    #transformAddressStreet(val, limit) 
    {
        val = sanitizeString(val, limit);
        if (typeof val !== 'string') return undefined;

        return val.length > 0 ? val: undefined;
    }
    #transformAddressCity(val, limit) 
    {
        val = sanitizeString(val, limit);
        if (typeof val !== 'string') return undefined;

        return val.length > 0 ? val: undefined;
    }
    // Drop down input
    #transformAddressState(val) 
    {
        val = sanitizeString(val, limit);
        if (typeof val !== 'string') return undefined;

        const code = val.trim().toUpperCase();
        return ClientService.states.has(code) ? code : undefined;
    }
    #transformAddressPostalCode(val, limit)
    {
        val = sanitizeString(val, limit);
        if (typeof val !== 'string') return undefined;

        return val.length > 0 ? val: undefined;
    }
    
    // #endregion

    // #region OPERATIONAL FUNCTIONS

    async updateAddressDetailsByAddressID(data = {}, addressID, clientID) 
    {
        try {
            const ADDRESS_TN = ClientService.ADDRESS_SRV_TN; const ADDRESS_TC = ClientService.ADDRESS_SRV_TC;
            const setClauses = []; const queryParams = [];

            // For every key value pair given
            for (const [key, value] of Object.entries(data)) 
            {
                // Fast O(1) check against the allowable updatable Set
                if (ClientService.ALLOWED_ADDRESS_UPDATE_SET.has(key)) 
                {
                    // Get precise field transformer or fall back to raw value
                    const transform = this.#transformersClientsMap.get(key);
                    const processedValue = transform ? transform(value): value;

                    // Only append valid, successfully parsed attributes
                    if (processedValue !== undefined) { setClauses.push(`${key} = ?`); queryParams.push(processedValue); }
                }
            }

            // If no fields passed validation, abort query execution
            if (setClauses.length === 0) return false;

            queryParams.push(addressID); // The very last ? refers to the username ID
            const query = `UPDATE ${ADDRESS_TN} SET ${setClauses.join(', ')} WHERE ${ADDRESS_TC.addressID} = ?;`;

            const response = await new Promise((resolve, reject) => {
                this.#connection.query(query, queryParams, (err, result) => {
                    if (err) reject(new Error(err.message));
                    else resolve(result.affectedRows);
                });
            });
            
            console.log(response);
            return response;
        }
        catch (error) { console.log(error); return false; }
    }

    async updateAddress(data = {}, addressID, clientID, { updatingPrimary = true, requestID = null } = {}) 
    {
        const ADDRESS_TN = ClientService.ADDRESS_SRV_TN; const ADDRESS_TC = ClientService.ADDRESS_SRV_TC;
        const CLIENT_TN = ClientService.CLIENT_SRV_TN; const CLIENT_TC = ClientService.CLIENT_SRV_TC;
        const REQUEST_TN = ProjectRequestService.FLOORING_REQUEST_SRV_TN; const REQUEST_TC = ProjectRequestService.FLOORING_REQUEST_SRV_TC;

        const cleanClientID = sanitizeInteger(clientID, true);
        const cleanRequestID = requestID != null ? sanitizeInteger(requestID, true): null;
        let cleanAddressID = addressID != null ? sanitizeInteger(addressID, true): null;

        if (!cleanClientID) return false;
        if (!updatingPrimary && !cleanRequestID) return false;

        const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
            this.#connection.query(sql, params, (err, result) => {
                if (err) reject(new Error(err.message));
                else resolve(result);
            });
        });

        let inTransaction = false;
        try 
        {
            // When updating a secondary/request address, confirm request ownership and resolve its serviceAddressID
            // Secondary addresses ought to be uneditable on the dashboard, only on the flooring request view
            if (!updatingPrimary) 
            {
                const reqRows = await runQuery(
                    `SELECT ${REQUEST_TC.serviceAddressID} FROM ${REQUEST_TN} WHERE ${REQUEST_TC.requestID} = ? AND ${REQUEST_TC.clientID} = ? LIMIT 1;`,
                    [cleanRequestID, cleanClientID]
                );
                const reqRow = reqRows?.[0];
                if (!reqRow) return false;
                cleanAddressID = cleanAddressID ?? sanitizeInteger(reqRow.serviceAddressID, true);
            }

            if (!cleanAddressID) return false;

            const addrRows = await runQuery(`SELECT * FROM ${ADDRESS_TN} WHERE ${ADDRESS_TC.addressID} = ? LIMIT 1;`, [cleanAddressID]);
            const currentRow = addrRows?.[0];
            if (!currentRow) return false;

            const nextValues = { 
                [ADDRESS_TC.street]: currentRow[ADDRESS_TC.street],
                [ADDRESS_TC.city]: currentRow[ADDRESS_TC.city],
                [ADDRESS_TC.state]: currentRow[ADDRESS_TC.state],
                [ADDRESS_TC.postalCode]: currentRow[ADDRESS_TC.postalCode]
            };

            let appliedAny = false;
            for (const [key, value] of Object.entries(data ?? {})) 
            {
                if (ClientService.ALLOWED_ADDRESS_UPDATE_SET.has(key)) 
                {
                    const transform = this.#transformersAddressMap.get(key);
                    const processedValue = transform ? transform(value): value;
                    if (processedValue !== undefined) { nextValues[key] = processedValue; appliedAny = true; }
                }
            }

            if (!appliedAny) return false;

            const shared = await this.#isAddressSharedOrReferenced(cleanAddressID, cleanClientID);

            await runQuery('BEGIN;');
            inTransaction = true;

            let targetAddressID = cleanAddressID;

            // If not shared by users, this is simple to update in place in the Address Table
            if (!shared) 
            {
                const cols = Object.keys(nextValues);
                const setSql = cols.map((col) => `${col} = ?`).join(', ');
                await runQuery( `UPDATE ${ADDRESS_TN} SET ${setSql} WHERE ${ADDRESS_TC.addressID} = ?;`, [...Object.values(nextValues), cleanAddressID] );
            } 
            else 
            {
                // Check if there's any existing address same as the newly updated address
                const existingID = await this.checkAddressIDByContents(nextValues[ADDRESS_TC.street], nextValues[ADDRESS_TC.city], nextValues[ADDRESS_TC.state], nextValues[ADDRESS_TC.postalCode]);

                // If there is, the target address ID is the pre-existing ID
                if (existingID !== null) 
                { 
                    targetAddressID = existingID; 
                } 
                else 
                {
                    // Otherwise, we insert the address
                    const inserted = await this.insertNewAddress(nextValues[ADDRESS_TC.street], nextValues[ADDRESS_TC.city], nextValues[ADDRESS_TC.state], nextValues[ADDRESS_TC.postalCode]);
                    if (!inserted || typeof inserted[ADDRESS_TC.addressID] !== 'number') { throw new Error('Failed to insert copy-on-write address'); }

                    targetAddressID = inserted[ADDRESS_TC.addressID];
                }
            }

            // The initial address ID inputted is different, that happens only when the original address was shared with another client or flooring request
            // The updated address resolved to either a newly inserted address or an existing Address row that already matched the new contents
            const addressIDShared = targetAddressID !== cleanAddressID;
            if (updatingPrimary) 
            {
                await runQuery(`UPDATE ${CLIENT_TN} SET ${CLIENT_TC.addressID} = ? WHERE ${CLIENT_TC.clientID} = ?;`, [targetAddressID, cleanClientID]);

                // This means that 
                if (addressIDShared) 
                {
                    // We can run this query even if there are no flooring requests for a particular address
                    await runQuery(`UPDATE ${REQUEST_TN} SET ${REQUEST_TC.serviceAddressID} = ? WHERE ${REQUEST_TC.clientID} = ? AND ${REQUEST_TC.serviceAddressID} = ?;`,
                        [targetAddressID, cleanClientID, cleanAddressID]
                    );
                }
            } 
            else 
            {
                await runQuery(`UPDATE ${REQUEST_TN} SET ${REQUEST_TC.serviceAddressID} = ? WHERE ${REQUEST_TC.requestID} = ? AND ${REQUEST_TC.clientID} = ?;`,
                    [targetAddressID, cleanRequestID, cleanClientID]
                );
            }

            await runQuery('COMMIT;');
            inTransaction = false;

            return {
                [ADDRESS_TC.addressID]: targetAddressID,
                copiedOnWrite: shared && addressIDShared
            };
        } 
        catch (error) 
        {
            if (inTransaction) 
            {
                try { await runQuery('ROLLBACK;'); } 
                catch (rollbackErr) { console.error('Rollback failed:', rollbackErr); }
            }
            console.log(error); return false;
        }
    }

    async insertNewAddress(street, city, state, postalCode)
    {
        try {
            const ADDRESS_TN = ClientService.ADDRESS_SRV_TN; const ADDRESS_TC = ClientService.ADDRESS_SRV_TC;

            const transformedStreet = getTransformFn(this.#transformersAddressMap, ADDRESS_TC.street)?.(street);
            const transformedCity = getTransformFn(this.#transformersAddressMap, ADDRESS_TC.city)?.(city);
            const transformedState = getTransformFn(this.#transformersAddressMap, ADDRESS_TC.state)?.(state);
            const transformedPostalCode = getTransformFn(this.#transformersAddressMap, ADDRESS_TC.postalCode)?.(postalCode);

            if (!transformedStreet || !transformedCity || !transformedState || !transformedPostalCode) {return false;}
            const insertID = await new Promise((resolve, reject) => {
                const query = `INSERT INTO ${ADDRESS_TN} (${ADDRESS_TC.street}, ${ADDRESS_TC.city}, ${ADDRESS_TC.state}, ${ADDRESS_TC.postalCode}) VALUES (?, ?, ?, ?);`;
                
                this.#connection.query(query, [transformedStreet, transformedCity, transformedState, transformedPostalCode], (err, result) => {
                    if (err) reject(new Error(err.message));
                    // Verify 1 row was inserted
                    else resolve(result?.insertId); 
                });
            });

            if (typeof insertID !== 'number' || isNaN(insertID)) return false;
            return {
                [ADDRESS_TC.addressID]: insertID,
                [ADDRESS_TC.street]: transformedStreet,
                [ADDRESS_TC.city]: transformedCity,
                [ADDRESS_TC.state]: transformedState,
                [ADDRESS_TC.postalCode]: transformedPostalCode
            };
        }
        catch (error) { console.log(error); return false; }
    }
    async checkAddressIDByContents(street, city, state, postalCode)
    {
        const ADDRESS_TN = ClientService.ADDRESS_SRV_TN; const ADDRESS_TC = ClientService.ADDRESS_SRV_TC;

        const selectExistingID = () =>
            new Promise((resolve, reject) => {
                const selectSql = `SELECT ${ADDRESS_TC.addressID} FROM ${ADDRESS_TN} 
                    WHERE ${ADDRESS_TC.street} = ? AND ${ADDRESS_TC.city} = ? AND ${ADDRESS_TC.state} = ? AND ${ADDRESS_TC.postalCode} = ?
                    LIMIT 1;`;
                
                this.#connection.query(selectSql, [street, city, state, postalCode], (err, rows) => {
                    if (err) reject(new Error(err.message));
                    else resolve(rows?.[0]?.[ADDRESS_TC.addressID] ?? null);
                });
            });

        // Fast path: reuse existing row if already present
        const existingID = await selectExistingID();
        if (existingID !== null) { return existingID; }   
    }
    async #isAddressSharedOrReferenced(addressID, clientID) 
    {
        const CLIENT_TN = ClientService.CLIENT_SRV_TN; const CLIENT_TC = ClientService.CLIENT_SRV_TC;
        const REQUEST_TN = ProjectRequestService.FLOORING_REQUEST_SRV_TN; const REQUEST_TC = ProjectRequestService.FLOORING_REQUEST_SRV_TC;

        const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
            this.#connection.query(sql, params, (err, rows) => {
                if (err) reject(new Error(err.message));
                else resolve(rows);
            });
        });

        // 1. Any OTHER client using this addressID?
        const otherClientRows = await runQuery(`SELECT COUNT(*) AS cnt FROM ${CLIENT_TN} WHERE ${CLIENT_TC.addressID} = ? AND ${CLIENT_TC.clientID} <> ?;`, [addressID, clientID]);
        if (Number(otherClientRows?.[0]?.cnt ?? 0) > 0) { return true; }

        // 2. Any FlooringRequest referencing this addressID (for another client or historical order)?
        const otherClientReqRows = await runQuery(`SELECT COUNT(*) AS cnt FROM ${REQUEST_TN} WHERE ${REQUEST_TC.serviceAddressID} = ? AND ${REQUEST_TC.clientID} <> ?;`, [addressID, clientID]);
        return Number(otherClientReqRows?.[0]?.cnt ?? 0) > 0;
    }


    // #endregion OPERATIONAL FUNCTIONS

    // #endregion
}