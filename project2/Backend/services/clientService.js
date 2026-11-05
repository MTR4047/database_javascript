/** Handles clients, sign ins, registers */
class ClientService 
{
    #connection;
    constructor(connection) { this.#connection = connection; }
    getInstance(connection) { this.#connection = connection; return this; }

}

module.exports = ClientService;