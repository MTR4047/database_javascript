/** Handles clients, sign ins, registers as well as address services */
class ClientService 
{
    #connection; 
    constructor(connection) { this.#connection = connection; }
    updateConnection(connection) { this.#connection = connection; }

}

module.exports = ClientService;