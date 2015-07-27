/*jsl:import view-core.js*/

/*jsl:declare FIRST_RESPONDER*/
window.FIRST_RESPONDER='__first_responder__';


DC.Responder= Class.create(DC.Bindable, {

    /** Perform a command by bubbling up the responder chain.
        @param command      the name of the command to execute
        
        @returns the responder that ultimately handled the command or null if 
                 the command was never handled.
     */
    sendActionToView: function(action, view)
    {
        if (FIRST_RESPONDER===view)
            view= DC.page.firstResponder;
            
        var target= view||DC.page.firstResponder||this;
        
        while (target)
        {
            if (action in target)
            {
                target[action](this);
                return true;
            }

            target= target.nextResponder();
        }

        return false;
    },
    
    /** Does this object want to be the first responder?
     */
    acceptsFirstResponder: function()
    {
        return false;
    },
    
    /** Called when attempting to make the object a first responder.
     *  @returns true if the object accepts first responder status, false if
     *           the view doesn't want to be first responder.
     */
    becomeFirstResponder: function()
    {
        return true;
    },
    
    /** Called when the view should stop being the first responder.
     *  @return true if the the view accepts the loss and false if it is
     *          unable to give up first responder status.
     */
    resignFirstResponder: function()
    {
        return true;
    },

    nextResponder: function()
    {
        return this.__nextResponder||null;
    },
    
    setNextResponder: function(newNextResponder)
    {
        this.__nextResponder= newNextResponder;
    },

    /** Present a non-modal error notification.
        
        @param error    an instance of DC.Error containing information
                        about the error.
        @returns true if the error was presented to the visitor.
     */
    presentError: function(error)
    {
        //  Allow this responder to customise the error message before it is
        //  presented to the visitor
        this.willPresentError(error);

        //  Note which field originated the error
        if (!('field' in error))
            error.field= this;
            
        //  By default, we'll just pass the error up the responder chain
        var nextResponder= this.nextResponder();
        if (nextResponder)
            return nextResponder.presentError(error);
        return false;
    },
    
    /** Clear any errors for a particular field. Transitory errors, like values
        not matching a regex, can be cleared after further user input. This
        method will clear the errors for a particular field. The original
        callback method will not be invoked.
        
        @param [field]  a reference to the field for which errors will be
                        cleared. 
     */
    clearAllErrors: function(field)
    {
        //  By default, we'll just pass the error up the responder chain
        var nextResponder= this.nextResponder();
        if (nextResponder)
            nextResponder.clearAllErrors(field||this);
    },
    
    /** Customise an error message that has come up from down the responder
        chain. This allows a view with more information to update the error or
        even add a recovery object.
        
        @param error    the error which will be presented
     */
    willPresentError: function(error)
    {
    },

    onmousedown: function(event)
    {
        var target= this.nextResponder();
        if (target)
            target.onmousedown(event);
    },
    
    onmouseup: function(event)
    {
        var target= this.nextResponder();
        if (target)
            target.onmouseup(event);
    },

    onmousedrag: function(event)
    {
        var target= this.nextResponder();
        if (target)
            target.onmousedrag(event);
    },
    
    onmouseenter: function(event)
    {
        var target= this.nextResponder();
        if (target)
            target.onmouseenter(event);
    },

    onmouseleave: function(event)
    {
        var target= this.nextResponder();
        if (target)
            target.onmouseleave(event);
    },
    
    onclick: function(event)
    {
        var target= this.nextResponder();
        if (target)
            target.onclick(event);
    },

    ondblclick: function(event)
    {
        var target= this.nextResponder();
        if (target)
            target.ondblclick(event);
    },

    onkeydown: function(event)
    {
        var target= this.nextResponder();
        if (target)
            target.onkeydown(event);
    },
    
    onkeyup: function(event)
    {
        var target= this.nextResponder();
        if (target)
            target.onkeyup(event);
    },
    
    onkeypress: function(event)
    {
        var target= this.nextResponder();
        if (target)
            target.onkeypress(event);
    },
    
    ontouchstart: function(event)
    {
        var target= this.nextResponder();
        if (target)
            target.ontouchstart(event);
    },

    ontouchmove: function(event)
    {
        var target= this.nextResponder();
        if (target)
            target.ontouchmove(event);
    },

    ontouchend: function(event)
    {
        var target= this.nextResponder();
        if (target)
            target.ontouchend(event);
    },
    
    onswipe: function(event)
    {
        var target= this.nextResponder();
        if (target)
            target.onswipe(event);
    }

});
