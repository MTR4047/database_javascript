const connection = require('../db.js');

let instance = null;

/** */
class NegotiationService 
{
    static getInstance() 
    {
        if (!instance) instance = new NegotiationService();
        return instance;
    }
}

module.exports = NegotiationService;