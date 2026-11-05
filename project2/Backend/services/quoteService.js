const connection = require('../db.js');

let instance = null;

/** */
class QuoteService 
{
    static getInstance() 
    {
        if (!instance) instance = new QuoteService();
        return instance;
    }
}

module.exports = QuoteService;