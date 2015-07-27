/*jsl:import view-core.js*/
/*jsl:import Responder.js*/

/** A View is a Bindable object.
 *    
 *  Note: Views can define a container element (`this.container`) which is the
 *  _real_ container of its child nodes. For example, when using a View with
 *  a TABLE element, the container is usually set to the first TBODY. This
 *  allows you to specify something clever in the THEAD that doesn't get stomped
 *  on by the body content.
 *
 *  @declare DC.View
 *  @extends DC.Responder
 **/
DC.View= Class.create(DC.Responder, {

    /** The bindings exposed by the Base view type. Each view should have its
        own list of exposed bindings and may choose to hide bindings from its
        parent.
     **/
    exposedBindings: ['visible', 'class', 'enabled', 'editable', 'html', 'text'],
    
    defaultPlaceholders: {
        text: {
            multipleValues: _('marker.text.multipleValues'),
            nullValue: _('marker.text.placeholder'),
            noSelection: _('marker.text.noSelection')
        },
        html: {
            multipleValues: _('marker.text.multipleValues'),
            nullValue: _('marker.text.placeholder'),
            noSelection: _('marker.text.noSelection')
        }
    },
    
    /** Don't automatically setup the bindings, because Views need to exist
        first and be fully initialised.
     */
    automaticallySetupBindings: false,
    
    /** Reference to a DC.Formatter instance that should be used for
        formatting the html/text value of this view.
     **/
    formatter: null,
    
    /** The target of the action defined for this view. In Cocoa this appears on
        the NSControl class, but NSControl and NSView are somewhat blended here.
     **/
    target: null,
    
    /** The action this view should send. In Cocoa this appears on the NSControl
        class, but NSControl and NSView are somewhat blended here. This should
        be a function/method reference. This function will be invoked and passed
        a reference 
     **/
    action: null,
    
    /** When should the action be sent? This should be the name of the event.**/
    sendActionOn: ['click'],
    
    /** Should updates be animated? **/
    animated: false,
    
    /** Duration (in ms) for the update animations. The total animation (in &
        out) will actually take two times this duration.
     **/
    updateAnimationDuration: 0,
    updateAnimationDelay: 0,
    
    postUpdateAnimationDuration: 0,
    postUpdateAnimationDelay: 0,
    
    preUpdateAnimationDuration: 0,
    preUpdateAnimationDelay: 0,
    
    /** Construct a new View. Most view subclasses actually inherit this
     *  constructor.
     *  
     *  @param view   either a string representing the ID of the view's node
     *                  or a reference to the DOM node itself
     *  @param [relativeSource] If the view uses relative key paths (*.foo),
     *                          this is the object those key paths will bind to.
     *  @param [parameters]    An optional hash assigning parameters for the view.
     */
    constructor: function(view, relativeSource, parameters)
    {
        this.base(parameters);
        
        if ('string'===typeof(view))
        {
            this.id= view;
            this.__view= document.getElementById(view);
        }
        else
        {
            this.id= Element.assignId(view);
            this.__view= view;
        }
        
        if ('object'===DC.typeOf(relativeSource) &&
            !('addObserverForKeyPath' in relativeSource))
            DC.KVO.adaptTree(relativeSource);            
                      
        this.__relativeSource= relativeSource;

        if (this.id in DC.View.viewLookup)
        {
            throw new Error('Two views share the same ID: ' + this.id);
        }
                      
        this.viewElement().object = this;
        
        this.__updating= null;
        DC.View.viewLookup[this.id]= this;
    },

    __postConstruct: function()
    {
        var self= this;
        
        function clearViewCache()
        {
            if (DC.Browser.IE)
            {
                delete self.__view;
                delete self.__container;
            }
        }
        clearViewCache.delay(250);
        
        var view= this.viewElement();
        if (view)
            this.__init();
        else
            Event.onDomReady(this.__init.bind(this));
    },

    __init: function()
    {
        this.__initialising= true;
        var view= this.viewElement();
        if (!view)
            throw new Error('Unable to locate node with ID: ' + this.id);
            
        //  short circuit lookup for view element
        this.viewElement= function() { return view; }
            
        var v;
        var p;
        
        //  setup parameters for this view...
        var parametersId= view.getAttribute('__parametersId');
        var parameters= this.__parameters || DC.View.nodeParameters[parametersId] || {};
        this.__copyParameters(parameters);

        //  generate structure if desired and there's no content in the view.
        if (this.innerHTML && ""===String(view.innerHTML).trim())
            view.innerHTML= this.innerHTML;
            
        //  re-jigger dataModel so that it points to this view
        var oldDataModel= DC.dataModel;
        var oldContext= this.__context;
        DC.dataModel= this.__context= this;
        
        //  process declarative structure and factory properties
        var structure= this.structure()||{};
        var factories= {};
        
        for (p in structure)
        {
            v= structure[p];
            if (v && 'function'==typeof(v) && (v=v.valueOf()).__factoryFn__)
            {
                factories[p]= v;
                v.call(this, p, true);
            }
        }
        
        for (p in factories)
            factories[p].call(this, p, false);

        //  restore original data model
        this.__context= oldContext;
        DC.dataModel= oldDataModel;
        
        this.setupBindings();
        this.init();
        this.initFromDOM();
        this.updateBindings();
        this.createObservers();
        delete this.__initialising;
        delete this.viewElement;
    },

    /** Remove all observers for the bound attributes. Called when this View is
     *  destroyed, however, because Javascript hasn't got a destructor or finalise
     *  method, this must be called manually -- in the case of Web pages, on the
     *  unload event.
     **/
    teardown: function()
    {
        for (var b in this.bindings)
            this.bindings[b].unbind();
        
        // Remove the object pointer from the node
        if (this.viewElement())
            this.viewElement().object= null;
        
        if (!DC.Browser.IE)
        {
            delete this.__view;
            delete this.__container;
        }
        delete DC.View.viewLookup[this.id];
    },
    
    __factory__: function(selector, parameters, container)
    {
        var klass= this;
        var findNodes= Element.queryAll;
        var bound= false;
        
        if ('string'!==typeof(selector))
        {
            container= parameters;
            parameters= selector;
            selector= null;
        }
        
        parameters= parameters||{};
        var nodeParametersId= 'parameters_' + DC.generateUid();
        
        DC.View.nodeParameters[nodeParametersId]= parameters;
        parameters.viewClass= klass;
        
        function setupBindings(node)
        {
            node.setAttribute('__parametersId', nodeParametersId);
            var v;
            
            if ('sortKey' in parameters)
                node.setAttribute('sortKey', parameters.sortKey);
        }
    
        function setupNode(node)
        {
            if (!bound)
                setupBindings(node);
            
            var relative= this.__relativeSource||this;
            
            var view= DC.View.fromNode(node)||new klass(node, relative);
            DC.View.createViewsForNodeTree(node, relative, this.__context);
        }

        /**
            @param sel  When called by ListView to instantiate a template, sel
                        is a node.
                        When called during the processing of the __structure__
                        member, sel is a CSS selector.
                        When called for declarative members, sel is undefined
                        
            @param bindOnly When called by ListView, this will be the relative
                        source value.
                        When called during the processing of the __structure__
                        member, this will be true if the paramaters should be
                        attached to the node or false to actually create the
                        view.
                        When called for declarative members, bindOnly is undefined
         **/
        return function(sel, bindOnly)
        {
            //  when called with a node, this is just an indirect method of 
            //  calling the constructor. This is used by the template support
            //  in ListView.
            if (sel && 1===sel.nodeType)
            {
                return new klass(sel, bindOnly, parameters);
            }
            
            var e= container||(this?this.viewElement():document);
            var nodes= findNodes(e, selector||sel);
            if (!nodes.length)
                return null;
                
            //  fix up target/action
            if ('action' in parameters)
            {
                if (!parameters.target)
                    parameters.target= this;
                    
                if (FIRST_RESPONDER!==parameters.target &&
                    'string'===typeof(parameters.action))
                    parameters.action= (parameters.target)[parameters.action];
            }

            Array.forEach(nodes, bindOnly?setupBindings:setupNode, this);
            
            bound= true;
            return DC.View.fromNode(nodes[0]);
        };
    },
    
    init: function()
    {
    },

    initFromDOM: function()
    {
    },

    /** Return the declarative structure of the View.
        @returns an object with keys representing CSS queries for the views to
                 set up.
     **/
    structure: function()
    {
        return this.__structure__;
    },
    
    /** Return the view element
     */
    viewElement: function()
    {
        return this.__view || document.getElementById(this.id);
    },

    /** Return the container element, which may be different from the view
     *  itself in lists or tables.
     */
    container: function()
    {
        return this.__container || this.__view ||
               document.getElementById(this.__containerId||this.id);
    },
    
    /** Set the container for the view.
     *  @param newContainer a reference to the new container node for the view
     */
    setContainer: function(newContainer)
    {
        if (this.__view)
            this.__container= newContainer;
        this.__containerId= Element.assignId(newContainer);
        return newContainer;
    },
    
    /** Find the parent view in the DOM heirarchy...
     */
    superview: function()
    {
        var node= this.viewElement();
        if (!node)
            return null;
        
        var view= null;
        
        while (node && !view)
        {
            node= node.parentNode;
            if (!node)
                return null;
            if (document==node)
                return DC.page;
            view= DC.View.fromNode(node);
        }
        
        return view;
    },

    isDescendantOf: function(parent)
    {
        if (!parent)
            return false;
        var parentNode= parent.viewElement();
        
        var node= this.viewElement();
        
        while (node && node!==document.body)
        {
            if (node.id==parentNode.id)
                return true;
            node= node.parentNode;
        }
        
        return false;
    },
    

    /** The default value for nextResponder for a View is the super view.
     */
    nextResponder: function()
    {
        return this.__nextResponder||this.superview();
    },
    
    /** Set the focus to the view.
     */
    focus: function()
    {
        var view= this.viewElement();
        view.focus();
    },
    
    /** Remove the focus from the view.
     */
    blur: function()
    {
        var view= this.viewElement();
        view.blur();
    },
    
    /** Send the action message to the target.
     */
    sendAction: function()
    {
        var event= DC.EventLoop.currentEvent;
        
        if (!this.action)
            return;

        if (FIRST_RESPONDER!==this.target || 'string'!==typeof(this.action))
        {
            this.action.call(this.target||this.action, this, event);
            return;
        }
        
        //  target is FIRST_RESPONDER and action is a string
        var responder= DC.page.firstResponder||this;
        var action= this.action;
        
        while (responder)
        {
            if (action in responder)
            {
                responder[action](this, event);
                return;
            }
            
            responder= responder.nextResponder();
        }
        
    },
    
    onclick: function(event)
    {
        if (this.disabled)
        {
            Event.stop(event);
            return;
        }
        
        //  The view should only send the action when the sendActionOn "mask"
        //  contains the click event.
        if (this.action && this.sendActionOn.containsObject('click'))
        {
            this.sendAction();
            Event.stop(event);
        }
        else
            this.base(event);
    },

    addTrackingInfo: function(trackingInfo)
    {
        DC.page.addTrackingInfo(this.id, trackingInfo);
    },
    
    /** Callback method for updating the View in response to changes in the value
     *  observed by the visible binding.
     *
     *  @param change   a ChangeNotification with information about the change
     *  @param keyPath  the path to the value that has changed
     *  @param context  a client-specified value
     **/
    observeVisibleChange: function(change, keyPath, context)
    {
        var view= this.viewElement();
        var classname= DC.Style.kFadingClass;
        
        function cleanup()
        {
            view.style.display = "none";
            Element.removeClassName(view, classname);
        }
        
        if (!this.animated)
            view.style.display= (change.newValue?"":"none");
        else if (change.newValue)
        {
            if (view.style.display !== "") {
                Element.addClassName(view, classname);
                view.style.display = "";
            }
            DC.Animator.removeClassName(view, classname, {
                duration: this.updateAnimationDuration || 300
            });
        }
        else
        {
            DC.Animator.addClassName(view, classname, {
                duration: this.updateAnimationDuration || 300,
                callback: cleanup
            });
        }
    },
    
    /** Update the views's enabled/disabled state based on changes to the data
     *  model.
     *  
     *  When disabled, the view adds the `DC.Style.kDisabledClass` to
     *  the nodes's class name. When enabled, this class is removed. Of course,
     *  the view also updates the nodes's disabled property.
     *  
     *  @param change   the change notification
     */
    observeEnabledChange: function(change)
    {
        var view= this.viewElement();

        this.disabled= view.disabled= !change.newValue;
        if (view.disabled)
            Element.addClassName(view, DC.Style.kDisabledClass);
        else
            Element.removeClassName(view, DC.Style.kDisabledClass);
    },

    /** Update the views's editable state based on changes to the data
     *  model.
     *  
     *  When not-editable, the view adds the `DC.Style.kReadOnlyClass` to
     *  the nodes's class name. When editable, this class is removed. Of course,
     *  the view also updates the nodes's readOnly property.
     *  
     *  @param change   the change notification
     */
    observeEditableChange: function(change)
    {
        var view= this.viewElement();
        
        view.readOnly= !change.newValue;
        if (view.readOnly)
            Element.addClassName(view, DC.Style.kReadOnlyClass);
        else
            Element.removeClassName(view, DC.Style.kReadOnlyClass);
    },
    
    /** Callback method for updating the View's class based on changes to the
     *  value observed by the class binding. This method makes a special effort to
     *  preserve any of the special classes which the View library adds to some
     *  elements (disabled, null value, selected, focused, and hover).
     *
     *  @param change   a ChangeNotification with information about the change
     *  @param keyPath  the path to the value that has changed
     *  @param context  a client-specified value
     **/
    observeClassChange: function(change, keyPath, context)
    {
        var view= this.viewElement();
        var oldClasses= $S(view.className.split(" "));
        var newClasses= $S((change.newValue||"").split(" "));
    
        //  reset any state classes
        function reapplyStyle(classname)
        {
            if (classname in oldClasses)
                Set.add(newClasses, classname);
        }
        DC.Style.__styles.forEach(reapplyStyle);
        
        var newClassName = Set.join(newClasses, ' ');
        
        if (this.animated)
            DC.Animator.setClassName(view, newClassName, {duration: 500});
        else
            view.className= newClassName;
    },

    _beginUpdate: function(callback, updateClassName)
    {
		if (callback)
			callback.call(this);
		/*
        var noAnimation = (this.preUpdateAnimationDuration || 
                           this.updateAnimationDuration ||
                           this.postUpdateAnimationDuration === 0);
        if (noAnimation && callback)
        {
            callback.call(this);
            return;
        }
        
        updateClassName= updateClassName || DC.Style.kUpdatingClass;
        
        var view= this.viewElement();
        var me= this;

        if (this.__updating)
        {
            this.__updating= callback||null;
            return;
        }
        
        this.__updating= callback||null;
        
        function readyToUpdate()
        {
            if (me.__updating)
                me.__updating.call(me);
            me.__updating= null;
            var duration= me.postUpdateAnimationDuration||me.updateAnimationDuration;
            var delay= me.postUpdateAnimationDelay||me.updateAnimationDelay;

            DC.Animator.removeClassName(view, updateClassName, {
                                                duration: duration,
                                                delay: delay
                                              });
        }

        var duration= this.preUpdateAnimationDuration||this.updateAnimationDuration;
        var delay= this.preUpdateAnimationDelay||this.updateAnimationDelay||0;
        DC.Animator.addClassName(view, updateClassName, {
                                           duration: duration,
                                           // delay: delay,
                                           callback: readyToUpdate
                                       });
        */
    },
    
    /** Track changes to the text binding.
    
        @param change   a ChangeNotification with information about the change
        @param keyPath  the path to the value that has changed
        @param context  a client-specified value
     **/
    observeTextChange: function(change, keyPath, context)
    {
        var view= this.viewElement();
        var markerType= this.bindings.text && this.bindings.text.markerType;
        var newValue= change.newValue;

        if (markerType)
        {
            if (null===newValue || 'undefined'===typeof(newValue))
                newValue="";
            Element.addClassName(view, DC.Style.kMarkerClass);
        }
        else
        {
            Element.removeClassName(view, DC.Style.kMarkerClass);
            if (this.formatter)
                newValue= this.formatter.stringFromValue(newValue);
        }
        
        function updateText()
        {
            var textNode = document.createTextNode(newValue);
            view.innerHTML="";
            view.appendChild(textNode);
        }
        
        this._beginUpdate(updateText);
    },
    
    /** Track changes to the html binding.
    
        @param change   a ChangeNotification with information about the change
        @param keyPath  the path to the value that has changed
        @param context  a client-specified value
     **/
    observeHtmlChange: function(change, keyPath, context)
    {
        var view= this.viewElement();
        var markerType= this.bindings.html && this.bindings.html.markerType;
        var newValue= change.newValue;
        
        if (markerType)
        {
            if (null===newValue || 'undefined'===typeof(newValue))
                newValue="";
            Element.addClassName(view, DC.Style.kMarkerClass);
        }
        else
        {
            Element.removeClassName(view, DC.Style.kMarkerClass);
            if (this.formatter)
                newValue= this.formatter.stringFromValue(newValue);
        }

        function updateHTML()
        {
            view.innerHTML= newValue;
        }
        
        this._beginUpdate(updateHTML);
    },
    
    /** Use this method rather than calling the DOM removeChild method directly,
     *  because this will automatically teardown the outgoing node and give the
     *  view a chance to remove any event handlers.
     *  
     *  @parameter node     the node to remove from this view.
     *  @returns the node that was removed or null if the node is null.
     */
    removeChild: function(node)
    {
        if (!node)
            return null;
        DC.View.teardownViewsForNodeTree(node);
        if (this.beforeRemoveElement)
            this.beforeRemoveElement(node);
        return node.parentNode.removeChild(node);
    },

    /** When this view is cloned, this method is called to set up any state that
        can't be inferred from the DOM.
        @param originalView   the view associated with the original DOM node.
     **/
    clonedFrom: function(originalView)
    {
    }
    
});

/** Lookup table for binding info **/
DC.View.nodeParameters= {};

/** Lookup table matching node IDs to view instances **/
DC.View.viewLookup= {};

/** Handle special processing for subclasses of the View class. This method
 *  registers the view by name (via __viewClassName__ key) and sets up matching
 *  tag specifications (via __tagSpec__ key). Also combines any default
 *  bindings specified for the subclass with default bindings from the super
 *  class.
 */
DC.View.__subclassCreated__= function(subclass)
{
    var proto= subclass.prototype;
    var baseproto= subclass.superclass.prototype;

    //  Allow inheritance of __structure__ definitions from base classes
    if (proto.__structure__!==baseproto.__structure__)
        Object.applyDefaults(proto.__structure__, baseproto.__structure__);
}

/** Determine the correct view class for a particular node.
 **/
DC.View.viewClassForNode= function(node, hasBindings)
{
    var parametersId= node.getAttribute("__parametersId");
    
    if (!parametersId)
        return null;
    
    return DC.View.nodeParameters[parametersId].viewClass;
}
        
/** Create a View wrapper for a specific node. This will attempt to determine
    the best view class and defaults to DC.View if nothing better could
    be found.
    
    @param node             the node for which a View should be created
    @param [relativeObject] an object which will be used for relative bindings
    @param [parameters]    a hash of initial parameters for the view
    @returns {DC.View} a new View reference
**/
DC.View.createViewForNode= function(node, relativeObject, parameters)
{
    var view= DC.View.fromNode(node);
    if (view)
        return view;
        
    var viewClass= DC.View.viewClassForNode(node, parameters);
    return new (viewClass||DC.View)(node, relativeObject, parameters);
}

/** Lookup the View instance for a particular node.
 *  @param element  the node which may be associated with a view
 *  @returns {DC.View} the view associated with the node or null if
 *           the node isn't associated with any views.
 */
DC.View.fromNode= function(element)
{
    var lookup= DC.View.viewLookup;
    var id = null;
    
    if (DC.typeOf(element) == "string")
        id = element;
    else if ("id" in element)
        id = element.id;
    
    if (!lookup || !id || !lookup[id])
        return null;
    
    return lookup[id];
}


/** Rebind this view to a new relative source
 */
DC.View.rebindNodeTreeWithRelativeSource= function(node, oldRelativeSource, newRelativeSource)
{
    function rebindView(node)
    {
        var view= DC.View.fromNode(node);
        if (!view || (oldRelativeSource && view.__relativeSource!==oldRelativeSource))
            return;
        
        view.__relativeSource= newRelativeSource;
        view.setupBindings();
        view.updateBindings();
    }
    
    Element.depthFirstTraversal(node, rebindView);
}

DC.View.unbindNodeTree= function(node)
{
    function unbindView(node)
    {
        var view= DC.View.fromNode(node);
        if (!view)
            return;
        view.unbind();
    }
    Element.depthFirstTraversal(node, unbindView);
}

/** Setup all the views within a container. All views are bound to the
 *  current context, however, the relativeSource is available for relative
 *  key paths (e.g. *.xxx.yyy.zzz).
 *  
 *  @param [node]           the DOM node in which the elements to be bound are
 *                          located, defaults to the document object.
 *  @param [relativeSource] a model object used for relative key path bindings
 **/
DC.View.createViewsForNodeTree= function(node, relativeSource, context)
{
    function setup(node)
    {
        if (DC.View.fromNode(node))
            return;
        var viewClass= DC.View.viewClassForNode(node);
        if (!viewClass)
            return;
        new (viewClass)(node, relativeSource, DC.DashcodePart.PropertiesForNode(node));
    }
    
    var oldDataModel= DC.dataModel;
    if (context)
        DC.dataModel= context;
    Element.depthFirstTraversal(node||document.body, setup);
    if (context)
        DC.dataModel= oldDataModel;
}    

DC.View.teardownViewsForNodeTree= function(node)
{
    function teardownNode(node)
    {
        var view= DC.View.fromNode(node);
        if (!view)
            return;
        view.teardown();
    }

    Element.depthFirstTraversal(node||document.body, teardownNode);
}

DC.View.cloneViewsForTreeNode = function(node,relativeSource,context)
{
    var originalIDTable = {};
	var newNode = Element.clone(node);
	    
	function cloneViewNode(clone){		
        var originalID = clone.id;
        
        if (clone == node && !originalID) {
            originalID = node.id;
        }
        
        if (originalID) 
            originalIDTable[originalID] = clone;
        
        clone.originalID = originalID;
        clone.id = "";

        var originalView = DC.View.fromNode(originalID);
        var viewClass= DC.View.viewClassForNode(clone);
       	var newView = null;		
        
        // If we have no view class, or for some reason 
        if (!viewClass || clone.object)
            return true;
        
        newView = new (viewClass)(clone, relativeSource,DC.DashcodePart.PropertiesForNode(clone));
        
        if (originalView && newView){
            newView.clonedFrom(originalView);
        }
            
        return true;
	}

	/* Iterate through node tree and newNode tree at the same time, calling cloneViewNode() */
    Element.depthFirstTraversal(newNode,cloneViewNode);

    if (!newNode.object) {
        newNode.object = {};
    }
    
    newNode.object.templateElements = originalIDTable;

    
	return newNode;
}