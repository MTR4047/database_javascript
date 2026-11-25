/** Handles clients, sign ins, registers as well as address services */
export default class ClientService 
{
    #connection; 
    constructor(connection) { this.#connection = connection; }
    updateConnection(connection) { this.#connection = connection; }

    // #region CLIENT TABLE
    static CLIENTS_TABLE_NAME = constantsJS.USERS_TABLE_NAME;
    static CLIENTS_TABLE_COLUMNS = constantsJS.USERS_TABLE_COLUMNS;

    // #endregion

    // #region ADDRESS TABLE


    // #endregion
}