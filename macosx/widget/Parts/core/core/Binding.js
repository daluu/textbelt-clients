/*jsl:import kvo.js*/
/*jsl:import transformers.js*/

Object.extend(DC, {
    NoSelectionMarkerType: 'noSelection',
    MultipleValuesMarkerType: 'multipleValues',
    NullValueMarkerType: 'nullValue'
});

/** Initialiser for a class that manages the value associated with a binding.
 *  Each Bindable will have one Binding for each exposed binding. A
 *  Binding observes changes to the given keyPath on the specified object.
 *  When the value changes, the Binding transforms it (if a transformer
 *  was specified) and calls its observerFn method.
 *  
 *  The correct way to use a Binding is to create it with the object,
 *  keyPath and transformer. Then assign a callback handler to the observerFn
 *  method.
 *  
 *  @declare DC.Binding
 */
DC.Binding= Class.create({

    /** Create a new Binding and associate it with a keypath on a specific
        object.

        @param settings.name        The name of the binding
        @param settings.object      The observed object
        @param settings.observer    The object doing the observing
        @param settings.observerFn  The method to call when the value changes
        @param settings.keyPath     The path to the value that should be observed
        @param settings.transformer The value transformer to use
        @param settings.animated    Whether changes to this binding should be
               animated. This requires support from the observer.
        @param settings.initFromDOM Whether the value should be pulled out of
               the DOM during initialisation.
        @param settings.nullValuePlaceholder
        @param settings.multipleValuesPlaceholder
        @param settings.noSelectionPlaceholder
     */
    constructor: function(settings)
    {
        Object.extend(this, settings);
        
        if ('string'===typeof(this.transformer))
            this.transformer= DC.findTransformerWithName(this.transformer);
    
        //  Convert either a Constructor or a factory function into an instance
        if ('function'===typeof(this.transformer))
        {
            if (this.transformer.__factoryFn__)
                this.transformer= this.transformer();
            else
                this.transformer= new this.transformer();
        }
        
        this.refresh();
    },
    
    /** Begin tracking changes to the value for this Binding. This method adds
     *  the binding as an observer on the bound object with the given keypath.
     **/
    bind: function()
    {
        this.object.addObserverForKeyPath(this, this.observeChangeForKeyPath,
                                          this.keypath);
    },
    
    /** Stop tracking changes to the value for this Binding.
     **/
    unbind: function()
    {
        this.object.removeObserverForKeyPath(this, this.keypath);
    },

    refresh: function()
    {
        var newValue= this.object.valueForKeyPath(this.keypath);
        this.cachedOriginalValue= newValue;

        this.markerType= this.markerTypeFromValue(newValue);
        if (this.markerType)
        {
            if ((this.markerType+'Placeholder') in this)
                newValue= this[this.markerType+'Placeholder'];
            else
                newValue= this.observer.defaultPlaceholderForMarkerWithBinding(this.markerType, this.name);
        }
        else
            newValue= this.transformedValue(newValue);

        this.cachedValue= newValue;
    },
    
    /** Transform the value tracked by this Binding according to the value 
     *  transformer. If there's no value transformer, then the value won't change.
     *  
     *  @param value    the present value
     *  @returns the value transformed according to the value transformer, or
     *           the original value if there is no transformer.
     **/
    transformedValue: function(value)
    {
        if (!this.transformer)
            return value;
        return this.transformer.transformedValue(value);
    },
    
    /** Validate a proposed value. If the value can be coerced into a valid
        value, this will return the new value. Otherwise, it will return an
        instance of DC.Error.
        
        @param newValue the proposed new value that needs validation
        @returns either a valid value or an instance of DC.Error
     */
    validateProposedValue: function(newValue)
    {
        if (this.transformer)
        {
            if (!this.transformer.reverseTransformedValue)
                throw new Error("Can't validate a value when the transformer doesn't have a reverseTransformedValue method");
            newValue= this.transformer.reverseTransformedValue(newValue);
        }
        
        var validValue= this.object.validateValueForKeyPath(newValue, this.keypath);
        if (validValue instanceof DC.Error)
            return validValue;
        
        return this.transformedValue(validValue);
    },
    
    /** Change the value tracked by this Binding. This method will check to
     *  see whether the new value is actually a change, and if not, it ignores
     *  the request. If the value has changed, it will first be transformed into
     *  a model value, then set on the target object.
     *
     *  @param newValue the new value for this Binding.
     **/
    setValue: function(newValue)
    {
        //  nothing to do if the value hasn't changed.
        if (this.cachedValue===newValue)
            return;
            
        this.markerType= this.markerTypeFromValue(newValue);
        
        this.cachedValue= newValue;
        if (this.transformer)
        {
            if (!this.transformer.reverseTransformedValue)
                return;
            newValue= this.transformer.reverseTransformedValue(newValue);
        }
        this.cachedOriginalValue= newValue;
        var oldUpdating= this.updating;
        this.updating= true;
        this.object.setValueForKeyPath(newValue, this.keypath);
        this.updating= oldUpdating;
    },
    
    /** Is the value tracked by this Binding mutable? A bound value may be
     *  immutable if the target object implements a getter for the specified
     *  key but no setter.
     *  
     *  @returns true if the value of the binding may be changed and false if
     *           if the binding may not be changed.
     **/
    mutable: function()
    {
        if (this.transformer && !this.transformer.reverseTransformedValue)
            return false;
        var keyInfo= this.object.infoForKeyPath(this.keypath);
        return keyInfo && keyInfo.mutable;
    },

    /** Retrieve the value for this Binding. The value is cached and only
     *  updated when changed. Of course, this is ok, because the Binding is
     *  observing changes to the value...
     *
     *  @returns the cached value of this Binding.
     **/
    value: function()
    {
        return this.cachedValue;
    },
    
    /** Call the observerFn callback to update the View with the latest value.
     **/
    update: function()
    {
        var newValue= this.value();
        var change= new DC.ChangeNotification(this.object,
                                                    DC.ChangeType.setting,
                                                    newValue);
        this.updating= true;
        
        try{
            this.observerFn.call(this.observer, change, this.keypath);
        } catch (e) {
            console.error('Exception while bindng "' + this.name + '" to keypath "' + this.keypath + ' ": ' + e);
        }
        
        this.updating= false;
    },
    
    /** A callback function that should be set by clients of the Binding.
     *  This is here simply to prevent failures.
     *
     *  @param change   a {@link DC.ChangeNotification} with information
     *                  about the change
     *  @param keypath  the path to the value that has changed
     *  @param context  a client-specified value
     **/
    observerFn: function(change, keypath, context)
    {},
    
    /** Determine whether the value represents a marker value.
    
        @param value
        @returns the marker type or null if the value isn't a marker
     **/
    markerTypeFromValue: function(value)
    {
        if (null===value || 'undefined'===typeof(value) || ""===value)
            return DC.NullValueMarkerType;
        if (DC.Markers.MultipleValues===value)
            return DC.MultipleValuesMarkerType;
        if (DC.Markers.NoSelection===value)
            return DC.NoSelectionMarkerType;
        
        return null;
    },
    
    placeholderValue: function()
    {
        var placeholder;
        
        if ((this.markerType+'Placeholder') in this)
            placeholder= this[this.markerType+'Placeholder'];
        else
            placeholder= this.observer.defaultPlaceholderForMarkerWithBinding(this.markerType, this.name);
        
        if ('function'===typeof(placeholder))
            placeholder= placeholder.call(this.object);
            
        return placeholder;
    },
    
    /** The Binding's change observer method. This method makes a clone of the
     *  change notification before transforming the new value and old value (if
     *  present). This change notification is passed to the observerFn callback
     *  method.
     *
     *  @param change   a {@link DC.ChangeNotification} with information
     *                  about the change
     *  @param keypath  the path to the value that has changed
     *  @param context  a client-specified value
     **/    
    observeChangeForKeyPath: function(change, keypath, context)
    {
        if (this.updating && change.newValue===this.cachedOriginalValue)
            return;

        this.cachedOriginalValue= change.newValue;
        
        var newValue= change.newValue;
        
        //  Check for marker values
        this.markerType= this.markerTypeFromValue(newValue);
        if (this.markerType)
            newValue= this.placeholderValue();
        else
            newValue= this.transformedValue(newValue);


        var transformedChange= Object.clone(change);
        transformedChange.newValue= newValue;
        
        //  TODO: Need to do something clever about transforming the inserted
        //  values, and removing transformed values.
        if (DC.ChangeType.setting===change.changeType)
            this.cachedValue= newValue;

        var oldUpdating= this.updating;
        this.updating= true;

        try {
            this.observerFn.call(this.observer, transformedChange, keypath,context);                             
        } catch (e) {
            console.error('Exception while bindng "' + this.name + '" to keypath "' + this.keypath + ' ": ' + e);
        }

        this.updating= oldUpdating;
    }
    
});

DC.Binding.bindingRegex= /^(.*?)(?:\((.*)\))?$/;
DC.Binding.compoundRegex= /^\s*([^&|].*?)\s*(\&\&|\|\|)\s*(\S.+)\s*$/;

/** Create a new Binding for a target object based on a string
 *  representation of the binding. This uses the `Binding.bindingRegex`
 *  regular expression to parse the binding string.
 *  
 *  @param bindingString    the string representation of the binding.
 *  @returns a structure containing the keypath and the transformer
 **/
DC.Binding.bindingInfoFromString= function(bindingString)
{
    var match;
    var binding;
    
    //  First see if it's a compound binding string, if so, return a new
    //  CompoundBinding object.
    // match= bindingString.match(DC.Binding.compoundRegex);
    // if (match && 4==match.length)
    // {
    //     binding= new DC.CompoundBinding(match[2],
    //                             DC.Binding.bindingFromString(match[1], object),
    //                             DC.Binding.bindingFromString(match[3], object));
    //     binding.bind();
    //     return binding;
    // }
                                    
    //  Use the binding regular expression to pull apart the string
    match= bindingString.match(DC.Binding.bindingRegex);
    if (!match || match.length<3)
        throw new InvalidArgumentError("bindingString isn't in correct format");

    var bindingInfo= {
        keypath: match[1]
    };
    
    if (match[2])
        bindingInfo.transformer= DC.findTransformerWithName(match[2]);

    return bindingInfo;
}
