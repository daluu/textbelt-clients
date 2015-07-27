/*jsl:import View.js*/

DC.Media= Class.create(DC.View, {

    exposedBindings: ['src', 'currentTime', 'volume', 'muted', 'autoplay', 'controls', 'loop', 'playing'],

    init: function()
    {
        this.base();
        
        if (this.initialVolume) {
            this.setVolume(this.initialVolume);
        }
        
        var view= this.viewElement();
        var self = this;
        
        Event.observe(view, 'ended', this.mediaDidEnd.bindAsEventListener(this));

        Event.observe(view, 'play', function(event){
            self.forceChangeNotificationForKey('playing');
        });

        Event.observe(view, 'pause', function(event){
            self.forceChangeNotificationForKey('playing');
        });
    },
    
    isSupported: function()
    {
        var view= this.viewElement();
        if ("paused" in view)
            return true;
        
        return false;
    },
    
    pause: function()
    {
        var view= this.viewElement();
        if (!view.paused)
            view.pause();
    },
    
    play: function()
    {
        var view= this.viewElement();
        view.play();
        this.forceChangeNotificationForKey('ended');
    },
    
    playing: function()
    {
        var view= this.viewElement();
        
        return !view.paused;
    },
    
    stop: function()
    {
        var view = this.viewElement();
        view.currentTime = view.duration;
    },
    
    muted: function()
    {
        var view= this.viewElement();
        return view.muted;
    },
    
    setMuted: function(mute)
    {
        var view= this.viewElement();
        
        if (this.bindings.muted)
            this.bindings.muted.setValue(mute);

        view.muted = mute;
    },
    
    volume: function()
    {
        var view= this.viewElement();
        
        return view.volume;
    },
    
    setVolume: function(newVolume)
    {
        var view= this.viewElement();
        
        if (this.bindings.volume)
            this.bindings.volume.setValue(newVolume);

        view.volume = Math.min(1,newVolume);
    },
    
    mediaDidEnd: function(event)
    {
        this.forceChangeNotificationForKey('ended');
        this.forceChangeNotificationForKey('playing');
    },
    
    ended: function()
    {
        var view= this.viewElement();
        return view.ended;
    },
    
    //'autoplay', 'controls', 'loop'
    autoplay: function()
    {
        var view= this.viewElement();
        return view.autoplay;
    },
    
    setAutoplay: function(newAutoplay)
    {
        if (this.bindings.autoplay)
            this.bindings.autoplay.setValue(newAutoplay);

        var view= this.viewElement();
        view.autoplay= newAutoplay;
    },
    
    controls: function()
    {
        var view= this.viewElement();
        return view.controls;
    },
    
    setControls: function(newControls)
    {
        if (this.bindings.controls)
            this.bindings.controls.setValue(newControls);

        var view= this.viewElement();
        view.controls= newControls;
    },
    
    loop: function()
    {
        var view= this.viewElement();
        return view.loop;
    },
    
    setLoop: function(newLoop)
    {
        if (this.bindings.loop)
            this.bindings.loop.setValue(newLoop);

        var view= this.viewElement();
        view.loop= newLoop;
    },
    
    src: function()
    {
        var view= this.viewElement();
        return view.src;
    },
    
    setSrc: function(newSrc)
    {
        if (this.bindings.src)
            this.bindings.src.setValue(newSrc);

        var view= this.viewElement();
        
        view.src= newSrc;
        view.load();
        this.forceChangeNotificationForKey('ended');
    }
    
});
