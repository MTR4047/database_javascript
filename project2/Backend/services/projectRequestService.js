/** */
class ProjectRequestService 
{
    #connection;
    constructor(connection) { this.#connection = connection; }
    getInstance(connection) { this.#connection = connection; return this; }

    
}

module.exports = ProjectRequestService;