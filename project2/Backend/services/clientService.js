import { ADDRESS_TC, ADDRESS_TN, CLIENT_TC, CLIENT_TN, limitString, nonAlphanumericRegex, nonNumericRegex, sanitizeDateValue, sanitizeString } from "../../Public/constants.js";
import { ROLES as userRoles } from "../../Public/sessionMGMT.js";
import { DbService, getTransformFn } from "../db.js";
import crypto from 'crypto';
import dotenv from 'dotenv';
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
                const pwQuery = `SELECT ${CLIENT_TC.email}, ${CLIENT_TC.passwordHash}, ${CLIENT_TC.firstname}, ${CLIENT_TC.lastname} FROM ${CLIENT_TN} WHERE ${CLIENT_TC.email} LIKE ?`;
                
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
                [CLIENT_TC.email]: user[CLIENT_TC.email],
                [CLIENT_TC.firstname]: user[CLIENT_TC.firstname],
                [CLIENT_TC.lastname]: user[CLIENT_TC.lastname],
                role: role
            };
        } 
        catch (error) { console.log(error); return false; }
    }

    async insertNewUser(email, password, address = { }, creditCard = { } ) 
    {
        try {
            const CLIENT_TN = ClientService.CLIENT_SRV_TN;      const CLIENT_TC = ClientService.CLIENT_SRV_TC;
            const ADDRESS_TN = ClientService.ADDRESS_SRV_TN;    const ADDRESS_TC = ClientService.ADDRESS_SRV_TC;

            // const dateAdded = new Date();
            const transformedUserID = this.#transformEmail(email); 
            const transformedPassword = this.#transformPassword(password);
            
            const safeAddress = address ?? {};
            const transformedStreet = getTransformFn(this.#transformersAddressMap, ADDRESS_TC.street)?.(safeAddress.street);
            const transformedCity = getTransformFn(this.#transformersAddressMap, ADDRESS_TC.city)?.(safeAddress.city);
            const transformedState = getTransformFn(this.#transformersAddressMap, ADDRESS_TC.state)?.(safeAddress.state);
            const transformedPostalCode = getTransformFn(this.#transformersAddressMap, ADDRESS_TC.postalCode)?.(safeAddress.postalCode);

            // Abort if input validation failed
            if (!transformedUserID || !transformedPassword) { return false; }
            
            const success = await new Promise((resolve, reject) => {
                const query = `INSERT INTO ${CLIENT_TN} (${CLIENT_TC.email}, ${CLIENT_TC.password}) VALUES (?, ?);`;
                
                const hashedPw = hashPasswordPBKDF2(transformedPassword);
                this.#connection.query(query, [transformedUserID, hashedPw], (err, result) => {
                    if (err) reject(new Error(err.message));
                    // Verify 1 row was inserted
                    else resolve(result.affectedRows === 1); 
                });
            });

            if (!success) return false;

            // Return the newly created record using the custom non auto increment primary key
            return {
                [CLIENT_TC.email]: transformedUserID
            };

        } 
        catch (error) { console.log(error); return false; }
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

    async updateAddressDetailsByAddressID(data = {}, addressID) 
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

    // #endregion OPERATIONAL FUNCTIONS

    // #endregion
}