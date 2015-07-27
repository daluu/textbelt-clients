/*jsl:import ../core/startup.js*/

/*jsl:declare Event*/

//  Trick picked up from Prototype to get around IE8's fixed Element & Event
(function() {
  var event = this.Event;
  this.Event = {};
  Object.extend(this.Event, event || {});
}).call(window);


/*  Event stuff for all browsers
 */
Object.extend(Event, {

    KEY_BACKSPACE: 8,
    KEY_TAB:       9,
    KEY_RETURN:   13,
    KEY_ESC:      27,
    KEY_LEFT:     37,
    KEY_UP:       38,
    KEY_RIGHT:    39,
    KEY_DOWN:     40,
    KEY_DELETE:   46,
    KEY_HOME:     36,
    KEY_END:      35,
    KEY_PAGEUP:   33,
    KEY_PAGEDOWN: 34,
    KEY_INSERT:   45,

    _domHasFinishedLoading: function()
    {
        if (arguments.callee.done)
            return;
        arguments.callee.done= true;

        if (this._domLoadedTimer)
            window.clearInterval(this._domLoadedTimer);
    
        var callbacks= Event._readyCallbacks;
        var len= callbacks.length;
        var i;
    
        for (i=0; i<len; ++i)
            callbacks[i]();

        Event._readyCallbacks = null;
    },
    
    
    observe: function(node, eventName, handlerMethod)
    {
        if ('on'==eventName.slice(0,2))
            eventName= eventName.slice(2);
        node.addEventListener(eventName, handlerMethod, false);
    },

    stopObserving: function(node, eventName, handlerMethod)
    {
        if ('on'==eventName.slice(0,2))
            eventName= eventName.slice(2);
        node.removeEventListener(eventName, handlerMethod, false);
    },

	stop: function(event)
	{
		event.preventDefault();
		event.stopPropagation();
	},
    	
	preventDefault: function(event)
	{
	    event.preventDefault();
	},
	
	onDomReady: function(f)
    {
        //  If the DOM has already loaded, fire off the callback as soon as
        //  possible after returning from this method.
        if (Event._domHasFinishedLoading.done)
        {
            window.setTimeout(f, 0);
            return;
        }
    
        if (!Event._readyCallbacks)
        {
            document.addEventListener("DOMContentLoaded",
                                      Event._domHasFinishedLoading,
                                      false);
            
            function checkReadyState()
            {
                if ((/loaded|complete/).test(document.readyState))
                    Event._domHasFinishedLoading();
            }
        
            if (DC.Browser.Safari)
                Event._domLoadedTimer = window.setInterval(checkReadyState, 10);
        
            Event.observe(window, 'load', Event._domHasFinishedLoading);
            Event._readyCallbacks= [];
        }
    
        Event._readyCallbacks.push(f);
    }


});
