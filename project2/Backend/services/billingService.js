const connection = require('../db.js');

let instance = null;

/** */
class BillingService 
{
    static getInstance() 
    {
        if (!instance) instance = new BillingService();
        return instance;
    }
}

module.exports = BillingService;