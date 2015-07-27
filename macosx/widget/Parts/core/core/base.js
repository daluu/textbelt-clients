if ("undefined"!==typeof(DC))
    throw new Error("Library module (DC) already defined");

/**
 *  @namespace
 */
var DC= {
    version: "@VERSION@",
    revision: "@REVISION@",
    generateUid: (function(){
            var uid= 0;
            return function()
            {
                return ++uid;
            };
        })()
};




/** Boolean flags to indicate which browser is currently running. Purists will
 *  tell you that browser sniffing is pass√©, but sometimes there's really no
 *  other way...
 *  
 *  @namespace
 */
DC.Browser= {
    /** Is the browser IE? **/
    IE: !!(window.attachEvent && !window.opera) && (function(){
            var ieVersionRegex= /MSIE (\d+)/;
            var match= ieVersionRegex.exec(navigator.userAgent);
            return match && parseInt(match[1], 10);
        })(),
    /** Is the browser some variant of Safari? **/
    Safari: navigator.userAgent.indexOf('AppleWebKit/') > -1,
    /** Is the browser Safari 2, which has some pecular bugs **/
    Safari2: (function(){
            var safariVersionRegex= /AppleWebKit\/(\d+(?:\.\d+)?)/;
            var match= safariVersionRegex.exec(navigator.userAgent);
            return (match && parseInt(match[1], 10)<420);
        })(),
    /** Is the browser some variant of Mozilla? **/
    Mozilla:  navigator.userAgent.indexOf('Gecko') > -1 &&
              navigator.userAgent.indexOf('KHTML') == -1,
    /** Is the browser mobile Safari (iPhone or iPod Touch) **/
    MobileSafari: !!navigator.userAgent.match(/Apple.*Mobile.*Safari/)
};




/** Boolean flags to indicate various language & DOM support options. This is
 *  in lieu of simply sniffing the browser, because sometimes that works better.
 *  
 *  @namespace
 */
DC.Support= {
    /** Does the browser support JavaScript getters & setters? **/
    Properties: ('__defineGetter__' in Object.prototype),
    /** Does the browser support native query selector? **/
    QuerySelector: ('querySelector' in document),
    /** Does the browser support touch events? **/
    Touches: !!document.createTouch,
    /** Does the browser support RGBA colors? **/
    CSS3ColorModel: false,
    /** Initial value for whether the browser supports CSS transitions. If the
        browser supports Properties, this will be updated later when you actually
        ask for the value. Otherwise, the browser definitely doesn't support
        CSS transitions.
     **/
     CSSTransitions: false,
     /** Border image **/
     BorderImage: (function(){
         var style = document.createElement('div').style;
         style.cssText = '-webkit-border-image: inherit; -moz-border-image: inherit;';
         return (style.WebkitBorderImage == 'inherit') || (style.MozBorderImage == 'inherit');
     })()
};




if (DC.Support.Properties) {
    /*  Define a getter function that will determine whether the CSS3 Color Model
        is available. When invoked, this function will replace itself with the correct value.
     */    
    DC.Support.__defineGetter__('CSS3ColorModel', function()
        {
            delete this.CSS3ColorModel;
            var test = document.createElement("span");
            try {
                test.style.backgroundColor = "rgba(100,100,100,0.5)";
                return this.CSS3ColorModel=(test.style.length === 1);
            } catch(e) {}
            return (this.CSS3ColorModel=false);
         });

    /*  Define a getter function that will determine whether CSSTransitions are
        available only when actually asked. When invoked, this function will replace
        itself with the correct value.
     */
    DC.Support.__defineGetter__('CSSTransitions', function()
        {
            delete this.CSSTransitions;
            var test = document.createElement("span");
            try {
                test.style.setProperty("-webkit-transition-duration", "1ms", "");
                return this.CSSTransitions=(test.style.length === 1);
            } catch(e) {}
            return (this.CSSTransitions=false);
        });
}




/** The base typeof operator doesn't handle dates, regular expressions, boolean
    values, arrays, and strings very well. This function takes care of these
    problems.
    
    @param o    the object for which the type is requested
    @returns    a string with the type of the object.
 **/
DC.typeOf=function( o )
{
    if (null===o)
        return "null";

    var t= typeof(o);
    if ("object"!==t && "function"!==t)
        return t;
        
    return Object.prototype.toString.call(o).slice(8,-1).toLowerCase();
    }

/** Compare two values. This handles pretty much every type possible. When the
    types don't match, the values are first converted to strings and then
    compared with a locale sensitive method.
    
    @param v1   first value
    @param v2   second value
    @returns -1 if v1 < v2, 0 if v1==v2, and 1 if v1>v2
 **/
DC.compareValues= function( v1, v2 )
{
    var v1_type= DC.typeOf(v1);
    
    //  If the types aren't the same, compare these objects lexigraphically.
    if (v1_type!==DC.typeOf(v2))
    {
        var s_v1= String(v1);
        var s_v2= String(v2);
        return s_v1.localeCompare(s_v2);
    }
    switch (v1_type)
    {
        case "null":
            return 0;
            
        case "boolean":
        case "number":
            var v= (v1-v2);
            if (0===v)
                return v;
            return (v<0?-1:1);

        case "regexp":
        case "function":
            //  use default (lexigraphical) comparison
            break;

        case "string":
        case "array":
        case "object":
            if (v1.localeCompare)
                return v1.localeCompare(v2);
            if (v1.compare)
                return v1.compare(v2);
            //  Otherwise use default (lexigraphical) comparison
            break;
        
        case 'undefined':
            return true;
            
        default:
            throw new TypeError( "Unknown type for comparison: " + v1_type );
    }
    //  Default comparison is lexigraphical of string values.
    return String(v1).localeCompare(String(v2));
}




/** Function that will create an error constructor. This takes care of
 *  differences between browsers, except of course that MSIE simply doesn't
 *  support custom error types very well. This function allows you to have a
 *  custom initialiser for error types simply by defining a function with the
 *  same name as the error type.
 *  
 *  The return value of this function is the constructor for the new error type.
 *  If there's no custom constructor, this return value should be assigned to a
 *  global variable with the same name as the error type. That way new instances
 *  of the error can be created.
 *
 *  @param errorName    the name of the error subclass -- also the name of the
 *                      initialiser function
 *  @returns a function that is the constructor for the new error type.
 **/
DC.defineError= function( errorName )
{
    function error(message)
    {
        this.message= message;
        this.name= errorName;
    }
    error.prototype= new Error;
    error.prototype.constructor= error;
    error.prototype.name= errorName;
    return error;
}

var InvalidArgumentError= DC.defineError( "InvalidArgumentError" );


/** Add console & console.log for browsers that don't support it. **/
if ("undefined"==typeof(window.console))
    window.console= {};
if ('undefined'==typeof(window.console.log))
    window.console.log= function(){};
if ('undefined'==typeof(window.console.error))
    window.console.error= function(){};
