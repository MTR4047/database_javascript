const mysql = require('mysql');
const dotenv = require('dotenv');
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
const ClientSRV = require('./services/clientService');
const AddressSRV = require('./services/addressService');

const ProductSRV = require('./services/productService');
const ProjectRequestSRV = require('./services/projectRequestService');

const BillingSRV = require('./services/billingService');
const QuoteSRV = require('./services/quoteService');
const OrderSRV = require('./services/orderService');
const NegotiationSRV = require('./services/negotiationService.js');

let instance = null;
class DbService 
{
    // Each SRV here holds a specific compartmentalized "micro service" which handles its own table primarily
    // Cross table edits and searches are handled in this master DbService
    #clientSRV = null;          getClientSRV() {return this.#clientSRV;}
    #addressSRV = null;         getAddressSRV() {return this.#addressSRV;}

    #productSRV = null;         getProductSRV() {return this.#productSRV;}
    #projectRequestSRV = null;  getProjectRequestSRV() {return this.#projectRequestSRV;}

    #billingSRV = null;         getBillingSRV() {return this.#billingSRV;}
    #quoteSRV = null;           getQuoteSRV() {return this.#quoteSRV;}
    #orderSRV = null;           getOrderSRV() {return this.#orderSRV;}
    #negotiationSRV = null;     getNegotiationSRV() {return this.#negotiationSRV;}

    constructor() {
        this.connection = connection;        
        // Pass the shared connection down to each micro-service instance
        this.#clientSRV = new ClientSRV(connection);
        this.#addressSRV = new AddressSRV(connection);

        this.#productSRV = new ProductSRV(connection);
        this.#projectRequestSRV = new ProjectRequestSRV(connection);

        this.#billingSRV = new BillingSRV(connection);
        this.#quoteSRV = new QuoteSRV(connection);
        this.#orderSRV = new OrderSRV(connection);
        this.#negotiationSRV = new NegotiationSRV(connection);
    }

    static getInstance() 
    {
        if (!instance) instance = new DbService();
        return instance;
    }

    // --- CROSS-TABLE / MASTER QUERIES ---
    
}


module.exports = DbService;