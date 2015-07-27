/*jsl:import Video.js*/


/** A View for laying out videos.  This is a subclass of DC.Video 
 *  which proxies an video wrapped in a div to a real video view"
 *  
 *  @declare DC.VideoLayout
 *  @extends DC.Video
 **/

DC.VideoLayout= Class.create(DC.Video,{
    constructor: function(view,relativeSource, parameters) 
    {        
        // Replace the video layout with the actual video
        var mediaElement = view.getElementsByTagName("video")[0];
        
        if (!mediaElement) {
            mediaElement = document.createElement('video');
            view.appendChild(mediaElement);
        }
        
        // Is the video tag natively supported?
        if (mediaElement && ("paused" in mediaElement)) {
            this.setContainer(view);
            this._mediaElement = mediaElement;  
            
            this.base(view,relativeSource, parameters);
        } else {
            return new DC.VideoLegacy(view,relativeSource,parameters, mediaElement);
        }
    },
    
    viewElement: function(){
        return this._mediaElement;
    },
    
    superview: function(){
        var sv = null;
        var originalViewElement = this.viewElement;
        
        this.viewElement = function(){
            return this.container();
        }
        
        sv = this.base();
        
        this.viewElement = originalViewElement;
        
        return sv;
    }
    
});