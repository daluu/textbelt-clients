/*jsl:import Media.js*/

DC.Video= Class.create(DC.Media, {

    exposedBindings: ['poster', 'height', 'width' ],

    poster: function()
    {
        var view= this.viewElement();
        return view.poster;
    },
    
    setPoster: function(newPoster)
    {
        if (this.bindings.poster)
            this.bindings.poster.setValue(newPoster);

        var view= this.viewElement();

        view.poster = newPoster;
    },
        
    observeHeightChange: function(change)
    {
        var view= this.viewElement();
        var height= parseInt(change.newValue, 10);

        if (isNaN(height))
            view.style.height = null;
        else
            view.style.height = height + "px";
    },
    
    observeWidthChange: function(change)
    {
        var view= this.viewElement();
        var width= parseInt(change.newValue, 10);

        if (isNaN(width))
            view.style.width = null;
        else
            view.style.width = width + "px";
    }
    
});
