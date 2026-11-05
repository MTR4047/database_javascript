const connection = require('../db.js');

let instance = null;

/** */
class ClientService 
{
    static getInstance() 
    {
        if (!instance) instance = new ClientService();
        return instance;
    }
}

module.exports = ClientService;