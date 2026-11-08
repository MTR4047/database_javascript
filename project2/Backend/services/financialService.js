/** Handles billing, order, and quote services as they are interconnected. */
export default class FinancialService 
{
    #connection;
    constructor(connection) { this.#connection = connection; }
    getInstance(connection) { this.#connection = connection; return this; }
    

    // #region QUOTE TABLE


    // #endregion

    // #region ORDER TABLE

    
    // #endregion

    // #region BILL TABLE

    
    // #endregion

    // #region PAYMENT TABLE


    // #endregion
}