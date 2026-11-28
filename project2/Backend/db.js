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
import { sanitizeInteger, tableLimit } from '../Public/constants';

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
    connection = null;

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

    static runQuery = (sql, params = [], connection) => new Promise((resolve, reject) => {
        connection.query(sql, params, (err, result) => {
            if (err) reject(new Error(err.message));
            else resolve(result);
        });
    });
    runQuery = (sql, params = []) => DbService.runQuery(sql, params, this.connection);

    static runQuery(sql, params = [], connection) 
    {
        return new Promise((resolve, reject) => {
            if (!connection) { reject(new Error('Database connection is required.')); return; }

            connection.query(sql, params, (err, result) => {
                if (err) reject(new Error(err.message));
                else resolve(result);
            });
        });
    }
    runQuery(sql, params = []) 
    { return DbService.runQuery(sql, params, this.connection); }

    // --- CROSS-TABLE / MASTER QUERIES ---
    
    // #region ANA's ADMIN DASHBOARD QUERIES

    // 1. Best Customers: List the clients who have spent the largest total amount on completed and paid flooring projects
    returnBestCustomers(page)
    {
        const Client = ClientSRV.CLIENT_SRV_TN;                             const client_TC = ClientSRV.CLIENT_SRV_TC;
        const InstallationOrder = FinancialSRV.INSTALLATION_ORDER_SRV_TN;   const order_TC = FinancialSRV.INSTALLATION_ORDER_SRV_TC;
        const FlooringRequest = ProjectRequestSRV.FLOORING_REQUEST_SRV_TN;  const request_TC = ProjectRequestSRV.FLOORING_REQUEST_SRV_TC;
        const Quote = FinancialSRV.QUOTE_SRV_TN;                            const quote_TC = FinancialSRV.QUOTE_SRV_TC;
        const Bill = FinancialSRV.BILL_SRV_TN;                              const bill_TC = FinancialSRV.BILL_SRV_TC;

        const query = `SELECT c.${client_TC.clientID},
            CONCAT(c.${client_TC.firstName}, ' ', c.${client_TC.lastName}) AS clientName,
            COUNT(DISTINCT o.${order_TC.orderID}) AS completedProjects,
            SUM(bt.totalAmount)                                                 AS totalAmountPaid
        FROM ${Client} c
        JOIN ${FlooringRequest} r               ON r.${client_TC.clientID} = c.${client_TC.clientID}
        JOIN ${Quote} q                         ON q.${quote_TC.requestID} = r.${request_TC.requestID}
        JOIN ${InstallationOrder} o             ON o.${order_TC.quoteID} = q.${quote_TC.requestID}
        JOIN ${Bill} b                          ON b.${bill_TC.orderID} = o.${order_TC.orderID}
        JOIN BillTotals bt                                      ON bt.billID = b.${bill_TC.billID}
        WHERE o.${order_TC.status} = 'completed' AND b.${bill_TC.status} = 'paid'
        GROUP BY c.${client_TC.clientID}, c.${client_TC.firstName}, c.${client_TC.lastName}
        ORDER BY totalAmountPaid DESC;
        `;

        const queryResult = this.runQuery(query);
        return queryResult;
    }

    // 2. Window Shoppers: List clients who submitted 3 or more flooring requests but have never accepted a quote. These are clients who repeatedly request estimates without becoming customers.
    returnWindowShoppers(page)
    {
        const Client = ClientSRV.CLIENT_SRV_TN;                             const client_TC = ClientSRV.CLIENT_SRV_TC;
        const FlooringRequest = ProjectRequestSRV.FLOORING_REQUEST_SRV_TN;  const request_TC = ProjectRequestSRV.FLOORING_REQUEST_SRV_TC;
        const Quote = FinancialSRV.QUOTE_SRV_TN;                            const quote_TC = FinancialSRV.QUOTE_SRV_TC;

        const query = `
            SELECT c.${client_TC.clientID},
                   CONCAT(c.${client_TC.firstName}, ' ', c.${client_TC.lastName}) AS clientName,
                   COUNT(r.${request_TC.requestID})                               AS requestCount
            FROM ${Client} c
            JOIN ${FlooringRequest} r ON r.${request_TC.clientID} = c.${client_TC.clientID}
            WHERE NOT EXISTS (
                SELECT 1
                FROM ${FlooringRequest} r2
                JOIN ${Quote} q ON q.${quote_TC.requestID} = r2.${request_TC.requestID}
                WHERE r2.${request_TC.clientID} = c.${client_TC.clientID} AND q.${quote_TC.status} = 'accepted'
            )
            GROUP BY c.${client_TC.clientID}, c.${client_TC.firstName}, c.${client_TC.lastName}
            HAVING COUNT(r.${request_TC.requestID}) >= 3;
        `;

        return this.runQuery(query);
    }

    // 3. This Month's Flooring Sales: For a user-specified month and year, list all accepted flooring quotes during that month
    returnMonthlySales(page, year, month)
    {
        const Quote = FinancialSRV.QUOTE_SRV_TN;                            const quote_TC = FinancialSRV.QUOTE_SRV_TC;
        const FlooringRequest = ProjectRequestSRV.FLOORING_REQUEST_SRV_TN;  const request_TC = ProjectRequestSRV.FLOORING_REQUEST_SRV_TC;
        const Client = ClientSRV.CLIENT_SRV_TN;                             const client_TC = ClientSRV.CLIENT_SRV_TC;
        const Address = ClientSRV.ADDRESS_SRV_TN;                           const address_TC = ClientSRV.ADDRESS_SRV_TC;

        const normYear = sanitizeInteger(year, true); 
        const normMonth = sanitizeInteger(month, true);

        const query = `
            SELECT CONCAT(c.${client_TC.firstName}, ' ', c.${client_TC.lastName}) AS clientName,
                   r.${request_TC.requestID}                                      AS projectID,
                   CONCAT(a.${address_TC.street}, ', ', a.${address_TC.city})   AS serviceAddress,
                   q.${quote_TC.quoteID},
                   q.${quote_TC.acceptedAt}                                       AS acceptedDate,
                   qt.totalPrice                                                    AS quotedAmount,
                   q.${quote_TC.proposedStartDate}                                AS scheduledInstallationDate
            FROM ${Quote} q
            JOIN QuoteTotals qt         ON qt.quoteID                  = q.${quote_TC.quoteID}
            JOIN ${FlooringRequest} r   ON r.${request_TC.requestID}   = q.${quote_TC.requestID}
            JOIN ${Client} c            ON c.${client_TC.clientID}     = r.${request_TC.clientID}
            JOIN ${Address} a           ON a.${address_TC.addressID}   = r.${request_TC.serviceAddressID}
            WHERE q.${quote_TC.status} = 'accepted' AND YEAR(q.${quote_TC.acceptedAt}) = ? AND MONTH(q.${quote_TC.acceptedAt}) = ?
            ORDER BY q.${quote_TC.acceptedAt};
        `;

        return this.runQuery(query, [normYear, normMonth]);
    }

    // 4. Registered but Inactive Clients: List clients who registered on the website but have never submitted a flooring request.
    returnInactiveClients(page)
    {
        const Client = ClientSRV.CLIENT_SRV_TN;                             const client_TC = ClientSRV.CLIENT_SRV_TC;
        const FlooringRequest = ProjectRequestSRV.FLOORING_REQUEST_SRV_TN;  const request_TC = ProjectRequestSRV.FLOORING_REQUEST_SRV_TC;

        const query = `
            SELECT c.${client_TC.clientID},
                   CONCAT(c.${client_TC.firstName}, ' ', c.${client_TC.lastName}) AS clientName,
                   c.${client_TC.email},
                   c.${client_TC.phoneNumber}
            FROM ${Client} c
            LEFT JOIN ${FlooringRequest} r ON r.${request_TC.clientID} = c.${client_TC.clientID}
            WHERE r.${request_TC.requestID} IS NULL;
        `;

        return this.runQuery(query);
    }

    // 5. Largest Flooring Project: Find the completed flooring project or projects with the largest total installed square footage.
    returnLargestFlooringProjects(page)
    {
        const InstallationOrder = FinancialSRV.INSTALLATION_ORDER_SRV_TN;   const order_TC = FinancialSRV.INSTALLATION_ORDER_SRV_TC;
        const OrderMaterialUsage = FinancialSRV.ORDER_MATERIAL_USAGE_SRV_TN;const orderMats_TC = FinancialSRV.ORDER_MATERIAL_USAGE_SRV_TC;
        const Quote = FinancialSRV.QUOTE_SRV_TN;                            const quote_TC = FinancialSRV.QUOTE_SRV_TC;
        const FlooringRequest = ProjectRequestSRV.FLOORING_REQUEST_SRV_TN;  const request_TC = ProjectRequestSRV.FLOORING_REQUEST_SRV_TC;
        const Client = ClientSRV.CLIENT_SRV_TN;                             const client_TC = ClientSRV.CLIENT_SRV_TC;
        const Bill = FinancialSRV.BILL_SRV_TN;                              const bill_TC = FinancialSRV.BILL_SRV_TC;

        const query = `
            WITH OrderArea AS (
                SELECT o.${order_TC.orderID}, SUM(u.${orderMats_TC.installedSqFt}) AS totalSqFt
                FROM ${InstallationOrder} o
                JOIN ${OrderMaterialUsage} u ON u.${orderMats_TC.orderID} = o.${order_TC.orderID}
                WHERE o.${order_TC.status} = 'completed'
                GROUP BY o.${order_TC.orderID}
            )
            
            SELECT CONCAT(c.${client_TC.firstName}, ' ', c.${client_TC.lastName}) AS clientName,
                   r.${request_TC.requestID}                                      AS projectID,
                   o.${order_TC.orderID},
                   oa.totalSqFt                                                     AS totalSquareFootage,
                   o.${order_TC.completionDate},
                   COALESCE(bt.totalAmount, qt.totalPrice)                          AS totalProjectPrice
            FROM OrderArea oa
            JOIN ${InstallationOrder} o ON o.${order_TC.orderID}     = oa.orderID
            JOIN ${Quote} q             ON q.${quote_TC.quoteID}     = o.${order_TC.quoteID}
            JOIN QuoteTotals qt           ON qt.quoteID                  = q.${quote_TC.quoteID}
            JOIN ${FlooringRequest} r   ON r.${request_TC.requestID} = q.${quote_TC.requestID}
            JOIN ${Client} c            ON c.${client_TC.clientID}   = r.${request_TC.clientID}
            LEFT JOIN ${Bill} b         ON b.${bill_TC.orderID}      = o.${order_TC.orderID} AND b.${bill_TC.status} <> 'superseded'
            LEFT JOIN BillTotals bt       ON bt.billID                   = b.${bill_TC.billID}
            WHERE oa.totalSqFt = (SELECT MAX(totalSqFt) FROM OrderArea);
        `;

        return this.runQuery(query);
    }

    /** 6.	Most Popular Flooring Materials: For each flooring material/product, determine how much flooring has actually been installed. This query should help Anna determine which flooring products are most popular with customers. 
- Products that have never been installed should still be handled appropriately by your system. 
    */
    returnMostPopularMaterials(page)
    {
        const FlooringProduct = ProductSRV.FLOORING_PRODUCT_SRV_TN;         const product_TC = ProductSRV.FLOORING_PRODUCT_SRV_TC;
        const InstallationOrder = FinancialSRV.INSTALLATION_ORDER_SRV_TN;   const order_TC = FinancialSRV.INSTALLATION_ORDER_SRV_TC;
        const OrderMaterialUsage = FinancialSRV.ORDER_MATERIAL_USAGE_SRV_TN;const orderMats_TC = FinancialSRV.ORDER_MATERIAL_USAGE_SRV_TC;

        const query = `
            SELECT p.${product_TC.productID}, p.${product_TC.productName},
                   p.${product_TC.manufacturer}, p.${product_TC.categoryName},
                   COALESCE(i.installedSqFt, 0) AS totalInstalledSqFt
            FROM ${FlooringProduct} p
            LEFT JOIN (
                SELECT u.${orderMats_TC.productID}, SUM(u.${orderMats_TC.installedSqFt}) AS installedSqFt
                FROM ${OrderMaterialUsage} u
                JOIN ${InstallationOrder} o ON o.${order_TC.orderID} = u.${orderMats_TC.orderID}
                WHERE o.${order_TC.status} = 'completed'
                GROUP BY u.${orderMats_TC.productID}
            ) i ON i.productID = p.${product_TC.productID}
            ORDER BY totalInstalledSqFt DESC, p.${product_TC.productName};
        `;

        return this.runQuery(query);
    }

    // 7. Material Cost Analysis: Find completed projects for which the actual amount of flooring material used exceeded the originally estimated material quantity by at least 10%.
    returnMaterialCostAnalysis(page)
    {
        const InstallationOrder = FinancialSRV.INSTALLATION_ORDER_SRV_TN;       const order_TC = FinancialSRV.INSTALLATION_ORDER_SRV_TC;
        const OrderMaterialUsage = FinancialSRV.ORDER_MATERIAL_USAGE_SRV_TN;    const orderMats_TC = FinancialSRV.ORDER_MATERIAL_USAGE_SRV_TC;
        const FlooringProduct = ProductSRV.FLOORING_PRODUCT_SRV_TN;             const product_TC = ProductSRV.FLOORING_PRODUCT_SRV_TC;
        const Quote = FinancialSRV.QUOTE_SRV_TN;                                const quote_TC = FinancialSRV.QUOTE_SRV_TC;
        const FlooringRequest = ProjectRequestSRV.FLOORING_REQUEST_SRV_TN;      const request_TC = ProjectRequestSRV.FLOORING_REQUEST_SRV_TC;
        const Client = ClientSRV.CLIENT_SRV_TN;                                 const client_TC = ClientSRV.CLIENT_SRV_TC;

        const query = `
            SELECT CONCAT(c.${client_TC.firstName}, ' ', c.${client_TC.lastName}) AS clientName, o.${order_TC.orderID}, p.${product_TC.productName},
                   est.estimatedQuantity, u.${orderMats_TC.actualQuantityUsed},
                   ROUND((u.${orderMats_TC.actualQuantityUsed} - est.estimatedQuantity) / est.estimatedQuantity * 100, 1)       AS percentDifference,
                   ROUND((u.${orderMats_TC.actualQuantityUsed} - est.estimatedQuantity) * est.unitPrice, 2)                     AS additionalMaterialCost
            FROM ${InstallationOrder} o
            JOIN ${OrderMaterialUsage} u ON u.${orderMats_TC.orderID} = o.${order_TC.orderID}
            JOIN (
                SELECT quoteID, productID, SUM(quantity) AS estimatedQuantity, MAX(unitPrice) AS unitPrice FROM QuoteItem
                WHERE itemType = 'material'
                GROUP BY quoteID, productID
            ) est ON est.quoteID = o.${order_TC.quoteID} AND est.productID = u.${orderMats_TC.productID}
            JOIN ${FlooringProduct} p ON p.${product_TC.productID} = u.${orderMats_TC.productID}
            JOIN ${Quote} q   ON q.${quote_TC.quoteID}     = o.${order_TC.quoteID}
            JOIN ${FlooringRequest} r ON r.${request_TC.requestID} = q.${quote_TC.requestID}
            JOIN ${Client} c  ON c.${client_TC.clientID}   = r.${request_TC.clientID}
            WHERE o.${order_TC.status} = 'completed' AND u.${orderMats_TC.actualQuantityUsed} >= est.estimatedQuantity * 1.10
            ORDER BY percentDifference DESC;
        `;

        return this.runQuery(query);
    }

    // 8. List all unpaid bills that have been outstanding for more than 7 days.
    returnOverdueBills(page)
    {
        const Bill = FinancialSRV.BILL_SRV_TN;                              const bill_TC = FinancialSRV.BILL_SRV_TC;
        const InstallationOrder = FinancialSRV.INSTALLATION_ORDER_SRV_TN;   const order_TC = FinancialSRV.INSTALLATION_ORDER_SRV_TC;
        const Quote = FinancialSRV.QUOTE_SRV_TN;                            const quote_TC = FinancialSRV.QUOTE_SRV_TC;
        const FlooringRequest = ProjectRequestSRV.FLOORING_REQUEST_SRV_TN;  const request_TC = ProjectRequestSRV.FLOORING_REQUEST_SRV_TC;
        const Client = ClientSRV.CLIENT_SRV_TN;                             const client_TC = ClientSRV.CLIENT_SRV_TC;

        const query = `
            SELECT CONCAT(c.${client_TC.firstName}, ' ', c.${client_TC.lastName}) AS clientName,
                   b.${bill_TC.billID}                                            AS billNumber,
                   b.${bill_TC.generatedAt}                                       AS billDate,
                   bt.totalAmount                                                 AS amountDue,
                   DATEDIFF(NOW(), b.${bill_TC.generatedAt})                      AS daysOutstanding
            FROM ${Bill} b
            JOIN BillTotals bt                  ON bt.billID                 = b.${bill_TC.billID}
            JOIN ${InstallationOrder} o         ON o.${order_TC.orderID}     = b.${order_TC.orderID}
            JOIN ${Quote} q                     ON q.${quote_TC.quoteID}     = o.${order_TC.quoteID}
            JOIN ${FlooringRequest} r           ON r.${request_TC.requestID} = q.${quote_TC.requestID}
            JOIN ${Client} c                    ON c.${client_TC.clientID}   = r.${request_TC.clientID}
            WHERE b.${bill_TC.status} IN ('unpaid', 'disputed') AND b.${bill_TC.generatedAt} < NOW() - INTERVAL 7 DAY
            ORDER BY daysOutstanding DESC;
        `;

        return this.runQuery(query);
    }

    // 9. Problem Customers: List clients who have had at least two overdue bills and have never paid an overdue bill within 7 days after it became overdue. The query should help Anna identify customers with a repeated history of significantly late payments
    returnProblemCustomers(page)
    {
        const Bill = FinancialSRV.BILL_SRV_TN;                              const bill_TC = FinancialSRV.BILL_SRV_TC;
        const InstallationOrder = FinancialSRV.INSTALLATION_ORDER_SRV_TN;   const order_TC = FinancialSRV.INSTALLATION_ORDER_SRV_TC;
        const Quote = FinancialSRV.QUOTE_SRV_TN;                            const quote_TC = FinancialSRV.QUOTE_SRV_TC;
        const FlooringRequest = ProjectRequestSRV.FLOORING_REQUEST_SRV_TN;  const request_TC = ProjectRequestSRV.FLOORING_REQUEST_SRV_TC;
        const Client = ClientSRV.CLIENT_SRV_TN;                             const client_TC = ClientSRV.CLIENT_SRV_TC;
        const Payment = FinancialSRV.PAYMENT_SRV_TN;                        const payment_TC = FinancialSRV.PAYMENT_SRV_TC;

        const query = `
            SELECT c.${client_TC.clientID},
                   CONCAT(c.${client_TC.firstName}, ' ', c.${client_TC.lastName}) AS clientName,
                   COUNT(*)                                                       AS overdueBills
            FROM ${Bill} b
            LEFT JOIN ${Payment} p          ON p.${payment_TC.billID}    = b.${bill_TC.billID}
            JOIN ${InstallationOrder} o     ON o.${order_TC.orderID}     = b.${order_TC.orderID}
            JOIN ${Quote} q                 ON q.${quote_TC.quoteID}     = o.${order_TC.quoteID}
            JOIN ${FlooringRequest} r       ON r.${request_TC.requestID} = q.${quote_TC.requestID}
            JOIN ${Client} c                ON c.${client_TC.clientID}   = r.${request_TC.clientID}
            WHERE b.${bill_TC.status} <> 'superseded'
              AND (   (p.${payment_TC.paidAt} IS NOT NULL AND p.paidAt > b.${bill_TC.generatedAt} + INTERVAL 7 DAY)
                   OR (p.${payment_TC.paidAt} IS NULL     AND NOW()    > b.${bill_TC.generatedAt} + INTERVAL 7 DAY))
            GROUP BY c.${client_TC.clientID}, c.${client_TC.firstName}, c.${client_TC.lastName}
            HAVING COUNT(*) >= 2 AND SUM(p.${payment_TC.paidAt} IS NOT NULL AND p.${payment_TC.paidAt} <= b.${bill_TC.generatedAt} + INTERVAL 14 DAY) = 0;
        `;

        return this.runQuery(query);
    }

    // 10. Excellent Customers: List clients who have always paid every bill within 24 hours after the bill was generated. A client must have at least one paid bill to qualify.
    returnExcellentCustomers(page)
    {
        const Bill = FinancialSRV.BILL_SRV_TN;                              const bill_TC = FinancialSRV.BILL_SRV_TC;
        const InstallationOrder = FinancialSRV.INSTALLATION_ORDER_SRV_TN;   const order_TC = FinancialSRV.INSTALLATION_ORDER_SRV_TC;
        const Quote = FinancialSRV.QUOTE_SRV_TN;                            const quote_TC = FinancialSRV.QUOTE_SRV_TC;
        const FlooringRequest = ProjectRequestSRV.FLOORING_REQUEST_SRV_TN;  const request_TC = ProjectRequestSRV.FLOORING_REQUEST_SRV_TC;
        const Client = ClientSRV.CLIENT_SRV_TN;                             const client_TC = ClientSRV.CLIENT_SRV_TC;
        const Payment = FinancialSRV.PAYMENT_SRV_TN;                        const payment_TC = FinancialSRV.PAYMENT_SRV_TC;

        const query = `
            SELECT CONCAT(c.${client_TC.firstName}, ' ', c.${client_TC.lastName}) AS clientName,
                   COUNT(*)                                                         AS numberOfBills,
                   SUM(bt.totalAmount)                                              AS totalAmountPaid,
                   ROUND(AVG(TIMESTAMPDIFF(MINUTE, b.${bill_TC.generatedAt}, p.paidAt)) / 60, 1)
                                                                                    AS avgHoursToPay
            FROM ${Bill} b
            JOIN BillTotals bt              ON bt.billID                = b.${bill_TC.billID}
            LEFT JOIN ${Payment} p          ON p.${payment_TC.billID}   = b.${bill_TC.billID}
            JOIN ${InstallationOrder} o         ON o.${order_TC.orderID}     = b.${order_TC.orderID}
            JOIN ${Quote} q                     ON q.${quote_TC.quoteID}     = o.${order_TC.quoteID}
            JOIN ${FlooringRequest} r           ON r.${request_TC.requestID} = q.${quote_TC.requestID}
            JOIN ${Client} c                    ON c.${client_TC.clientID}   = r.${request_TC.clientID}
            WHERE b.${bill_TC.status} <> 'superseded'
            GROUP BY c.${client_TC.clientID}, c.${client_TC.firstName}, c.${client_TC.lastName}
            HAVING COUNT(p.${payment_TC.billID}) >= 1
               AND SUM(p.${payment_TC.paidAt} IS NULL OR p.${payment_TC.paidAt} > b.${bill_TC.generatedAt} + INTERVAL 24 HOUR) = 0;
        `;

        return this.runQuery(query);
    }

    // #endregion
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