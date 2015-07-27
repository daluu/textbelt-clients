/*jsl:import view-core.js*/
/*jsl:import EventLoop.js*/
/*jsl:import Responder.js*/

DC.Page= Class.create(DC.Responder, {
    
    focusedElement: null,
    
    constructor: function()
    {
        this.firstResponder= null;
        this.__hoverTrackingIds={};
        this._onmousedragHandler= this._onmousedrag.bindAsEventListener(this);
        this._delegates= {
            click: []
        };
        
        this.onclick= this._fireDelegates;
    },
    
    targetViewForEvent: function(event)
    {
        var element= event.target||event.srcElement;
        var view;
        var fromNode= DC.View.fromNode;
        
        while (element && element!=document && !(view=fromNode(element)))
            element= element.parentNode;
        
        if (!element || element==document)
            return null;
        return view;
    },
    
    makeFirstResponder: function(view)
    {
        if (this.firstResponder==view)
            return true;

        //  Ask previous first responder to resign
        if (this.firstResponder &&
            !this.firstResponder.resignFirstResponder())
            return false;

        //  Remove focus class from old firstResponder
        if (this.firstResponder)
            Element.removeClassName(this.firstResponder.viewElement(),
                                    DC.Style.kFocusClass);
        
        if (view && !view.becomeFirstResponder())
            return false;
        
        this.willChangeValueForKey('firstResponder');
        this.firstResponder= view;
        this.didChangeValueForKey('firstResponder');
        
        if (view)
        {
            view.focus();
            Element.addClassName(view.viewElement(),
                                 DC.Style.kFocusClass);
        }

        return true;
    },
    
    addTrackingInfo: function(id, info)
    {
        if ('string'!==typeof(id))
            id= Element.assignId(id);

        var trackingCallbacks= this.__hoverTrackingIds[id];
        if (!trackingCallbacks)
            trackingCallbacks= this.__hoverTrackingIds[id]= [];
        trackingCallbacks.push(info);
    },
    
    superview: function()
    {
        return null;
    },
    
    presentError: function(error)
    {
        function doit()
        {
            var description= error.description;
            if (error.recoverySuggestion)
                description+= '\n' + error.recoverySuggestion;
            
            window.alert(description);
            DC.page.makeFirstResponder(error.field);
        }
        doit.delay(0);
    },
    
    delegate: function(selector, event, fn)
    {
        //  e.g. DC.page.delegate('div a', 'click', function(event) {});
        if ('string'===typeof(event))
            this._delegates[event].push({
                    sel: selector,
                    fn: fn
                });
        else
        {
            //  e.g. DC.page.delegate('div a', {
            //                                  click: function(event) {}
            //                              });
            var p;
            for (p in event)
            {
                if (!(p in this._delegates))
                    throw new Error('Invalid delegation event type: ' + p);
                this._delegates[p].push({
                        sel: selector,
                        fn: event[p]
                    });
            }
        }
    },

    superview: function()
    {
        return null;
    },
    
    _fireDelegates: function(event)
    {
        var element= event.target||event.srcElement;
        var match= Element.match;
        var handlers= this._delegates[event.type]||[];

        function visitDelegate(d)
        {
            if (match(element, d.sel))
                d.fn(event);
        }
        
        handlers.forEach(visitDelegate);
    },
    
    _findFirstResponder: function(view)
    {
        while (view && !view.acceptsFirstResponder())
            view= view.superview();
        if (!view)
            return;
        this.makeFirstResponder(view);
    },
    
    _onmousedown: function(event)
    {
        var view= this.targetViewForEvent(event);
        if (view)
        {
            this._findFirstResponder(view);
            view.onmousedown(event);

            Event.observe(document, 'mousemove', this._onmousedragHandler);
        }
        this._mousedownView= view;
    },

    _onmouseup: function(event)
    {
        if (this._mousedownView)
            this._mousedownView.onmouseup(event);

        Event.stopObserving(document, 'mousemove', this._onmousedragHandler);
    },
    
    _onmousedrag: function(event)
    {
        if (this._mousedownView)
            this._mousedownView.onmousedrag(event);
    },

    _onmouseover: function(event)
    {
        var trackingIds= this.__hoverTrackingIds||{};
        var mouseOverIds= this.__mouseOverIds||{};
        var newMouseOverIds= {};
        
        var e= event.target||event.srcElement;
        var body= document.body;
        var callbacks;
        var view;
        var id;
        var i;
        var len;
        var c;
        
        for (; e && e!=body; e=e.parentNode)
        {
            id= e.id;
            
            //  Only consider nodes that have an ID that is being tracked
            if (!id || !(id in trackingIds))
                continue;

            //  keep track of this id
            newMouseOverIds[id]= true;
            
            //  If the node has already been tracked as containing the mouse,
            //  we don't need to notify it
            if (id in mouseOverIds)
                continue;

            //  Fire any onmouseenter callbacks in trackingIds
            callbacks= trackingIds[id];
            len= callbacks.length;
            
            for (i=0; i<len; ++i)
            {
                c= callbacks[i];
                if (c.onmouseenter)
                    c.onmouseenter.call(c.owner, e, c.ownerInfo);
            }
        }
        
        for (id in mouseOverIds)
        {
            if (id in newMouseOverIds)
                continue;
            
            e= document.getElementById(id);
            if (!e)
                continue;
                
            //  Fire any onmouseleave callbacks in trackingIds
            callbacks= trackingIds[id];
            len= callbacks.length;
            for (i=0; i<len; ++i)
            {
                c= callbacks[i];
                if (c.onmouseleave)
                    c.onmouseleave.call(c.owner, e, c.ownerInfo);
            }
        }

        this.__mouseOverIds= newMouseOverIds;
    },
    
    _onmouseout: function(event)
    {
    },
    
    _onclick: function(event)
    {
        // Mozilla likes to fire an onclick when right-clicking the page,
        // (as opposed to oncontextmenu). We think this is wrong, and so 
        // we'll quit if this is the case.
        if (DC.Browser.Mozilla && event.button===2)
            return;
            
        var view= this.targetViewForEvent(event);
        if (view)
            view.onclick(event);
        else
            this._fireDelegates(event);
    },

    _ondblclick: function(event)
    {
        if (this._mousedownView)
            this._mousedownView.ondblclick(event);
    },
        
    _onkeydown: function(event)
    {
        var target= this.firstResponder;
        if (target) {
            target.onkeydown(event);
        }
    },
    
    _onkeyup: function(event)
    {
        var target= this.firstResponder;
        if (target)
            target.onkeyup(event);
    },
    
    _onkeypress: function(event)
    {
        var target= this.firstResponder;
        if (target)
            target.onkeypress(event);
    },
    
    _onfocus: function(event)
    {
        var isDocument= (event.target||event.srcElement)==window;
        
        if (DC.Browser.IE) {
            if (document.activeElement == this.focusedElement) {
                isDocument = true;
            }
        }

        if (isDocument)
        {
            if (!this._documentFocused) {
                this.makeFirstResponder(this._previousFirstResponder||null);
                this._previousFirstResponder= null;
                this._documentFocused = true;
                
                if(!dashcode.inDesign && document.body){
                    Element.removeClassName(document.body, 'DC_windowInactive');
                }

            }
        }
        else
        {
            var view= this.targetViewForEvent(event);

            if (view && view.acceptsFirstResponder())
                this.makeFirstResponder(view);
            else
                this.makeFirstResponder(null);
                
            this.focusedElement = event.target||event.srcElement;
        }
    },
    
    _onblur: function(event)
    {
        var isDocument= (event.target||event.srcElement)==window;
        
        if (DC.Browser.IE) {
            if (document.activeElement == this.focusedElement) {
                isDocument = true;
            }
        }
        
        if (isDocument)
        {
            this._documentFocused = false;
            this._previousFirstResponder= this.firstResponder;
            this.makeFirstResponder(null);
            
            if(!dashcode.inDesign && document.body){
                Element.addClassName(document.body, 'DC_windowInactive');    
            }

        }
        else
        {
            var view= this.targetViewForEvent(event);

            this.focusedElement = null;
        
            if (view && view.acceptsFirstResponder())
                this.makeFirstResponder(null);
        }
    },
    
    _ontouchstart: function(event)
    {
        var view= this.targetViewForEvent(event);
        if (view)
        {
            var self = this;
                      
            view.ontouchstart(event);
            this._touchstartMouseDownDelay = window.setTimeout(function(){
                view.onmousedown(event);
                self._touchsentMD = true;
                delete self._touchstartMouseDownDelay;
            },100);
        }
        this._touchstartView= view;
        this._touchmovedX = false;
        this._touchmovedY = false;
        this._touchsentMD = false;
        this._touchstartX = event.targetTouches[0].clientX;
        this._touchstartY = event.targetTouches[0].clientY;
    },
    
    _ontouchmove: function(event)
    {
        var x = event.targetTouches[0].clientX;
        var y = event.targetTouches[0].clientY;
        var xJustMoved = false;
        var yJustMoved = false;
        
        if (!this._touchmovedX && Math.abs(this._touchstartX-x) > 5)
            xJustMoved= this._touchmovedX = true;

        if (!this._touchmovedY && Math.abs(this._touchstartY-y) > 5)
            yJustMoved= this._touchmovedY = true;
        
        if (this._touchstartView) {
            this._touchstartView.ontouchmove(event);
            
            if (this._touchstartMouseDownDelay) {
                window.clearTimeout(this._touchstartMouseDownDelay);
                delete this._touchstartMouseDownDelay;
            }

            if (xJustMoved || yJustMoved) { 
                if (this._touchsentMD) {
                    this._touchstartView.onmouseup(event);
                    this._touchsentMD = false;
                }
                
                if (!this._touchmovedY && xJustMoved) {
                    this._touchstartView.onswipe(event);
                }
            } 
        }
        
    },
    
    _ontouchend: function(event)
    {
        if (this._touchstartView)
        {
            this._touchstartView.ontouchend(event);

            if (this._touchstartMouseDownDelay) {
                var startView = this._touchstartView;
                
                window.clearTimeout(this._touchstartMouseDownDelay);                    
                delete this._touchstartMouseDownDelay;

                this._touchstartView.onmousedown(event);
                this._touchsentMD = true;
                
                setTimeout(function(){
                    startView.onmouseup(event);
                    startView.onclick(event);
                },0);
            } else if (this._touchsentMD) {
                this._touchstartView.onmouseup(event);
                
                if (!this._touchmovedX && !this._touchmovedY) {
                    this._touchstartView.onclick(event);
                }
            }            
        }
    },
    
    _ontouchcancel: function(event)
    {
        if (this._touchstartView)
        {
            this._touchstartView.ontouchend(event);

            if (this._touchstartMouseDownDelay) {
                window.clearTimeout(this._touchstartMouseDownDelay);
                delete this._touchstartMouseDownDelay;
            } else if (this._touchsentMD) {
                this._touchstartView.onmouseup(event);
            }         
        }
    },
    
    _onunload: function()
    {
        var id;
        var viewLookup= DC.View.viewLookup;
        for (id in viewLookup)
        {
            viewLookup[id].teardown();
            delete viewLookup[id];
        }
    }
    
});


(function(){

    DC.page= new DC.Page();
    
    window._setTimeout= window.setTimeout;
    window.setTimeout= function(handler, delay)
    {
        if (!handler)
            return null;
            
        if ('string'===typeof(handler))
        {
            handler= 'DC.EventLoop.begin();do {' +
                     handler + '} while (false); ' +
                     'DC.EventLoop.end();';
            return window._setTimeout(handler, delay);
        }
        
        var args= Array.from(arguments, 2);
        
        function wrapped()
        {
            DC.EventLoop.begin();
            var value= handler.apply(this, args);
            DC.EventLoop.end();
            return value;
        }
        return window._setTimeout(wrapped, delay);
    }
    
    window._setInterval= window.setInterval;
    window.setInterval= function(handler, delay)
    {
        if (!handler)
            return null;

        if ('string'===typeof(handler))
        {
            handler= 'DC.EventLoop.begin();do {' +
                     handler + '} while (false); ' +
                     'DC.EventLoop.end();';
            return window._setInterval(handler, delay);
        }
        
        var args= Array.from(arguments, 2);
        
        function wrapped()
        {
            DC.EventLoop.begin();
            var value= handler.apply(this, args);
            DC.EventLoop.end();
            return value;
        }
        return window._setInterval(wrapped, delay);
    }
    
    var p= DC.page;
    var wrapEventHandler;
    
    if (DC.Browser.IE)
    {
        wrapEventHandler=function(fn)
        {
            return function()
            {
                DC.EventLoop.begin(window.event);
                p[fn](window.event);
                DC.EventLoop.end();
            };
        };

        document.attachEvent('onmouseover', wrapEventHandler("_onmouseover"));
        document.attachEvent('onmouseout', wrapEventHandler("_onmouseout"));
        document.attachEvent('onmousedown', wrapEventHandler("_onmousedown"));
        document.attachEvent('onmouseup', wrapEventHandler("_onmouseup"));
        document.attachEvent('onclick', wrapEventHandler("_onclick"));
        document.attachEvent('ondblclick', wrapEventHandler("_ondblclick"));
        document.attachEvent('onkeydown', wrapEventHandler("_onkeydown"));
        document.attachEvent('onkeyup', wrapEventHandler("_onkeyup"));
        document.attachEvent('onkeypress', wrapEventHandler("_onkeypress"));
        document.attachEvent('onfocusin', wrapEventHandler("_onfocus"));
        document.attachEvent('onfocusout', wrapEventHandler("_onblur"));
        window.attachEvent('focus', wrapEventHandler("_onfocus"));
        window.attachEvent('blur', wrapEventHandler("_onblur"));
        window.attachEvent('onunload', wrapEventHandler("_onunload"));
    }
    else
    {
        wrapEventHandler=function(fn)
        {
            return function(event)
            {
                DC.EventLoop.begin(event);
                p[fn](event);
                DC.EventLoop.end();
            };
        };
    
        document.addEventListener('keydown', wrapEventHandler("_onkeydown"), false);
        document.addEventListener('keyup', wrapEventHandler("_onkeyup"), false);
        document.addEventListener('keypress', wrapEventHandler("_onkeypress"), false);
        document.addEventListener('focus', wrapEventHandler("_onfocus"), true);
        document.addEventListener('blur', wrapEventHandler("_onblur"), true);
        window.addEventListener('focus', wrapEventHandler("_onfocus"), false);
        window.addEventListener('blur', wrapEventHandler("_onblur"), false);

        if (!DC.Browser.MobileSafari)
        {
            document.addEventListener('click', wrapEventHandler("_onclick"), false);
            document.addEventListener('dblclick', wrapEventHandler("_ondblclick"), false);
        }
        if (DC.Support.Touches)
        {
            document.addEventListener('touchstart', wrapEventHandler("_ontouchstart"), true);
            document.addEventListener('touchmove', wrapEventHandler("_ontouchmove"), true);
            document.addEventListener('touchend', wrapEventHandler("_ontouchend"), true);
            document.addEventListener('touchcancel', wrapEventHandler("_ontouchcancel"), true);            
        } else {
            document.addEventListener('mouseover', wrapEventHandler("_onmouseover"), false);
            document.addEventListener('mouseout', wrapEventHandler("_onmouseout"), false);
            document.addEventListener('mousedown', wrapEventHandler("_onmousedown"), false);
            document.addEventListener('mouseup', wrapEventHandler("_onmouseup"), false);
        }
    }
})();