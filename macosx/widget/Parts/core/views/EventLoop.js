/** The Event Loop for the page...
 *  
 *  
 */

DC.EventLoop = {

    currentEvent: null,
    
    getStart: function()
    {
        if (!this._start)
            this._start= new Date().getTime();
        return this._start;
    },
    
    begin: function(event)
    {
        this._start= new Date().getTime();
        this.currentEvent= event;
    },
    
    end: function()
    {
        this.currentEvent= null;
        this._start= null;
    }
    
};
