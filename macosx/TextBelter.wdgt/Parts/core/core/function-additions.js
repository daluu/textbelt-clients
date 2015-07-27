/** There might be cases where the bind method hasn't already been defined.
 *  This should mimic the Prototype library's bind method as closely as possible.
 */
if (!Function.prototype.bind)
    Function.prototype.bind= function(obj)
    {
        var self= this;
        if (!arguments.length)
            return self;
            
        if (1==arguments.length)
            return function()
            {
                return self.apply(obj, arguments);
            };

        var args= Array.from(arguments, 1);

        return function()
        {
            return self.apply(obj, args.concat(Array.from(arguments)));
        };
    }

if (!Function.prototype.bindAsEventListener)
    Function.prototype.bindAsEventListener = function(object)
    {
        var self = this;

        if (1==arguments.length)
            return function(event)
            {
                return self.call(object, event||window.event);
            };
            
        var args = Array.from(arguments);
        args.shift();

        return function(event) {
            return self.apply(object, [event || window.event].concat(args));
        };
    }

    
if (!Function.prototype.delay)
    Function.prototype.delay= function(delay)
    {
        var self = this;
        
        delay= delay||10;
        
        if (arguments.length<2)
        {
            /*  By default, the handler for setTimeout receives the timer
                event object. I've never seen any good use for this handler.
             */
            function noargs()
            {
                self();
            }
            return window.setTimeout(noargs, delay);
        }
        
        var args = Array.from(arguments, 1);
        
        function go()
        {
            self.apply(self, args);
        }
        return window.setTimeout(go, delay);
    }

if (!Function.prototype.bindAndDelay)
    Function.prototype.bindAndDelay= function(obj, delay)
    {
        var self = this;
        obj= obj||self;
        
        delay= delay||10;
        if (arguments.length<3)
        {
            function noargs()
            {
                self.call(obj);
            }
            return window.setTimeout(noargs, delay);
        }
        
        var args = Array.from(arguments, 2);
        
        function go()
        {
            self.apply(obj, args);
        }
        return window.setTimeout(go, delay);
    }




/** Provide synchronisation for functions.
 */
Function.prototype.sync= function()
{
    var fn= arguments.length?this.bind.apply(this, arguments):this;
    var points= {};
    var cancelled= false;
    
    fn.stop= function()
    {
        cancelled= true;
    }

    fn.waitFor= function(point)
    {
        points[point]= true;
        
        return function()
        {
            points[point]=false;
            for (var p in points)
                if (points[p])
                    return;

            if (cancelled)
                return;
            //  All join points have been triggered
            fn();
        };
    }
    
    return fn;
}
