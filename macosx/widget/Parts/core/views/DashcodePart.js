/*jsl:import View.js*/

/**   
 *  @declare DC.DashcodePart
 *  @extends DC.View
 *  
 */
 
DC.DashcodePart = Class.create(DC.View, {
    
    /* Mask out the html binding for all DashcodePart objects */
    maskedBindings: ['html','text'],

    constructor: function(view, relativeSource, properties ,spec){

        if (!spec && (view.id || view.originalID) && dashcodePartSpecs){
            spec = dashcodePartSpecs[view.originalID?view.originalID:view.id];
            
            if (spec && !properties && !dashcode.inDesign) 
                properties = spec.propertyValues;
        }

        // Part already set up
        if (view.object)
            return;
        
        // Call the base constructor
        this.base(view, relativeSource, properties);        
                            
        this._registerForDocumentInsertionNotifcationIfNeeded();
        
        this.partSetup(spec);        
    },
    
    // Override this method
    partSetup: function(spec){
    },
    
    _sendLegacyOnClick: function(event,element,callback)
    {
        var self = this;
        
        this._savedOnClick = element.onclick;
        element.onclick = function(event){
            callback(event);
            element.onclick = self._savedOnClick;
            delete self._savedOnClick;
        }
        
        // Create a fake onclick event targeted on the element
        if (document.createEvent) {
            var clickEvent = document.createEvent("MouseEvents");
            clickEvent.initMouseEvent("click",false,false,window,1,
                event?event.screenX:0,
                event?event.screenY:0,
                event?event.clientX:0,
                event?event.clientY:0,
                event?event.ctrlKey:false,
                event?event.altKey:false,
                event?event.shiftKey:false,
                event?event.metaKey:false,
                event?event.button:0,null);
            element.dispatchEvent(clickEvent);
        } else {
            element.onclick(event);
        }
        
    },
    
    _setOnClickAsAction: function(handler,element){
        var self = this;
        
        if (!element) {
            element = this.viewElement();
        }
        
        if (handler) {
            this.action = function(view, event){
                self._sendLegacyOnClick(event,element,handler);
            }
        } else {
            this.action = null;
        }
    },

    // Override to be notified when inserted into a real document
    insertedIntoDocument: function()
    {
    },
    
    _registerForDocumentInsertionNotifcationIfNeeded: function()
    {
        var node = this.viewElement();
        var topNode = node;
        var document = node.ownerDocument;
        
        while(node.parentNode){
            topNode = node;
            node = node.parentNode;
        }
        
        // not deferred, we are in a document
        if (node == document)
            return false;
        
        var self = this;
        
        Event.observe(topNode, 'DOMNodeInsertedIntoDocument',function(event){
            self.insertedIntoDocument();
        });
    },

    observeEnabledChange: function(change)
    {
        if (this.__initialising && (null===change.newValue ||
            'undefined'===change.newValue))
        {
            this.bindings.enabled.setValue(!this.valueForKey("enabled"));
            return;
        }
        
        this.setValueForKey(change.newValue,"enabled");
    }
});

DC.DashcodePart.PropertiesForNode= function(node)
{
    if (dashcode.inDesign)
        return undefined;
        
    if ((node.id || node.originalID) && dashcodePartSpecs){
        var spec = dashcodePartSpecs[node.originalID?node.originalID:node.id];
        
        if (spec)
            return spec.propertyValues;
    }

    return undefined;
}

/* Support for changing view id on the fly.  This works for all DC.Views, even though it is defined at this level */
DC.DashcodePart.updateViewId= function(oldId,newId)
{
    var view = DC.View.fromNode(oldId);

    view.id = newId;
    delete DC.View.viewLookup[oldId];
    DC.View.viewLookup[newId] = view;
}

/**   
 *  @declare DC.Text
 *  @extends DC.DashcodePart
 *  
 */
DC.Text = Class.create(DC.DashcodePart, {
    
    exposedBindings: ['text','html'],
    
    // Override this method
    partSetup: function(spec){
        if (spec.text) {
            var text = spec.text;
                               
           if (window.dashcode && dashcode.getLocalizedString) text = dashcode.getLocalizedString(text);
           
           this.viewElement().innerText = text;
        }
    }    
});

/** 
 * Override DC.View static functions to inject some Dashcode specifics
 *
 *
 */

DC.DashcodeOverrides = {
    Original: {
        View: {
            createViewForNode: DC.View.createViewForNode,
            viewClassForNode: DC.View.viewClassForNode
        },
        Binding: {
            bindingFromString: DC.Binding.bindingFromString
        }
    },
    Replacement: {
        View: {
            createViewForNode: function(node, relativeObject, bindingsMap)
            {
                return DC.DashcodeOverrides.Original.View.createViewForNode(node, relativeObject, bindingsMap);
            },
            viewClassForNode: function(node, hasBindings)
            {
                var viewClass = undefined;
                
                if (node && (node.originalID || node.id)) {
                    var spec = dashcodePartSpecs[node.originalID?node.originalID:node.id];
                    
                    if (spec && spec.view){
                        try{ viewClass = eval(spec.view);} catch (e) {}
                    }
                    
                    if (spec && spec.hasBindings){
                        if (!hasBindings)
                            hasBindings = true;
                    }
                }
                
                if (!viewClass)
                    viewClass = DC.DashcodeOverrides.Original.View.viewClassForNode(node, hasBindings);
                    
                return viewClass;
            }
        },
        Binding: {
            bindingFromString: function(bindingString, object)
            {   
                if (DC.DashcodeOverrides.bindToContent && (object instanceof DC.ObjectController)){
                    // If it doesn't start with content.foo
                    if ((bindingString.substr(0,7) != "content")){
                        bindingString = "content." + bindingString;
                    }
                }
                return DC.DashcodeOverrides.Original.Binding.bindingFromString(bindingString,object);
            }
        }
    }
}

//DC.View.createViewForNode = DC.DashcodeOverrides.Replacement.View.createViewForNode;
DC.View.viewClassForNode = DC.DashcodeOverrides.Replacement.View.viewClassForNode;
DC.Binding.bindingFromString = DC.DashcodeOverrides.Replacement.Binding.bindingFromString;