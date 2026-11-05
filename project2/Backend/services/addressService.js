const connection = require('../db.js');

let instance = null;

/** */
class AddressService 
{
    static getInstance() 
    {
        if (!instance) instance = new AddressService();
        return instance;
    }
}

module.exports = AddressService;