/** Handles billing, order, and quote services as they are interconnected. */
class FinancialService 
{
    #connection;
    constructor(connection) { this.#connection = connection; }
    getInstance(connection) { this.#connection = connection; return this; }
    
}

module.exports = FinancialService;