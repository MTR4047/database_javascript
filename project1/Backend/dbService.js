// database services, accessbile by DbService methods.

const mysql = require('mysql');
const dotenv = require('dotenv');
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


// if you configure directly in this file, there is a security issue, but it will work
/*
const connection = mysql.createConnection({
     host:"localhost",
     user:"root",        
     password:"",
     database:"web_app",
     port:3306
});
*/


connection.connect((err) => {
     if(err){
        console.log(err.message);
     }
     console.log('db ' + connection.state);    // to see if the DB is connected or not
});

// the following are database functions, 

class DbService
{
    static getDbServiceInstance() {
        if (!instance) { instance = new DbService(); }
        return instance;
    }

    // only one instance is sufficient
    // static getDbServiceInstance(){ return instance? instance: new DbService(); }

    // #region

   /*
     This code defines an asynchronous function getAllData using the async/await syntax. 
     The purpose of this function is to retrieve all data from a database table named 
     "names" using a SQL query.

     Let's break down the code step by step:
         - async getAllData() {: This line declares an asynchronous function named getAllData.

         - try {: The try block is used to wrap the code that might throw an exception 
            If any errors occur within the try block, they can be caught and handled in 
            the catch block.

         - const response = await new Promise((resolve, reject) => { ... });: 
            This line uses the await keyword to pause the execution of the function 
            until the Promise is resolved. Inside the await, there is a new Promise 
            being created that represents the asynchronous operation of querying the 
            database. resolve is called when the database query is successful, 
            and it passes the query results. reject is called if there is an error 
            during the query, and it passes an Error object with an error message.

         - The connection.query method is used to execute the SQL query on the database.

         - return response;: If the database query is successful, the function returns 
           the response, which contains the results of the query.

        - catch (error) {: The catch block is executed if an error occurs anywhere in 
           the try block. It logs the error to the console.

        - console.log(error);: This line logs the error to the console.   
    }: Closes the catch block.

    In summary, this function performs an asynchronous database query using await and a 
   Promise to fetch all data from the "names" table. If the query is successful, 
   it returns the results; otherwise, it catches and logs any errors that occur 
   during the process. It's important to note that the await keyword is used here 
   to work with the asynchronous nature of the connection.query method, allowing 
   the function to pause until the query is completed.
   */
    async getAllData(){
        try{
           // use await to call an asynchronous function
           const response = await new Promise((resolve, reject) => 
              {
                  const query = `SELECT * FROM names;`;
                  connection.query(query, 
                       (err, results) => {
                             if(err) reject(new Error(err.message));
                             else resolve(results);
                       }
                  );
               }
            );
        
            // console.log("dbServices.js: search result:");
            // console.log(response);  // for debugging to see the result of select
            return response;

        }  catch(error){
           console.log(error);
        }
   }


   async insertNewName(name){
         try{
            const dateAdded = new Date();
            // use await to call an asynchronous function
            const insertId = await new Promise((resolve, reject) => 
            {
               const query = "INSERT INTO names (name, date_added) VALUES (?, ?);";
               connection.query(query, [name, dateAdded], (err, result) => {
                   if(err) reject(new Error(err.message));
                   else resolve(result.insertId);
               });
            });
            console.log(insertId);  // for debugging to see the result of select
            return{
                 id: insertId,
                 name: name,
                 dateAdded: dateAdded
            }
         } catch(error){
               console.log(error);
         }
   }




   async searchByName(name){
        try{
             const dateAdded = new Date();
             // use await to call an asynchronous function
             const response = await new Promise((resolve, reject) => 
                  {
                     const query = "SELECT * FROM names where name = ?;";
                     connection.query(query, [name], (err, results) => {
                         if(err) reject(new Error(err.message));
                         else resolve(results);
                     });
                  }
             );

             // console.log(response);  // for debugging to see the result of select
             return response;

         }  catch(error){
            console.log(error);
         }
   }

   async deleteRowById(id){
         try{
              id = parseInt(id, 10);
              // use await to call an asynchronous function
              const response = await new Promise((resolve, reject) => 
                  {
                     const query = "DELETE FROM names WHERE id = ?;";
                     connection.query(query, [id], (err, result) => {
                          if(err) reject(new Error(err.message));
                          else resolve(result.affectedRows);
                     });
                  }
               );

               console.log(response);  // for debugging to see the result of select
               return response === 1? true: false;

         }  catch(error){
              console.log(error);
         }
   }

  
  async updateNameById(id, newName){
      try{
           console.log("dbService: ");
           console.log(id);
           console.log(newName);
           id = parseInt(id, 10);
           // use await to call an asynchronous function
           const response = await new Promise((resolve, reject) => 
               {
                  const query = "UPDATE names SET name = ? WHERE id = ?;";
                  connection.query(query, [newName, id], (err, result) => {
                       if(err) reject(new Error(err.message));
                       else resolve(result.affectedRows);
                  });
               }
            );

            // console.log(response);  // for debugging to see the result of select
            return response === 1? true: false;
      }  catch(error){
         console.log(error);
      }
  }
  // #endregion NAME TABLE FUNCS

    // #region NEW Users TABLE FUNCS
    static USERS_TABLE_NAME = "Users";
    static USERS_TABLE_COLUMNS = Object.freeze({ 
        username: "username", password: "password",
        firstname: "firstname", lastname: "lastname",
        salary: "salary", age: "age",
        registerday: "registerday", signintime: "signintime"
    });
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
        [DbService.USERS_TABLE_COLUMNS.password, this.#transformPassword.bind(this)],
        [DbService.USERS_TABLE_COLUMNS.firstname, this.#transformFirstname.bind(this)],
        [DbService.USERS_TABLE_COLUMNS.lastname, this.#transformLastname.bind(this)],
        [DbService.USERS_TABLE_COLUMNS.salary, this.#transformSalary.bind(this)],
        [DbService.USERS_TABLE_COLUMNS.age, this.#transformAge.bind(this)]
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

    #transformPassword(val) {
        val = this.#transformToValidInput(val);
        if (typeof val !== 'string') return undefined;

        const trimmed = val.trim();
        return trimmed.length >= 8 ? trimmed : undefined;
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

    async getAllUsersData()
    {
        try {
           // use await to call an asynchronous function
           const response = await new Promise((resolve, reject) => {
                const query = `SELECT * FROM ${DbService.USERS_TABLE_NAME};`;
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
                const checkQuery = `SELECT * FROM ${USR_TN} WHERE ${USR_TC.username} LIKE ? AND ${USR_TC.password} COLLATE utf8mb4_bin = ?`;
                
                connection.query(checkQuery, [transformedUsername, transformedPassword], (err, results) => {
                    if (err) reject(new Error(err.message));
                    else resolve(results);
                });
            });

            // Step 2: Update sign-in timestamp for the authenticated user
            if (!success || success.length === 0) return false; const user = success[0];
            const updateSuccess = await new Promise((resolve, reject) => {
                const updateQuery = `UPDATE ${USR_TN} SET ${USR_TC.signintime} = ? WHERE ${USR_TC.username} = ? AND ${USR_TC.password} COLLATE utf8mb4_bin = ?;`;

                connection.query(updateQuery, [signInAttempt, user[USR_TC.username], password], (err, result) => {
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
                
                connection.query(query, [transformedUsername, transformedPassword, dateAdded], (err, result) => {
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
            const response = await new Promise((resolve, reject) => 
                {
                    const query = `DELETE FROM ${USR_TN} WHERE ${USR_TC.username} = ?;`;
                    connection.query(query, [transformedUsername], (err, result) => {
                        if(err) reject(new Error(err.message));
                        else resolve(result.affectedRows);
                    });
                }
            );

            console.log(response);  // for debugging to see the result of select
            return response === 1 ? true: false;
        }
        catch(error) { console.log(error); return false; }
   }

    async updateDetailsByUsername(data = {}, username) 
    {
        try {
            const USR_TN = DbService.USERS_TABLE_NAME;
            const setClauses = []; const queryParams = [];

            // For every key value pair given
            for (const [key, value] of Object.entries(data)) 
            {
                // Fast O(1) check against the allowable updatable Set
                if (ALLOWED_UPDATE_SET.has(key)) 
                {                    
                    // Get precise field transformer or fall back to raw value
                    const transform = this.#transformersUsersMap.get(key);
                    const processedValue = transform ? transform(value): value;

                    // Only append valid, successfully parsed attributes
                    if (processedValue !== undefined) { setClauses.push(`${key} = ?`); queryParams.push(processedValue); }
                }
            }

            // If no fields passed validation, abort query execution
            if (setClauses.length === 0) return false;

            queryParams.push(username); // The very last ? refers to the username ID
            const query = `UPDATE ${USR_TN} SET ${setClauses.join(', ')} WHERE id = ?;`;

            const response = await new Promise((resolve, reject) => {
                connection.query(query, queryParams, (err, result) => {
                    if (err) reject(new Error(err.message));
                    else resolve(result.affectedRows);
                });
            });
            
            console.log(response);
            return response === 1? true: false;
        } 
        catch (error) { console.log(error); return false; }
    }

    // #region Search 
    async searchByUsersName(name, exactSearch = false) 
    {
        try {
            const USR_TC = DbService.USERS_TABLE_COLUMNS; const USR_TN = DbService.USERS_TABLE_NAME;
            const trimmedName = name.trim();

            const response = await new Promise((resolve, reject) => {
                let query = ''; let queryParams = [];

                if (exactSearch === false) // Fuzzy search across full name: first name or last name
                {                    
                    query = `SELECT * FROM ${USR_TN} WHERE CONCAT(${USR_TC.firstname}, ' ', ${USR_TC.lastname}) LIKE ?;`;
                    queryParams = [`%${trimmedName}%`];
                } 
                else // Exact match: check full concatenated name OR individual first/last name columns
                {                    
                    query = `SELECT * FROM ${USR_TN} WHERE CONCAT(${USR_TC.firstname}, ' ', ${USR_TC.lastname}) = ? OR ${USR_TC.firstname} = ? OR ${USR_TC.lastname} = ?;`;
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

    async searchByUsersID(usernameId)
    {
        try 
        {
            const USR_TC = DbService.USERS_TABLE_COLUMNS; const USR_TN = DbService.USERS_TABLE_NAME;

            const response =  await new Promise((resolve, reject) => {
                const query = `SELECT * FROM ${USR_TN} WHERE ${USR_TC.username} = ?;` 
                connection.query(query, [usernameId], (err, results) => {
                    if (err) reject(new Error(err.message));
                    else resolve(results);
                });
            });

            return response;
        }
        catch (error) { console.log(error); return false; }
    }

    async searchBetweenUsersSalary(salary1, salary2)
    {       
        try 
        {
            const USR_TC = DbService.USERS_TABLE_COLUMNS; const USR_TN = DbService.USERS_TABLE_NAME;
            let min, max; salary1 = parseFloat(salary1); salary2 = parseFloat(salary2)        
            if (salary1 === salary2) { min = salary1; max = min; }
            else if (salary1 > salary2) { min = salary1; max = salary2; }
            else { min = salary2; max = salary1; }

            const response = await new Promise((resolve, reject) => {
                let query = ''; queryParams = [];
                if (min = max) 
                { 
                    query = `SELECT * FROM ${USR_TN} WHERE ${USR_TC.salary} = ?;`; 
                    queryParams = [min];
                } 
                else 
                { 
                    query = `SELECT * FROM ${USR_TN} WHERE ${USR_TC.salary} >= ? AND ${USR_TC.salary} <= ?;`;
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

    async searchBetweenUsersAges(age1, age2)
    {       
        try 
        {
            const USR_TC = DbService.USERS_TABLE_COLUMNS; const USR_TN = DbService.USERS_TABLE_NAME;
            let min, max; age1 = parseInt(age1); age2 = parseInt(age2)        
            if (age1 === age2) { min = age1; max = min; }
            else if (age1 > age2) { min = age1; max = age2; }
            else { min = age2; max = age1; }

            const response = await new Promise((resolve, reject) => {
                let query = ''; queryParams = [];
                if (min = max) 
                { 
                    query = `SELECT * FROM ${USR_TN} WHERE ${USR_TC.age} == ?;`; 
                    queryParams = [min];
                } 
                else 
                { 
                    query = `SELECT * FROM ${USR_TN} WHERE ${USR_TC.age} >= ? AND ${USR_TC.age} <= ?;`;
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

    async searchUsersRegistrationTimeAfterUserID(usernameId, searchSameDay = false)
    {
        try 
        {
            const USR_TC = DbService.USERS_TABLE_COLUMNS; const USR_TN = DbService.USERS_TABLE_NAME;

            const response = await new Promise((resolve, reject) => {
                let query = ``; let queryParams = [usernameId];
                if (searchSameDay === false)
                {
                    query = `SELECT * FROM ${USR_TN} WHERE ${USR_TC.registerday} AND ${USR_TC.username} != ? >= 
                                (SELECT ${USR_TC.registerday} FROM ${USR_TN} WHERE ${USR_TC.username} = ?) ORDER BY ${USR_TC.registerday} ASC;`
                    queryParams.push(usernameId);
                }
                else
                {
                    query = `SELECT * FROM ${USR_TN} WHERE ${USR_TC.registerday} = 
                                (SELECT ${USR_TC.registerday} FROM ${USR_TN} WHERE ${USR_TC.username} = ?) ORDER BY ${USR_TC.registerday} ASC;`
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

    async searchUsersRegistrationTimeSameAsUserID(usernameId)
    {
        try 
        {
            const USR_TC = DbService.USERS_TABLE_COLUMNS; const USR_TN = DbService.USERS_TABLE_NAME;

            const response = await new Promise((resolve, reject) => {
                const query = `SELECT * FROM ${USR_TN} WHERE ${USR_TC.registerday} AND ${USR_TC.username} != ? >= 
                                (SELECT ${USR_TC.registerday} FROM ${USR_TN} WHERE ${USR_TC.username} = ?) ORDER BY ${USR_TC.registerday} ASC;` 
                
                connection.query(query, [usernameId, usernameId], (err, results) => {
                    if (err) reject(new Error(err.message));
                    else resolve(results);
                });
            });

            return response;
        }
        catch (error) { console.log(error); return false; }
    }

    async searchNeverSignedInUsers()
    {
        try 
        {
            const USR_TC = DbService.USERS_TABLE_COLUMNS; const USR_TN = DbService.USERS_TABLE_NAME;

            const response = await new Promise((resolve, reject) => {
                const query = `SELECT * FROM ${USR_TN} WHERE ${USR_TC.signintime} = NULL OR ${USR_TC.signintime} ;` 
                connection.query(query, [], (err, results) => {
                    if (err) reject(new Error(err.message));
                    else resolve(results);
                });
            });

            return response;
        }
        catch (error) { console.log(error); return false; }
    }

    async searchUsersSignedInToday() 
    {
        try {
            const USR_TC = DbService.USERS_TABLE_COLUMNS; const USR_TN = DbService.USERS_TABLE_NAME;
            const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(startOfDay); endOfDay.setHours(23, 59, 59, 999);
            // Using JS here is better because we avoid using CAST. Alternatively, we can use CURDATE() with INTERVAL keyword to search in between as well without having to create new dates

            const response = await new Promise((resolve, reject) => {
                const query = `SELECT * FROM ${USR_TN} WHERE ${USR_TC.signintime} BETWEEN ? AND ?;`;

                connection.query(query, [startOfDay, endOfDay], (err, results) => {
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