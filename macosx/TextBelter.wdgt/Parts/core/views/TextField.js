/*jsl:import FormControl.js*/

/** A View that represents basic input controls -- text, password, and search
 *  fields, and textareas. A TextField can be enabled or disabled based on a
 *  binding (or automatically if the value is undefined). Additionally, a
 *  TextField is set to readonly if the value binding is not mutable.
 *  
 *  @declare DC.TextField
 *  @extends DC.FormControl
 **/
DC.TextField= Class.create(DC.FormControl, {

    init: function()
    {
        //  chain to parent init.
        this.base();

        var view= this.viewElement();
        
        Event.observe(view, "change",
                   this.valueChanged.bindAsEventListener(this));
        Event.observe(view, "drop",
                   this.fieldReceivedDropEvent.bindAsEventListener(this));

        this.editing= false;
        this.validationError= null;
    },
    
    defaultPlaceholders: {
        value: {
            nullValue: _("marker.input.placeholder"),
            multipleValues: _("marker.input.multipleValues"),
            noSelection: _("marker.input.noSelection")
        }
    },
    
    /** Number of milliseconds before sending value change notification for a
     *  series of key presses.
     **/
    keypressUpdateTimeout: 500,
    
    /** Does the input field update its value continuously or wait until typing
     *  has stopped?
     */
    continuallyUpdatesValue: true,
    
    /** Should the text field send its associated action only when the visitor
        hits enter (false) or any time editing ends (true) (e.g. onblur).
     **/
    sendsActionOnEndEditing: true,
    
    //  Don't send the action for any of the usual events (click)
    sendActionOn: ['blur', 'keydown'],
    
    /** Method called when the input field has received the focus. Derived Views
     *  can override this method to perform specific operations when editing begins.
     **/
    beginEditing: function()
    {
        this.editing= true;
    },
    
    /** Method called when the input field has lost the focus or editing has ended
     *  for any other reason. Derived Views may override this method to perform
     *  special cleanup operations.
     **/
    endEditing: function()
    {
        this.editing= false;
        if (this.sendsActionOnEndEditing && this.action)
            this.sendAction();
    },

    /** Check the value of the TextField's view to see if it is valid.
     *  Returns either the validated (transformed) value, or a DC.Error.
     **/
    validate: function()
    {
        var view= this.viewElement();
        var value= view.value;

        if (this.formatter)
        {
            var err= this.formatter.isStringValid(value);
            if (err !== true)
            {
                this.presentError(err);
                return err;
            }
            value= this.formatter.valueForString(value);
        }
        
        if (this.bindings.value)
        {
            value= this.bindings.value.validateProposedValue(value);
            if (value instanceof DC.Error)
            {
                this.presentError(value);
                return value;
            }
        }
        
        return value;
    },
    
    presentError: function(error)
    {
        this.validationError= error;
        Element.addClassName(this.viewElement(), DC.Style.kInvalidValueClass);
        return this.base.apply(this, arguments);
    },
    
    clearAllErrors: function()
    {
        this.validationError= null;
        Element.removeClassName(this.viewElement(), DC.Style.kInvalidValueClass);
        return this.base.apply(this, arguments);
    },

    /** Input fields want to be first responders...
     */
    acceptsFirstResponder: function()
    {
        var view= this.viewElement();

        if (view.disabled || view.readOnly)
            return false;
        return true;
    },
    
    /** Focus handler for text input fields. If the present value of the field
     *  matches any of the placeholder values, the field is cleared before
     *  editing begins. This method will call {@link #beginEditing} to allow
     *  derived views to perform something clever when editing begins.
     **/
    becomeFirstResponder: function()
    {
        var view= this.viewElement();

        if (view.disabled || view.readOnly)
            return false;
    
        //  clear out any marker text
        this.hidePlaceholder();

        this.hasFocus= true;
        this.beginEditing();
        return true;
    },
    
    /** Blur handler for text input fields. If the value of the view is empty,
     *  the `placeholder` text will be set in the field. This handler also
     *  triggers a call to {@link #endEditing}.
     **/
    resignFirstResponder: function(event)
    {
        var view= this.viewElement();
        this.hasFocus= false;
        if (""===view.value)
            this.showPlaceholder();
        this.endEditing();
        return true;
    },
    
    /** Display a marker value. The actual value of the marker is pulled from
     *  either an attribute on the node or a property on the view. In addition
     *  to updating the value of the view, `setMarkerValue` stores the text of
     *  the marker in the `markerValue` property and adds the marker class to
     *  the view's node.
     *  
     *  @param marker   which marker value to display
     **/
    showPlaceholder: function()
    {
        var view= this.viewElement();
        
        if (this.bindings.value)
            view.value= this.bindings.value.placeholderValue();
        else if (this.placeholder)
            view.value= this.placeholder;
        else
            return;
            
        this.__showingPlaceholder= true;
        Element.addClassName(view, DC.Style.kMarkerClass);
    },

    /** Remove a marker value. In addition to clearing the value of the field,
     *  this method resets the `markerValue` property to `false` and removes the
     *  marker class from the view's node.
     **/
    hidePlaceholder: function()
    {
        if (!this.__showingPlaceholder)
            return;
            
        var view= this.viewElement();
        view.value= "";
        this.__showingPlaceholder= false;
        Element.removeClassName(view, DC.Style.kMarkerClass);
    },

    /** Value change handler for edit fields. It this handler was triggered via
     *  a timer event (or if a timer event is pending), the timer is cleared.
     *  If the new value isn't one of the marker values, then pass it along to
     *  the value binding.
     **/
    valueChanged: function(event)
    {
        if (this.updateTimer)
        {
            window.clearTimeout(this.updateTmer);
            this.updateTimer= null;
        }
        
        if (this.markerValue)
            return;

        var value = this.validate();
        
        if (!(value instanceof DC.Error) && this.bindings.value) {
            this.bindings.value.setValue(value);
            if (this.validationError)
                this.clearAllErrors();
        }
    },
    
    /** Clear the field when text is dropped on it.
     **/
    fieldReceivedDropEvent: function(event)
    {
        var view= this.viewElement();
        view.value= "";
    },
    
    /** Handler for keyup events. Because I don't want to flood the browser with
        update events, when continuallyUpdatesValue is true, this will wait for
        the visitor to stop typing for `keypressUpdateTimeout` milliseconds
        before triggering the valueChanged event.
     **/
    onkeyup: function(event)
    {
        if (!this.continuallyUpdatesValue)
            return;
            
        var view= this.viewElement();

        if (this.updateTimer)
            window.clearTimeout(this.updateTimer);
        
        if (view.readOnly || view.disabled)
            return;
            
        this.updateTimer= this.valueChanged.bindAndDelay(this, this.keypressUpdateTimeout);
    },
    
    /** Handler for keydown events. This will invoke the action on Return, if present.
     **/
    onkeydown: function(event)
    {
        if (this.action && event.keyCode===Event.KEY_RETURN)
        {
            // Ensure we have the most up-to-date value from the field.
            this.valueChanged(null);
            
            if (this.validationError)
                return;
            this.sendAction();
            Event.stop(event);
        }
    },
    
    /** Handler for keypress events.
     **/
    onkeypress: function(event)
    {
        if (!this.formatter)
            return;
        
        // In Mozilla, arrow keys and backspace trigger a keypress event with charCode = 0
        if (!event.charCode || event.altKey || event.metaKey || event.ctrlKey)
            return;

        var c= String.fromCharCode(event.charCode || event.keyCode);
        if (!this.formatter.isValidInputCharacter(c))
            Event.stop(event);
    },
    
    /** Callback for tracking changes to the value binding. This method will
     *  disable the control if the value is undefined (meaning one of the
     *  objects along the key path doesn't exist). Additionally, the control
     *  will be set to readonly if the value binding isn't mutable or if the new
     *  value is one of the marker values (MultipleValuesMarker or
     *  NoSelectionMarker).
     *
     *  @param change   a ChangeNotification with the new value for the field
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
        
        if (!this.bindings.errorMessage)
            this.clearAllErrors();

        //  don't change the value if the field has the focus
        if (this.hasFocus)
            return;
        
        if (markerType)
        {
            this.placeholder= newValue;
            view.value= "";
            this.showPlaceholder();
        }
        else
        {
            this.hidePlaceholder();
            view.value= newValue;
        }
    },
    
    observeErrorMessageChange: function(change)
    {
        var newValue= change.newValue;
        if (!newValue)
        {
            this.clearAllErrors();
            return;
        }
    
        var error= new DC.Error({
                            description: change.newValue
                        });
        this.presentError(error);
    }
    
});
