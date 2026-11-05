const connection = require('../db.js');

let instance = null;

/** */
class ProductService 
{
    static getInstance() 
    {
        if (!instance) instance = new ProductService();
        return instance;
    }
}

module.exports = ProductService;