const connection = require('../db.js');

let instance = null;

/** Handles clients, sign ins, registers */
class ClientService 
{
    static getInstance() 
    {
        if (!instance) instance = new ClientService();
        return instance;
    }
}

module.exports = ClientService;