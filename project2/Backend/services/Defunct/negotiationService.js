/** Handles the negotiation table */
export default class NegotiationService 
{
    #connection;
    constructor(connection) { this.#connection = connection; }
    getInstance(connection) { this.#connection = connection; return this; }
    
    // #region Negotiation table

    // #endregion
}