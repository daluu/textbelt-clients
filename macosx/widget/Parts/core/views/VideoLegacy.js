DC.VideoLegacy= Class.create(DC.View, {

    exposedBindings: ['src', 'currentTime', 'volume', 'muted', 'autoplay', 'playing', 'controls', 'loop', 'height', 'width'],
    
    constructor: function(view, relativeSource, parameters, videoElement)
    {
        
        if (dashcode.inDesign) {
            return;
        }
        
        function findElement(parent, tag, index) {
            var items = parent.getElementsByTagName(tag);
            
            if (items && items.length) {
                if (index < items.length) {
                    return items[index];
                }
            }
            
            return null;
        }

        this._object = findElement( view, "object", DC.Browser.IE ? 1 : 0 );;
        this._embed = findElement( view, "embed", 0 );
                      
        // Standard setup for video in a video layout
        this.setContainer( view );
        
        // Set up te base class. Since the base attaches "this" to our view and
        // IE doesn't allow attaching objects to "Object", we need to trick it
        this._mediaElement = view;
        this.base(view, relativeSource, parameters);
        this._mediaElement = this._object;
        
        // For non-MobileSafari, we set the src.  This is because the default
        // Setting set up requires a click to play the movie.
        if (videoElement.getAttribute('src') && !DC.Browser.MobileSafari) {        
            this.setSrc(videoElement.getAttribute('src'));
        }
        
        this.setLoop( !(videoElement.getAttribute('loop') === null) ? true : false);
        this.setAutoplay( !(videoElement.getAttribute('autoplay') === null)  ? true : false);
        this.setControls( !(videoElement.getAttribute('controls') === null) ? true : false);
        
        this._signupForEvents();
    },
        
    // Standard Initializations
    init: function()
    {
        this.base();
        
        if (this.initialVolume) {
            this.setVolume(this.initialVolume);
        }
    },
    
    teardown: function()
    {
        this._mediaElement = null;
        this.base();
    },
    
    viewElement: function(){
        return this._mediaElement;
    },
    
    superview: function()
    {
        var sv = null;
        var originalViewElement = this.viewElement;
        
        this.viewElement = function(){
            return this.container();
        }
        
        sv = this.base();
        
        this.viewElement = originalViewElement;
        
        return sv;
    },
    
    _signupForEvents: function()
    {
        var self = this;
        var view = this.viewElement();
        
        this._eventsSetup = true;

        Event.observe(view, 'qt_canplay', function(event){
            self._canPlay = true;
            if (self._pendingPlay) {
                setTimeout(function(){
                    if (self._pendingPlay) {
                        self.play();
                    }
                },1000);
            }
        });
        
        Event.observe(view, 'qt_volumechange', function(event){
            self.forceChangeNotificationForKey('volume');
        });
        
        Event.observe(view, 'qt_ended', function(event){
            self.forceChangeNotificationForKey('ended');
        });
        
        Event.observe(view, 'qt_play', function(event){
            self._playing = true;
            self.forceChangeNotificationForKey('playing');
        });
        Event.observe(view, 'qt_pause', function(event){
            self._playing = false;
            self.forceChangeNotificationForKey('playing');
        });
    },
    
    _setParameter: function(name,value)
    {
        if (this._object) {
            var params = this._object.getElementsByTagName('param');
            var param = null;
            
            for( var i = 0; i < params.length; i++) {
                var p  = params.item(i);
                
                if (p.name == name) {
                    param = p;
                    break;
                }
            }
                    
            try {
                param.value = value;
            } catch ( e ) {
                console.log("Failed to set param " + name + " to " + value);
            }
        }
        
        if (this._embed) {
            if (value === true) {
                value = "true";
            } else if (value === false) {
                value = "false";
            }

            this._embed.setAttribute(name,value);
        }
    },
    
    _getParameter: function(name)
    {
        if (this._object) {
            var params = this._object.getElementsByTagName('param');
            var param = null;
            var value = null;
            
            for( var i = 0; i < params.length; i++) {
                var p  = params.item(i);
                
                if (p.name == name) {
                    param = p;
                    break;
                }
            }
            
            if (param) {
                value = param.value;                
            }
        }
        
        if (!value && this._embed) {
            value = this._embed.getAttribute(name);
        }
        
        if (value && !value.length) {
            value = null;
        } else if (value == "true") {
            value = true;
        } else if (value == "false") {
            value = false;
        }
        
        return value;
    },
    
    _plugin: function()
    {
        if (this._object && ("GetURL" in this._object) ) {
            return this._object;
        }
        
        if (this._embed && ("GetURL" in this._embed)) {
            return this._embed;
        }
        
        return null;
    },
    
    _safePluginCall: function(func)
    {
        var returnValue = null;
        var success = false;
        var plugin = this._plugin();
        
        try {
            if (plugin && (func in plugin)) {
                if (arguments.length == 1) {
                    returnValue = plugin[func]();
                } else if (arguments.length == 2) {
                    returnValue = plugin[func](arguments[1]);
                }
                success = true;
            }
        } catch ( e ) {
            returnValue = null;
            success = false;
        }
        
        return { "success": success, "returnValue": returnValue };
    },
    
    _pluginGetter: function(getter,attribute)
    {
        var pc = this._safePluginCall(getter);
            
        if (pc.success) {
            return pc['returnValue'];
        }
        
        if (attribute) {
            return this._getParameter(attribute);
        }
        
        return null;
    },
    
    _pluginSetter: function(setter,attribute,value,bindingProperty)
    {
        var plugin = this._plugin();
        var success = false;
        
        if  (!bindingProperty) {
            bindingProperty = attribute;
        }
        
        if (this.exposedBindings[bindingProperty] && this.bindings[bindingProperty]) {
            this.bindings[bindingProperty].setValue(value);
        }
        
        success = this._safePluginCall(setter,value).success;
        
        if (attribute) {
            this._setParameter(attribute,value);        
        }
        
        return success;
    },
    
    play: function()
    {
        if (this._canPlay || DC.Browser.MobileSafari) {
            this._pendingPlay = false;
            this._safePluginCall("Play");
        } else {
            this._pendingPlay = true;
        }
    },
    
    playing: function()
    {
        return this._playing;
    },

    pause: function()
    {
        this._pluginGetter('Stop',null);
    },
        
    stop: function()
    {
        this._safePluginCall("Stop");
        this._safePluginCall("Rewind");
    },
    
    muted: function()
    {
        return this._pluginGetter('GetMute',null);
    },
    
    setMuted: function(mute)
    {
        this._pluginSetter('SetMute',null, mute?true:false, 'muted');
    },
    
    volume: function()
    {
        var value = 1;
        var pc = this._safePluginCall("GetVolume");
        
        if (pc.success) {
            // Return the volume from 0-1.0 scale (from 255 returned by Quicktime)
            value =  pc['returnValue']/255.0;
        }
        
        return value;
    },
    
    setVolume: function(newVolume)
    {
        if (newVolume === null) {
            newVolume = 1;
        }
        
        this._safePluginCall("SetVolume",newVolume*255);
    },
    
    mediaDidEnd: function(event)
    {
        this._playing = false;
        this.forceChangeNotificationForKey('playing');
        this.forceChangeNotificationForKey('ended');
    },
    
    ended: function()
    {
        var endTime = this._safePluginCall("GetEndTime").returnValue;
        var time = this._safePluginCall("GetTime").returnValue;
        
        return (endTime == time);
    },
    
    //'autoplay', 'controls', 'loop'
    autoplay: function()
    {
        return this._pluginGetter("GetAutoPlay","autoplay");
    },
    
    setAutoplay: function(newAutoplay)
    {
        var time = this._safePluginCall("GetTime");
        
        this._pluginSetter('SetAutoPlay','autoplay',newAutoplay?true:false);
                
        // If the new value is to auto play, and we are at the 
        // beginning of the media and not playing, start playing
        if (newAutoplay && !this.playing() && (!time.success || !time.returnValue)) {
            this.play();
        }
        
    },
    
    controls: function()
    {
        return this._pluginGetter('GetControllerVisible','controller');
    },
    
    setControls: function(newControls)
    {
        this._pluginSetter('SetControllerVisible','controller',newControls?true:false, 'controls');
    },
    
    loop: function()
    {
        return this._pluginGetter('GetIsLooping','loop');
    },
    
    setLoop: function(newLoop)
    {
        this._pluginSetter('SetIsLooping','loop',newLoop?true:false);
    },

    src: function()
    {
        return this._pluginGetter('GetURL', 'src');
    },
    
    setSrc: function(newSrc)
    {
        this._pluginSetter("SetResetPropertiesOnReload",null, false, null);
        this._pluginSetter("SetURL","src",newSrc?newSrc:"","src");
    },
    
    poster: function()
    {
        return null; // Not Supported
    },
    
    setPoster: function(newPoster)
    {
        // Not supported
    }

});