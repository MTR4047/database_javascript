// database services, accessbile by DbService methods.

const crypto = require('crypto');
const mysql = require('mysql');
const dotenv = require('dotenv');
const constantsJS = require('../Public/constantsSQL.js');
dotenv.config(); // read from .env file

let instance = null; 

// if you use .env to configure
console.log("HOST: " + process.env.HOST);
console.log("DB USER: " + process.env.DB_USER);
console.log("PASSWORD: " + process.env.PASSWORD);
console.log("DATABASE: " + process.env.DATABASE);
console.log("DB PORT: " + process.env.DB_PORT);

const connection = mysql.createConnection({
     host: process.env.HOST,
     user: process.env.DB_USER,        
     password: process.env.PASSWORD,
     database: process.env.DATABASE,
     port: process.env.DB_PORT
});

connection.connect((err) => {
     if(err){
        console.log(err.message);
     }
     console.log('db ' + connection.state);    // to see if the DB is connected or not
});

// the following are database functions, 

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

class DbService
{
    static #offset = constantsJS.tableLimit; // The frontend simply sensd in the page #, and we multiply using the offset with ((page-1)*offset)
    static #limit = this.#offset + 1; // The frontend does not see this nor can it modify this, this is simply the limit of rows per page, the +1 here is a trick to enable the "next" button

    static getDbServiceInstance() {
        if (!instance) { instance = new DbService(); }
        return instance;
    }

    // only one instance is sufficient
    // static getDbServiceInstance(){ return instance? instance: new DbService(); }

    // #region NEW Users TABLE FUNCS
    static USERS_TABLE_NAME = constantsJS.USERS_TABLE_NAME;
    static USERS_TABLE_COLUMNS = constantsJS.USERS_TABLE_COLUMNS;
    static ALLOWED_USERS_COLUMNS_SET = new Set(Object.values(DbService.USERS_TABLE_COLUMNS));
    static ALLOWED_USERS_UPDATE_SET = (() => {
        const updateSet = new Set(DbService.ALLOWED_USERS_COLUMNS_SET);
        updateSet.delete(DbService.USERS_TABLE_COLUMNS.registerday);
        updateSet.delete(DbService.USERS_TABLE_COLUMNS.signintime);
        return updateSet;
    })();

    // #region helper update funcs
    /** Helper to transform/format data before writing to DB */
    #transformersUsersMap = new Map([
        [DbService.USERS_TABLE_COLUMNS.username, this.#transformUsername.bind(this)],
        [DbService.USERS_TABLE_COLUMNS.password, (val) => this.#transformPassword(val, true)],
        [DbService.USERS_TABLE_COLUMNS.firstname, (val) => this.#transformFirstname(val)],
        [DbService.USERS_TABLE_COLUMNS.lastname, (val) => this.#transformLastname(val)],
        [DbService.USERS_TABLE_COLUMNS.salary, (val) => this.#transformSalary(val)],
        [DbService.USERS_TABLE_COLUMNS.age, (val) => this.#transformAge(val)]
    ]);

    #transformToValidInput(val) {
        if (typeof val !== 'string') return val;

        // Matches specified dangerous/unwanted punctuation: ' " ? ! = ` \ ; < >
        // Replaces matches with an empty string ''; double protection (as SQL query parameters handle this already)
        const sanitized = val.replace(/['"?!=`\\;<>]/g, '');

        return sanitized;
    }
    
    #transformUsername(val) {
        val = this.#transformToValidInput(val);
        if (typeof val !== 'string') return undefined;
        const trimmed = val.trim();
        return trimmed.length >= 2 ? trimmed : undefined;
    }

    // Note here, we don't run the crypto funcs necessarily
    #transformPassword(val, cryptoRun = false) {
        val = this.#transformToValidInput(val);
        if (typeof val !== 'string') return undefined;

        const trimmed = val.trim(); 
        if (trimmed.length < 8) return undefined;
        
        return cryptoRun === true ? hashPasswordPBKDF2(trimmed): trimmed;
    }

    #transformFirstname(val) {
        val = this.#transformToValidInput(val);
        return typeof val === 'string' ? val.trim().substring(0, 256) : undefined;
    }

    #transformLastname(val) {
        val = this.#transformToValidInput(val);
        return typeof val === 'string' ? val.trim().substring(0, 256) : undefined;
    }

    #transformSalary(val) {
        val = this.#transformToValidInput(val);
        const parsed = parseFloat(val);
        return (!isNaN(parsed) && parsed >= 0) ? parsed: undefined;
    }

    #transformAge(val) {
        val = this.#transformToValidInput(val);
        const parsed = parseInt(val, 10);
        return (!isNaN(parsed) && parsed >= 0 && parsed <= 120) ? parsed: undefined;
    }
    // #endregion helper update funcs

    // Private helper strictly for pagination on SELECT queries
    #returnOffsetSTMT(page = 1, sortColumn = DbService.USERS_TABLE_COLUMNS.username, isAscending = true) 
    {
        // Ensure valid page number (minimum 1); we can instead do this outside the function, ensuring that the valid page 
        // const validPage = Math.max(1, parseInt(page, 10) || 1);
        
        // Calculate offset dynamically per request, fetch 1 extra row to calculate hasNextPage
        const offset = (page - 1) * DbService.#offset;
        const fetchLimit = DbService.#limit;        
        const direction = isAscending ? 'ASC' : 'DESC';

        // MUST BE: ORDER BY ... LIMIT ... OFFSET ...
        return `ORDER BY ${sortColumn} ${direction} LIMIT ${fetchLimit} OFFSET ${offset};`;
    }
    
    // Extract the first thousand users, pagination here is custom
    async getAllUsersData(page = 1, offset = DbService.#offset, order = DbService.USERS_TABLE_COLUMNS.username)
    {
        try {
            const USR_TC = DbService.USERS_TABLE_COLUMNS;
            page = constantsJS.fixPage(page);
            if (!DbService.ALLOWED_USERS_COLUMNS_SET.has(order)) order = DbService.USERS_TABLE_COLUMNS.username;
           // use await to call an asynchronous function
           const response = await new Promise((resolve, reject) => {
                const selection = `${USR_TC.username}, ${USR_TC.firstname}, ${USR_TC.lastname}, ${USR_TC.salary}, ${USR_TC.age},${USR_TC.registerday}, ${USR_TC.signintime}`
                const query = `SELECT ${selection} FROM ${DbService.USERS_TABLE_NAME} ORDER BY ${order} ASC LIMIT ${offset + 1} OFFSET ${(page - 1) * offset};`;
                connection.query(query, (err, results) => {
                    if(err) reject(new Error(err.message));
                    else resolve(results);
                });
            });
        
            // console.log("dbServices.js: search result:");
            // console.log(response);  // for debugging to see the result of select
            return response;
        } 
        catch(error) { console.log(error); return false; }
   }

    async signInUser(username, password)
    {
        try {
            const USR_TN = DbService.USERS_TABLE_NAME; const USR_TC = DbService.USERS_TABLE_COLUMNS;

            const signInAttempt = new Date(); 
            const transformedUsername = this.#transformUsername(username); const transformedPassword = this.#transformPassword(password);
            // Abort if input validation failed
            if (!transformedUsername || !transformedPassword) { return false; }            

            const success = await new Promise((resolve, reject) => {
                const pwQuery = `SELECT ${USR_TC.username}, ${USR_TC.password}, ${USR_TC.firstname}, ${USR_TC.lastname} FROM ${USR_TN} WHERE ${USR_TC.username} LIKE ?`;
                
                connection.query(pwQuery, [transformedUsername], (err, results) => {
                    if (err) reject(new Error(err.message));
                    else resolve(results);
                });
            });

            // Step 2: Verify a returned row and PBKDF2 hash against incoming password
            if (!success || success.length === 0) return false; const user = success[0];
            if (!verifyPasswordPBKDF2(transformedPassword, user[USR_TC.password])) {return false;} // It's better to perform sanitization on the frontend, and hashing on the backend; though for this task, we stuck with sanitization in the backend as well
            
            // Step 3: Update sign-in timestamp for the authenticated user
            const updateSuccess = await new Promise((resolve, reject) => {
                const updateQuery = `UPDATE ${USR_TN} SET ${USR_TC.signintime} = ? WHERE ${USR_TC.username} = ?;`;

                connection.query(updateQuery, [signInAttempt, user[USR_TC.username]], (err, result) => {
                    if (err) reject(new Error(err.message));
                    else resolve(result.affectedRows === 1);
                });
            });

            if (!updateSuccess) return false;

            // Return the newly created record using the custom non auto increment primary key            
            return {
                [USR_TC.username]: user[USR_TC.username],
                [USR_TC.firstname]: user[USR_TC.firstname],
                [USR_TC.lastname]: user[USR_TC.lastname],
                [USR_TC.signintime]: signInAttempt
            };
        } 
        catch (error) { console.log(error); return false; }
    }

    async insertNewUser(username, password) 
    {
        try {
            const USR_TN = DbService.USERS_TABLE_NAME; const USR_TC = DbService.USERS_TABLE_COLUMNS;

            const dateAdded = new Date();
            const transformedUsername = this.#transformUsername(username); const transformedPassword = this.#transformPassword(password);
            // Abort if input validation failed
            if (!transformedUsername || !transformedPassword) { return false; }
            
            const success = await new Promise((resolve, reject) => {
                const query = `INSERT INTO ${USR_TN} (${USR_TC.username}, ${USR_TC.password}, ${USR_TC.registerday}) VALUES (?, ?, ?);`;
                
                const hashedPw = hashPasswordPBKDF2(transformedPassword);
                connection.query(query, [transformedUsername, hashedPw, dateAdded], (err, result) => {
                    if (err) reject(new Error(err.message));
                    // Verify 1 row was inserted
                    else resolve(result.affectedRows === 1); 
                });
            });

            if (!success) return false;

            // Return the newly created record using the custom non auto increment primary key
            return {
                [USR_TC.username]: transformedUsername,
                [USR_TC.registerday]: dateAdded
            };

        } 
        catch (error) { console.log(error); return false; }
    }

   async deleteRowByUsername(username)
   {
        try
        {
            const USR_TN = DbService.USERS_TABLE_NAME; const USR_TC = DbService.USERS_TABLE_COLUMNS;
            const transformedUsername = this.#transformUsername(username);
            
            // use await to call an asynchronous function
            const response = await new Promise((resolve, reject) => {
                const query = `DELETE FROM ${USR_TN} WHERE ${USR_TC.username} = ?;`;
                connection.query(query, [transformedUsername], (err, result) => {
                    if(err) reject(new Error(err.message));
                    else resolve(result.affectedRows);
                });
            });

            console.log(response);  // for debugging to see the result of select
            return response === 1 ? true: false;
        }
        catch(error) { console.log(error); return false; }
   }

    async updateDetailsByUsername(data = {}, username) 
    {
        try {
            const USR_TN = DbService.USERS_TABLE_NAME; const USR_TC = DbService.USERS_TABLE_COLUMNS;
            const setClauses = []; const queryParams = [];

            // For every key value pair given
            for (const [key, value] of Object.entries(data)) 
            {
                // Fast O(1) check against the allowable updatable Set
                if (DbService.ALLOWED_USERS_UPDATE_SET.has(key)) 
                {                    
                    // Get precise field transformer or fall back to raw value
                    const transform = this.#transformersUsersMap.get(key);
                    const processedValue = transform ? transform(value) : value;

                    // Only append valid, successfully parsed attributes
                    if (processedValue !== undefined) { setClauses.push(`${key} = ?`); queryParams.push(processedValue); }
                }
            }

            // If no fields passed validation, abort query execution
            if (setClauses.length === 0) return false;

            queryParams.push(username); // The very last ? refers to the username ID
            const query = `UPDATE ${USR_TN} SET ${setClauses.join(', ')} WHERE ${USR_TC.username} = ?;`;

            const response = await new Promise((resolve, reject) => {
                connection.query(query, queryParams, (err, result) => {
                    if (err) reject(new Error(err.message));
                    else resolve(result.affectedRows);
                });
            });
            
            console.log(response);
            return response;
        } 
        catch (error) { console.log(error); return false; }
    }

    // #region Search 
    // Should be the default search
    async searchByUsersName(page, name, exactSearch = false) 
    {
        try {
            const USR_TC = DbService.USERS_TABLE_COLUMNS; const USR_TN = DbService.USERS_TABLE_NAME;
            page = constantsJS.fixPage(page);
            const trimmedName = name.trim(); 

            const response = await new Promise((resolve, reject) => {
                let query = ''; let queryParams = [];
                const selectCols = `${USR_TC.username}, ${USR_TC.firstname}, ${USR_TC.lastname}, ${USR_TC.salary}, ${USR_TC.age}, ${USR_TC.registerday}, ${USR_TC.signintime}`; // no password
                const paginationSTMT = `${this.#returnOffsetSTMT(page)}`;

                if (exactSearch === false) // Fuzzy search across full name: first name or last name
                {                    
                    query = `SELECT ${selectCols} FROM ${USR_TN} WHERE CONCAT_WS(' ', ${USR_TC.firstname}, ${USR_TC.lastname}) LIKE ? ${paginationSTMT};`;
                    queryParams = [`%${trimmedName}%`];
                } 
                else // Exact match: check full concatenated name OR individual first/last name columns
                {                    
                    query = `SELECT ${selectCols} FROM ${USR_TN} WHERE CONCAT_WS(' ', ${USR_TC.firstname}, ${USR_TC.lastname}) = ? OR ${USR_TC.firstname} = ? OR ${USR_TC.lastname} = ? ${paginationSTMT};`;
                    queryParams = [trimmedName, trimmedName, trimmedName];
                }

                connection.query(query, queryParams, (err, results) => {
                    if (err) reject(new Error(err.message));
                    else resolve(results);
                });
            });

            return response;
        } 
        catch (error) { console.log(error); return false; }
    }

    // 
    async searchByUsersID(page, usernameId)
    {
        try 
        {
            const USR_TC = DbService.USERS_TABLE_COLUMNS; const USR_TN = DbService.USERS_TABLE_NAME;
            page = constantsJS.fixPage(page);

            const response =  await new Promise((resolve, reject) => {
                const selectCols = `${USR_TC.username}, ${USR_TC.firstname}, ${USR_TC.lastname}, ${USR_TC.salary}, ${USR_TC.age}, ${USR_TC.registerday}, ${USR_TC.signintime}`; // no password
                const paginationSTMT = `${this.#returnOffsetSTMT(page)}`;
                const query = `SELECT ${selectCols} FROM ${USR_TN} WHERE ${USR_TC.username} = ? ${paginationSTMT};` 
                connection.query(query, [usernameId], (err, results) => {
                    if (err) reject(new Error(err.message));
                    else resolve(results);
                });
            });

            return response;
        }
        catch (error) { console.log(error); return false; }
    }

    async searchBetweenUsersSalary(page, salary1, salary2)
    {       
        try 
        {
            const USR_TC = DbService.USERS_TABLE_COLUMNS; const USR_TN = DbService.USERS_TABLE_NAME;
            page = constantsJS.fixPage(page);

            let min, max; salary1 = parseFloat(salary1); salary2 = parseFloat(salary2);
            min = Math.min(salary1, salary2);
            max = Math.max(salary1, salary2);

            const response = await new Promise((resolve, reject) => {
                let query = ''; let queryParams = [];
                const selectCols = `${USR_TC.username}, ${USR_TC.firstname}, ${USR_TC.lastname}, ${USR_TC.salary}`;
                const paginationSTMT = `${this.#returnOffsetSTMT(page, USR_TC.salary, false)}`; // Descending order on salary
                
                if (min === max) 
                { 
                    query = `SELECT ${selectCols} FROM ${USR_TN} WHERE ${USR_TC.salary} = ? ${paginationSTMT};`; 
                    queryParams = [min];
                } 
                else 
                { 
                    query = `SELECT ${selectCols} FROM ${USR_TN} WHERE ${USR_TC.salary} >= ? AND ${USR_TC.salary} <= ? ${paginationSTMT};`;
                    queryParams = [min, max];
                }
                connection.query(query, queryParams, (err, results) => {
                    if (err) reject(new Error(err.message));
                    else resolve(results);
                });
            });

            return response;
        }
        catch (error) { console.log(error); return false; }
    }

    async searchBetweenUsersAges(page, age1, age2)
    {       
        try 
        {
            const USR_TC = DbService.USERS_TABLE_COLUMNS; const USR_TN = DbService.USERS_TABLE_NAME;
            page = constantsJS.fixPage(page);

            let min, max; age1 = parseInt(age1); age2 = parseInt(age2);
            min = Math.min(age1, age2);
            max = Math.max(age1, age2);

            const response = await new Promise((resolve, reject) => {
                let query = ''; let queryParams = [];
                const selectCols = `${USR_TC.username}, ${USR_TC.firstname}, ${USR_TC.lastname}, ${USR_TC.age}`;
                const paginationSTMT = `${this.#returnOffsetSTMT(page, USR_TC.age, true)}`; // Ascending order on age

                if (min === max) 
                { 
                    query = `SELECT ${selectCols} FROM ${USR_TN} WHERE ${USR_TC.age} = ? ${paginationSTMT};`; 
                    queryParams = [min];
                } 
                else 
                { 
                    query = `SELECT ${selectCols} FROM ${USR_TN} WHERE ${USR_TC.age} >= ? AND ${USR_TC.age} <= ? ${paginationSTMT};`;
                    queryParams = [min, max];
                }
                connection.query(query, queryParams, (err, results) => {
                    if (err) reject(new Error(err.message));
                    else resolve(results);
                });
            });

            return response;
        }
        catch (error) { console.log(error); return false; }
    }

    async searchUsersRegistrationTimeAfterUserID(page, usernameId, searchSameDay = false)
    {
        try 
        {
            const USR_TC = DbService.USERS_TABLE_COLUMNS; const USR_TN = DbService.USERS_TABLE_NAME;
            page = constantsJS.fixPage(page);

            const response = await new Promise((resolve, reject) => {
                let query = ``; let queryParams = [usernameId];
                const selectCols = `${USR_TC.username}, ${USR_TC.registerday}, ${USR_TC.signintime}`;
                const paginationSTMT = `${this.#returnOffsetSTMT(page, USR_TC.registerday, true)}`; // Ascending order on register day

                if (searchSameDay === false)
                {
                    query = `SELECT ${selectCols} FROM ${USR_TN} WHERE ${USR_TC.username} != ? AND ${USR_TC.registerday} > 
                                (SELECT ${USR_TC.registerday} FROM ${USR_TN} WHERE ${USR_TC.username} = ?) ${paginationSTMT};`
                    queryParams.push(usernameId);
                }
                else
                {
                    query = `SELECT ${selectCols} FROM ${USR_TN} WHERE ${USR_TC.registerday} = 
                                (SELECT ${USR_TC.registerday} FROM ${USR_TN} WHERE ${USR_TC.username} = ?) ${paginationSTMT};`
                }

                connection.query(query, queryParams, (err, results) => {
                    if (err) reject(new Error(err.message));
                    else resolve(results);
                });
            });

            return response;
        }
        catch (error) { console.log(error); return false; }
    }

    async searchUsersRegistrationTimeSameAsUserID(page, usernameId)
    {
        try 
        {
            const USR_TC = DbService.USERS_TABLE_COLUMNS; const USR_TN = DbService.USERS_TABLE_NAME;
            page = constantsJS.fixPage(page);

            const response = await new Promise((resolve, reject) => {
                const selectCols = `${USR_TC.username}, ${USR_TC.registerday}, ${USR_TC.signintime}`;
                const paginationSTMT = this.#returnOffsetSTMT(page, `${USR_TC.registerday}`, true); // ASCENDING ORDER

                const query = `SELECT ${selectCols} FROM ${USR_TN} WHERE ${USR_TC.username} != ? AND ${USR_TC.registerday} = 
                                (SELECT ${USR_TC.registerday} FROM ${USR_TN} WHERE ${USR_TC.username} = ?) ${paginationSTMT};` 
                
                connection.query(query, [usernameId, usernameId], (err, results) => {
                    if (err) reject(new Error(err.message));
                    else resolve(results);
                });
            });

            return response;
        }
        catch (error) { console.log(error); return false; }
    }

    async searchNeverSignedInUsers(page)
    {
        try 
        {
            const USR_TC = DbService.USERS_TABLE_COLUMNS; const USR_TN = DbService.USERS_TABLE_NAME;
            page = constantsJS.fixPage(page);

            const response = await new Promise((resolve, reject) => {
                const selectCols = `${USR_TC.username}, ${USR_TC.registerday}, ${USR_TC.signintime}`;
                const paginationSTMT = this.#returnOffsetSTMT(page, `${USR_TC.registerday}`, true); // Ascending order on the register day

                const query = `SELECT ${selectCols} FROM ${USR_TN} WHERE ${USR_TC.signintime} IS NULL ${paginationSTMT};` 
                connection.query(query, [], (err, results) => {
                    if (err) reject(new Error(err.message));
                    else resolve(results);
                });
            });

            return response;
        }
        catch (error) { console.log(error); return false; }
    }

    async searchUsersRegisteredToday(page) 
    {
        try {
            const USR_TC = DbService.USERS_TABLE_COLUMNS; const USR_TN = DbService.USERS_TABLE_NAME;
            page = constantsJS.fixPage(page);


            const response = await new Promise((resolve, reject) => {
                const selectCols = `${USR_TC.username}, ${USR_TC.firstname}, ${USR_TC.lastname}, ${USR_TC.registerday}`;
                const paginationSTMT = this.#returnOffsetSTMT(page); // Ascending order on username

                const query = `SELECT ${selectCols} FROM ${USR_TN} WHERE ${USR_TC.registerday} = CURDATE() ${paginationSTMT};`;

                connection.query(query, [], (err, results) => {
                    if (err) reject(new Error(err.message));
                    else resolve(results);
                });
            });

            return response;
        } 
        catch (error) { console.log(error); return false; }
    }

    // #endregion search

    // #endregion
}

module.exports = DbService;