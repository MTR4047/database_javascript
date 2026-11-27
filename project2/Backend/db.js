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
import { tableLimit } from '../Public/constants';

/**
 * @param {Map<*, Function>} transformerMap
 * @param {*} key
 * @returns {Function|undefined}
 */
export function getTransformFn(transformerMap, key) { return transformerMap.get(key); }

let instance = null;
export class DbService 
{
    // Each SRV here holds a specific compartmentalized "micro service" which handles its own table primarily
    // Cross table edits and searches are handled in this master DbService
    /** @type {ClientSRV} */            #clientSRV = null;          getClientSRV() {this.#clientSRV.updateConnection(connection); return this.#clientSRV;}
    /** @type {FinancialSRV} */         #financialSRV = null;       getFinancialSRV() {this.#financialSRV.updateConnection(connection); return this.#financialSRV;}
    /** @type {ProductSRV} */           #productSRV = null;         getProductSRV() {this.#productSRV.updateConnection(connection); return this.#productSRV;}
    /** @type {ProjectRequestSRV} */    #projectRequestSRV = null;  getProjectRequestSRV() {this.#projectRequestSRV.updateConnection(connection); return this.#projectRequestSRV;}    

    static #offset = tableLimit; // The frontend simply sensd in the page #, and we multiply using the offset with ((page-1)*offset)
    static #limit = this.#offset + 1; // The frontend does not see this nor can it modify this, this is simply the limit of rows per page, the +1 here is a trick to enable the "next" button
    static returnOffsetSTMT(page = 1, sortColumn, isAscending = true) 
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

    constructor() {
        this.connection = connection; // Pass the shared connection down to each micro-service instance       
        
        this.#clientSRV = new ClientSRV(connection);
        this.#financialSRV = new FinancialSRV(connection);
        this.#productSRV = new ProductSRV(connection);
        this.#projectRequestSRV = new ProjectRequestSRV(connection);

        
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