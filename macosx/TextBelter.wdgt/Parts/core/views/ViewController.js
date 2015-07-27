/*jsl:import Responder.js*/

DC.ViewController= Class.create(DC.Responder, {

    /** What view is associated with this controller? */
    view: null,
    
    /** When displaying the name of this view, what value should be used? */
    title: null,
    
    /** Don't automatically setup the bindings, because Views need to exist
        first and be fully initialised.
     */
    automaticallySetupBindings: false,
    
    /** Construct a ViewController.
        @param name     the name with which to register the view controller
        @param view     either the ID of a node, a node, or a reference to a
                        view object. This is the view this controller will
                        manage.
        @param [parameters]    a hash with initial values for the
                        controller.
     */
    constructor: function(view, parameters)
    {
        this.base(parameters);
        
        if ('string'===typeof(view))
            this.__viewId= view;
        else if (view && 1===view.nodeType)
            this.__viewId= Element.assignId(view);
        else
            this.__viewId= view.id;

        var viewNode= document.getElementById(this.__viewId);
        this.viewElement= function() { return viewNode; }
    },

    registerWithName: function(name)
    {
        if (!name)
            return;
        this.name= name;
        DC.registerModelWithName(this, name);
    },

    nextResponder: function()
    {
        return this.view.superview();
    },
    
    /** Return the declarative structure of the View.
        @returns an object with keys representing CSS queries for the views to
                 set up.
     **/
    structure: function()
    {
        return this.__structure__;
    },
    
    /** Helper function that makes Parts & PartLists work correctly with
        ViewControllers. This proxies over to the view to return the node
        associated with the controlled view.
     */
    viewElement: function()
    {
        return this.view.viewElement();
    },
    
    addTrackingInfo: function(nodeOrId, info)
    {
        DC.page.addTrackingInfo(nodeOrId, info);
    },
    
    __postConstruct: function()
    {
        var viewNode= document.getElementById(this.__viewId);
        
        if (viewNode)
            this.__init();
        else
            Event.onDomReady(this.__init.bind(this));
    },

    __init: function()
    {
        this.__initialising= true;
        
        var viewNode= document.getElementById(this.__viewId);
        if (!viewNode)
            throw new Error('Unable to locate node with ID: ' + this.__viewId);
        
        //  create the view tree for this view
        var oldContext= this.__context;
        
        var oldDataModel= DC.dataModel;
        this.__context= DC.dataModel= this;
        
        var structure= this.structure()||{};
        var factories= {};
        var v;
        var p;
        
        this.__copyParameters(this.__parameters||{});
        
        var view= DC.View.fromNode(viewNode);

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

        if (!view)
        {
            DC.View.createViewsForNodeTree(viewNode, null, this);
            view= DC.View.createViewForNode(viewNode);
        }
        this.view= view;
        //  Insert the view controller into the responder chain
        this.view.setNextResponder(this);
        
        DC.dataModel= oldDataModel;
        this.__context= oldContext;

        this.setupBindings();
        this.init();
        this.updateBindings();
        this.createObservers();
        
        delete this.__initialising;
        delete this.viewElement;
    },
    
    init: function()
    {
    }
    
});

DC.ViewController.__subclassCreated__= function(subclass)
{
    var proto= subclass.prototype;
    var baseproto= subclass.superclass.prototype;
    
    //  Allow inheritance of __structure__ definitions from base classes
    if (proto.__structure__!==baseproto.__structure__)
        Object.applyDefaults(proto.__structure__, baseproto.__structure__);
}
