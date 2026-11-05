const mysql = require('mysql');
const dotenv = require('dotenv');
dotenv.config();

const connection = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.DB_USER,        
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    port: process.env.DB_PORT
});

connection.connect((err) => {
     if(err) console.log("DB Connection Error:", err.message);
     else console.log('Database connected successfully.');    
});

function reconnect()
{

}

module.exports = connection;