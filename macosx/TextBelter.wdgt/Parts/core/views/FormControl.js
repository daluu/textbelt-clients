/*jsl:import View.js*/

DC.FormControl= Class.create(DC.View, {

    exposedBindings: ['value', 'name'],
    maskedBindings: ['text', 'html'],
    
    /** Callback for tracking changes to the value binding. This updates the
        value that the form control will send to the server.
        
        @param change   a ChangeNotification with the new value for the field
      */
    observeValueChange: function(change)
    {
        var view= this.viewElement();
        var newValue= change.newValue;

        //  determine whether this value is a marker
        var markerType= this.bindings.value && this.bindings.value.markerType;
        
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
    
    observeNameChange: function(change, keyPath, context)
    {
        var view= this.viewElement();
        view.name= change.newValue;
    },
    
    validate: function()
    {
        return this.viewElement().value;
    }
    
});
