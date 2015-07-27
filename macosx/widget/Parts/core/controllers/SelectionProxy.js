/*jsl:import ../core/kvo.js*/


/** Placeholders are returned by the selection attribute for controllers when
 *  either there is no selection or there are multiple values selected.
 *  Note: These can't be objects (e.g. {}) because JavaScript tests for pointer
 *  equality when comparing objects and this doesn't work between frames.
 *  
 *  @namespace
 **/
DC.Markers= {

    MultipleValues: "ThisIsAnUniqueStringThatRepresentsMultipleValues",
    NoSelection: "ThisIsAnUniqueStringThatRepresentsNoSelection"

};



/** A placeholder for the selection in an array controller. This proxy manages
 *  the multiple selection placeholders and such.
 *  
 *  @declare DC.SelectionProxy
 *  @extends DC.KVO
 */
DC.SelectionProxy= Class.create(DC.KVO, {

    /** Construct a new SelectionProxy. This is only ever called by a Controller
     *  instance, so there's probably no reason to call this method.
     *  
     *  @param {DC.Controller} controller the controller owning the
     *          selection this proxy is managing.
     */
    constructor: function(controller)
    {
        this.controller= controller;
        this.mutable= true;
    },
    
    infoForKey: function(key)
    {
        var selectedObjects= this.controller.selectedObjects();
        var keyInfo= selectedObjects.infoForKey(key);
        keyInfo.mutable &= this.mutable;
        return keyInfo;
    },
    
    infoForKeyPath: function(keyPath)
    {
        var selectedObjects= this.controller.selectedObjects();
        var keyInfo= selectedObjects.infoForKeyPath(keyPath);
        keyInfo.mutable &= this.mutable;
        return keyInfo;
    },
    
    translateValue: function(value)
    {
        if ("array"!==DC.typeOf(value))
            return value;
    
        //  handle single element array
        if (1===value.length)
            return value[0];
        
        var i;
        var len;
        var v= value[0];
    
        for (i=1, len=value.length; i<len; ++i)
        {
            if (0!==DC.compareValues(v, value[i]))
                return DC.Markers.MultipleValues;
        }
    
        return v;
    },
    
    valueForKey: function(key)
    {
        var selectedObjects= this.controller.selectedObjects();
        if (0===selectedObjects.length)
            return DC.Markers.NoSelection;

        var result= selectedObjects.valueForKey(key);
        return this.translateValue(result);
    },

    validateValueForKeyPath: function(value, keyPath)
    {
        var selectedObjects= this.controller.selectedObjects();
        var len= selectedObjects.length;
        var i;
        
        if (0===len)
            return value;
        
        var validValue;
        for (i=0; i<len; ++i)
        {
            validValue= selectedObjects[i].validateValueForKeyPath(value, keyPath);
            if (validValue instanceof DC.Error)
                return validValue;
        }
        
        return validValue;
    },
    
    valueForKeyPath: function(keyPath)
    {
        var selectedObjects= this.controller.selectedObjects();
        //  handle no selection placeholder
        if (0===selectedObjects.length)
            return DC.Markers.NoSelection;

        var result= selectedObjects.valueForKeyPath(keyPath);
        return this.translateValue(result);
    },
    
    setValueForKey: function(value, key)
    {
        if (!this.mutable)
            return;

        var selectedObjects= this.controller.selectedObjects();
        var previousValue= this.valueForKey(key);
        selectedObjects.setValueForKey(value, key);
        var newValue= this.valueForKey(key);
        
        if (previousValue===newValue)
            return;

        var change= new DC.ChangeNotification(this, DC.ChangeType.setting,
                                                    newValue, previousValue);
        this.notifyObserversOfChangeForKeyPath(change, key);
    },
    
    setValueForKeyPath: function(value, keyPath)
    {
        if (!this.mutable)
            return;
            
        var selectedObjects= this.controller.selectedObjects();
        var previousValue= this.valueForKeyPath(keyPath);
        selectedObjects.setValueForKeyPath(value, keyPath);
        var newValue= this.valueForKeyPath(keyPath);
        
        if (previousValue===newValue)
            return;

        var change= new DC.ChangeNotification(this, DC.ChangeType.setting,
                                                    newValue, previousValue);
        this.notifyObserversOfChangeForKeyPath(change, keyPath);
    }
});
