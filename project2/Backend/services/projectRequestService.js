const connection = require('../db.js');

let instance = null;

/** */
class ProjectRequestService 
{
    static getInstance() 
    {
        if (!instance) instance = new ProjectRequestService();
        return instance;
    }
}

module.exports = ProjectRequestService;