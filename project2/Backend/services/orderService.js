const connection = require('../db.js');

let instance = null;

/** */
class OrderService 
{
    static getInstance() 
    {
        if (!instance) instance = new OrderService();
        return instance;
    }
}

module.exports = OrderService;