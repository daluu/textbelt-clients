
var CancelledError= DC.defineError('CancelledError');
var InvalidStateError= DC.defineError('InvalidStateError');

(function (){

    var NOTFIRED= -1;
    var SUCCESS= 0;
    var FAILURE= 1;
    
    DC.Deferred= Class.create({

        constructor: function(canceller)
        {
            this.canceller= canceller;
            this._result= null;
            this._status= NOTFIRED;
            this._callbacks= [];
        },
    
        _fire: function(result)
        {
            while (this._callbacks.length)
            {
                this._status= (result instanceof Error)?FAILURE:SUCCESS;
                this._result= result;
                
                var fn= this._callbacks.shift()[this._status];
                if (!fn)
                    continue;
                
                result= fn(result);
                if (result instanceof DC.Deferred)
                {
                    var me= this;
                    function callback(result)
                    {
                        me._fire(result);
                        return result;
                    }
                    result.addMethods(callback, callback);
                    return;
                }
            }

            this._status= (result instanceof Error)?FAILURE:SUCCESS;
            this._result= result;
        },
        
        result: function()
        {
            return this._result;
        },
        
        cancel: function()
        {
            if (NOTFIRED!==this._status)
                throw new InvalidStateError('Can not cancel Deferred because it is already complete');
            var cancelResult= (this.canceller && this.canceller());
            if (!(cancelResult instanceof Error))
                cancelResult= new CancelledError('Deferred operation cancelled');
            this.failure(cancelResult);
        },
        
        addMethods: function(newCallback, newErrorHandler)
        {
            this._callbacks.push([newCallback, newErrorHandler]);
            if (NOTFIRED===this._status)
                return this;
            this._fire(this._result);
            return this;
        },

        addCallback: function(newCallback)
        {
            return this.addMethods(newCallback, null);
        },
        
        addErrorHandler: function(newErrorHandler)
        {
            return this.addMethods(null, newErrorHandler);
        },
            
        callback: function(result)
        {
            if (NOTFIRED!==this._status)
                throw new InvalidStateError('Can not signal callback because Deferred is already complete: result=' + result);
            this._fire(result);
        },
    
        failure: function(error)
        {
            if (NOTFIRED!==this._status)
                throw new InvalidStateError('Can not signal failure because Deferred is already complete: error=' + error);
            this._fire(error);
        }

    });

})();