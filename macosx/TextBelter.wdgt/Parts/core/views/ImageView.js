/*jsl:import View.js*/


/** A View for images. In addition to the bindings exposed by Views,
 *  DC.ImageViews have a src binding that represents the URL of the
 *  image to display. ImageViews also have a width and height binding to
 *  reflect those properties as well.
 *  
 *  Like TextFields, DC.ImageViews have placeholder values for invalid
 *  values. These placeholders should be URLs to the appropriate image to
 *  display under those circumstances. The default values are empty, so no image
 *  will be displayed.
 *  
 *  @declare DC.ImageView
 *  @extends DC.View
 **/
DC.ImageView= Class.create(DC.View, {
    
    exposedBindings: ['src', 'alt', 'width', 'height'],
    maskedBindings: ['text','html'],
    
    init: function()
    {
        this.base();
        
        var view= this.viewElement();
        
        // Set the original src, if any to be the default 
        // placeholder for null and no selection values 
        if (!this.defaultPlaceholders.src && view.src) { 
            var srcPH = {}; 
       
            srcPH.nullValue = srcPH.noSelection = view.src; 
            this.defaultPlaceholders.src = srcPH;             
        }
        
        Event.observe(view, 'error', this.onerror.bind(this));
        Event.observe(view, 'load', this.onload.bind(this));
    },

    onload: function()
    {
        var view= this.viewElement();
        this.setValueForKey(false, 'loading');
        Element.removeClassName(view, DC.Style.kLoadingClass);
    },
    
    onerror: function()
    {
        var view= this.viewElement();
        this.setValueForKey(false, 'loading');
        
        Element.updateClass(view, DC.Style.kInvalidValueClass,
                            DC.Style.kLoadingClass);
    },
    
    src: function()
    {
        var src= this.viewElement().src;
        return ('about:blank'===src)?null:src;
    },
    
    setSrc: function(newSrc)
    {
        if (this.bindings.src)
            this.bindings.src.setValue(newSrc);
            
        this.setValueForKey(true, 'loading');
        
        var view= this.viewElement();
        Element.updateClass(view, DC.Style.kLoadingClass,
                            DC.Style.kInvalidValueClass);

        if (!newSrc)
            newSrc= 'about:blank';

        var originalSrc= view.src;
        view.src= newSrc;
        
        //  Safari 3 & 4 don't fire the onload event if the new src is the same
        //  as the previous src. See <rdar://problem/6660795>.
        if (DC.Browser.Safari && view.src===originalSrc)
            this.onload();
    },
    
    observeSrcChange: function(change)
    {
        var view= this.viewElement();
        var markerType= this.bindings.src && this.bindings.src.markerType;

        if (markerType)
            Element.addClassName(view, DC.Style.kMarkerClass);
        else
            Element.removeClassName(view, DC.Style.kMarkerClass);
        
        this.setSrc(change.newValue);
    },
    
    /** Set the width of the image based on an external value.
     *  
     *  @param change   the change notification containing the new width of the
     *                  image
     */
    observeWidthChange: function(change)
    {
        var view= this.viewElement();
        var width= parseInt(change.newValue, 10);

        if (isNaN(width))
            view.removeAttribute('width');
        else
            view.width= width;
    },
    
    /** Set the alternate text of the image based on an external value. 
     *  
     *  @param change   the change notification containing the new width of the
     *                  image
     */
    observeAltChange: function(change)
    {
        var view= this.viewElement();
        view.alt= change.newValue || '';
    },
    
    /** Set the height of the image based on an external value.
     *  
     *  @param change   the change notification containing the new height of the
     *                  image
     */
    observeHeightChange: function(change)
    {
        var view= this.viewElement();
        var height= parseInt(change.newValue, 10);

        if (isNaN(height))
            view.removeAttribute('height');
        else
            view.height= height;
    }

});
