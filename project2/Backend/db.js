import mysql from 'mysql';
import dotenv from 'dotenv';
dotenv.config();

// 1. Establish the MySQL connection right at the top
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

// 2. Import modular domain sub-services
import ClientSRV from './services/clientService';
import ProductSRV from './services/productService';
import ProjectRequestSRV from './services/projectRequestService';
import FinancialSRV from './services/financialService';
import NegotiationSRV from './services/negotiationService.js';

let instance = null;
class DbService 
{
    // Each SRV here holds a specific compartmentalized "micro service" which handles its own table primarily
    // Cross table edits and searches are handled in this master DbService
    /** @type {ClientSRV} */            #clientSRV = null;          getClientSRV() {this.#clientSRV.updateConnection(connection); return this.#clientSRV;}

    /** @type {ProductSRV} */           #productSRV = null;         getProductSRV() {this.#productSRV.updateConnection(connection); return this.#productSRV;}
    /** @type {ProjectRequestSRV} */    #projectRequestSRV = null;  getProjectRequestSRV() {this.#projectRequestSRV.updateConnection(connection); return this.#projectRequestSRV;}

    /** @type {FinancialSRV} */         #financialSRV = null;       getFinancialSRV() {this.#financialSRV.updateConnection(connection); return this.#financialSRV;}
    /** @type {NegotiationSRV} */       #negotiationSRV = null;     getNegotiationSRV() {this.#negotiationSRV.updateConnection(connection); return this.#negotiationSRV;}

    constructor() {
        this.connection = connection; // Pass the shared connection down to each micro-service instance       
        
        this.#clientSRV = new ClientSRV(connection);

        this.#productSRV = new ProductSRV(connection);
        this.#projectRequestSRV = new ProjectRequestSRV(connection);

        this.#financialSRV = new FinancialSRV(connection);
        this.#negotiationSRV = new NegotiationSRV(connection);
    }

    static getInstance() 
    {
        if (!instance) instance = new DbService();
        return instance;
    }

    // --- CROSS-TABLE / MASTER QUERIES ---
    
}


// Default export containing the singleton factory and connection
export default {
    /** @returns {DbService} */
    getInstance: (conn = connection) => {
        if (!instance) instance = new MasterDbService(conn);
        return instance;
    },
    connection
};

// module.exports = DbService;