/*jsl:import Controller.js*/
/*jsl:import SelectionProxy.js*/



/** An ObjectController manages a single object and reflects its selection and
 *  editable status.
 *  
 *  @property objectClass   A reference to the constructor which should be used
 *                          if the controller needs to create a new instance of
 *                          the class it is managing.
 *  
 *  @declare DC.ObjectController
 *  @extends DC.Controller
 **/
DC.ObjectController= Class.create(DC.Controller, {

    /** Create an instance of an ObjectController.
     *  
     *  @param {Object} [parameters=null]  a mapping between the controller's
     *          exposed bindings and the global context.
     */
    constructor: function(parameters)
    {
        this.base(parameters);

        this.objectClass= DC.KVO;
        this.__content= null;
        this.__editable= true;
        this.__selectedObjects= [];
        this.__selection= new DC.SelectionProxy(this);
    },
    
    /** Perform magic to correctly reflect changes to the selectedObjects as a
     *  change to the selection. This could probably be a bit cleaner...
     *  
     *  @private
     *  
     *  @param {DC.ChangeNotification} change the property change
     *          notification
     *  @param {String} keyPath the keypath relative to the child object not
     *          this object
     *  @param {String} context the name of the child object that is changing
     */
    observeChildObjectChangeForKeyPath: function(change, keyPath, context)
    {
        this.base(change, keyPath, context);
        if ('selectedObjects'!==context)
            return;
            
        var selectionKeyPath= 'selection.' + keyPath;
        var newValue= this.valueForKeyPath(selectionKeyPath);
        var selectionChange= new DC.ChangeNotification(this, DC.ChangeType.setting,
                                                    newValue, null);
        this.notifyObserversOfChangeForKeyPath(selectionChange, selectionKeyPath);
    },
    
    keyDependencies: {
    },
    
    exposedBindings: ["editable", "content"],
    
    /** Retrieve whether this content of this controller is editable. The content
     *  is editable if it was set directly (not via a binding) or if the bound
     *  content keyPath is editable.
     *
     *  @returns true if the content of the controller is editable, false if not
     **/
    editable: function()
    {
        var editable= this.__editable;
        
        //  Controller can't be editable if the content is not mutable
        if (this.bindings.content)
            editable &= this.bindings.content.mutable();
        return editable;
    },

    /** Set the editable flag for this controller. Changes to this value are
     *  ignored if the content is set via a binding. Note, if the content is
     *  bound and isn't mutable, setting editable will have no real effect.
     *  
     *  @param {Boolean} editable   the new value for the editable property
     **/
    setEditable: function(editable)
    {
        //  Controller can't be editable if the content is not mutable
        if (this.bindings.content)
            editable &= this.bindings.content.mutable();

        if (this.bindings.editable)
            this.bingings.editable.setValue(editable);
        this.__editable= editable;
    },

    /** Retrieve the content for this controller. For ObjectControllers, this is
     *  just a single object. For subclasses, this may be an array or other
     *  data.
     *  
     *  @returns the content this Controller is managing.
     **/
    content: function()
    {
        return this.__content;
    },

    /** Set the content for this controller.
     *  
     *  @param newContent   the object for this Controller.
     **/
    setContent: function(newContent)
    {
        if (this.bindings.content)
            this.bindings.content.setValue(newContent);

        this.__content= newContent;
        
        this.willChangeValueForKey('selectedObjects');    
        if (!newContent)
            this.__selectedObjects= [];
        else
            this.__selectedObjects= [newContent];
        this.didChangeValueForKey('selectedObjects');
        //  The selection proxy will never actually change, so I need to force
        //  a change notification.
        this.forceChangeNotificationForKey('selection');
    },

    /** Retrieve the selected objects. For an ObjectController, this is always
     *  the single object being managed.
     *  
     *  @returns {Object} the managed object
     **/
    selectedObjects: function()
    {
        return this.__selectedObjects;
    },

    /** Retrieve a proxy for the selection.
     *  
     *  @returns {DC.SelectionProxy} a proxy to the selection for this
     *           controller.
     **/
    selection: function()
    {
        return this.__selection;
    }

});
