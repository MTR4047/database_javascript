/** Handles clients, sign ins, registers */
class ClientService 
{
    #connection; 
    constructor(connection) { this.#connection = connection; }
    updateConnection(connection) { this.#connection = connection; }

}

module.exports = ClientService;