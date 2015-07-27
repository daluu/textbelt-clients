/*jsl:import FormControl.js*/

/**
 *  @declare DC.Slider
 *  @extends DC.FormControl
 **/
DC.Slider= Class.create(DC.FormControl, {
    
    exposedBindings: ['minValue', 'maxValue'],
        
    init: function()
    {
        //  chain to parent init.
        this.base();

        var view= this.viewElement();
        
        Event.observe(view, "change",
                   this.valueChanged.bindAsEventListener(this));

    },

    /** Callback for tracking changes to the value binding. This method will
     *  disable the control if the value is undefined (meaning one of the
     *  objects along the key path doesn't exist). Additionally, the control
     *  will be set to readonly if the value binding isn't mutable or if the new
     *  value is one of the marker values (MultipleValuesMarker or
     *  NoSelectionMarker).
     *
     *  @param change   a ChangeNotification with the new value for the slider
     **/
    observeValueChange: function(change)
    {
        var view= this.viewElement();
        var newValue= change.newValue;

        //  determine whether this value is a marker
        var markerType= this.bindings.value && this.bindings.value.markerType;
        
        if (!markerType && this.formatter)
            newValue= this.formatter.stringForValue(newValue);

        if (DC.NoSelectionMarkerType===markerType)
            view.disabled= true;
        else if (!this.bindings.enabled)
            view.disabled= false;
    
        if (!this.bindings.editable)
            view.readOnly= !this.bindings.value.mutable();

        if (view.readOnly)
            Element.addClassName(view, DC.Style.kReadOnlyClass);
        else
            Element.removeClassName(view, DC.Style.kReadOnlyClass);

        if (view.disabled)
            Element.addClassName(view, DC.Style.kDisabledClass);
        else
            Element.removeClassName(view, DC.Style.kDisabledClass);
                
        view.value= newValue;
    },
    
    valueChanged: function(event)
    {
        var view= this.viewElement();
        var value= view.value;
        
        if (this.bindings.value) {
            this.bindings.value.setValue(value);
        }
    },
    
    minValue: function()
    {
        return parseInt(this.viewElement().getAttribute('min'));
    },

    setMinValue: function(minValue)
    {
        var view= this.viewElement();
        
        view.setAttribute('min',minValue);
        
        if (this.bindings.value) {
            var boundValue = this.bindings.value.value();
            
            if (boundValue > minValue)
                view.value = boundValue;
        }

    },
    
    maxValue: function()
    {
        return parseInt(this.viewElement().getAttribute('max'));
    },

    setMaxValue: function(maxValue)
    {
        var view= this.viewElement();
        
        view.setAttribute('max',maxValue);
        
        if (this.bindings.value) {
            var boundValue = this.bindings.value.value();
            
            if (boundValue < maxValue)
                view.value = boundValue;
        }
    }
    
});
