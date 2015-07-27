/*jsl:import ObjectController.js*/


/** An object controller that obtains its content via an Ajax call. 
 *  
 *  @property queryInProgress   While the controller is communicating with the
 *                              server, it sets this property to `true`. Views
 *                              may bind to this property to display progress
 *                              messages or spinners.
 *  
 *  @property url   The server URL to which requests should be made.
 *  
 *  @property method="GET"  The request method to use for requests. This may be
 *                          either GET or POST, because not all browsers support
 *                          the full compliment of method types.
 *  
 *  @property parameters    A hash containing the Ajax parameters which should
 *                          be sent the server. Typically views will bind
 *                          views to keys within the parameter hash to
 *                          manipulate the query.
 *  
 *  @property queryDelay=500ms  Number of milliseconds after one of the query
 *                              related properties changes that the query should
 *                              be started. Repeated changes to the parameters
 *                              will indefinitely postpone the query.
 *  
 *  @property statusCode    The HTTP status code from the last query.
 *  
 *  @property errorMessage  The HTTP error message from the last query or
 *                          `undefined` if the last query did not fail.
 *  
 *  @declare DC.AjaxController
 *  @extends DC.ObjectController
 */
DC.AjaxController= Class.create(DC.ObjectController, {

    flushContentBeforeQuery: false,
    fetchesInitially: true,
    
    /** Create a new `AjaxController` instance.
     *
     *  @param [parameters]    A hash representing connections between this
     *                          controllers exposed bindings and the global
     *                          context as well as any default parameters.
     *                          Bindings are specified with a key ending in Binding.
     */
    constructor: function(parameters)
    {
        this.queryDelay= 0;
        this.url= "";
        this.method= "GET";

        this.base(parameters);
    
        if (this.parameters) {
            DC.KVO.adaptTree(this.parameters);
        } else {
            this.parameters = new DC.KVO();
        }

        this.addObserverForKeyPath(this, this.queryUpdated, "url");
        this.addObserverForKeyPath(this, this.queryUpdated, "method");
    },
    
    __postConstruct: function()
    {
        this.base();
        
        if (this.fetchesInitially && this.url && this.url.length && this.validateParameters()) {
            this.forceChangeNotificationForKey("url");
        }
    },
    
    /** Validate the request parameters. By default this method simply returns
     *  `true` to indicate that the parameters are OK. Subclasses should override
     *  this method to perform validation and return `false` if the parameters
     *  are not acceptable and the query should be aborted.
     *  
     *  Of course, it's also up to subclasses to alert the visitor that the
     *  current state is not valid...
     */
    validateParameters: function()
    {
        return true;
    },
    
    fullURL: function()
    {
        var params = {};
        var keys= this.parameters.mutableKeys();
        var len= keys.length;
        var url = this.url;
        var parameters;
        var p;
        
        for (var i=0; i<len; ++i)
        {
            p= keys[i];
            if (this.parameters.hasOwnProperty(p))
                params[p] = this.parameters[p];
        }
        
        parameters = Object.toQueryString(params);
        
        if (parameters) {
            var qIndex = url.indexOf("?")
            
            if (qIndex != (url.length - 1)) {
                url += "?";
            }
            
            url += parameters;
        }
        
        return url;
    },
    
    observeChildObjectChangeForKeyPath: function(change, keyPath, context)
    {
        this.base(change, keyPath, context);
        if ('parameters'===context)
            this.queryUpdated(change, keyPath, context);
    },
    
    /** Observer method called when the query has changed. Either the `url`,
     *  `method` or `parameters` has changed and we need to send the query
     *  back to the server to refresh the content.
     *  
     */
    queryUpdated: function(change, keyPath, context)
    {
        if (!this.parameters || !this.validateParameters())
            return;
        this.setValueForKey(true, "queryInProgress");
        if (this.__queryTimer)
            window.clearTimeout(this.__queryTimer);
        this.__queryTimer= this.performQuery.bindAndDelay(this, this.queryDelay);
    },

    /** Method to create the Ajax query and send it to the server. This is where
     *  code would need to be modified to support libraries other than Prototype
     *  for the Ajax request.
     */
    performQuery: function()
    {        
        //  build the Ajax request
        var parameters= {};
        var keys= this.parameters.mutableKeys();
        var len= keys.length;
        var p;
        var v;
        var dataType = 'application/json';
        
        for (var i=0; i<len; ++i)
        {
            p= keys[i];
            if (!this.parameters.hasOwnProperty(p))
                continue;
            
            v= this.parameters[p];
            if (null===v || 'undefined'===typeof(v))
                continue;
                
            parameters[p]= v;
        }
        
        if (this.dataModel && ("xml" == this.dataModel.dataType)) {
            dataType = "text/xml";                               
        }
        
        this.__request= XHR.get(this.url, parameters, { responseContentType: dataType });
        this.__request.addMethods(this.querySucceeded.bind(this),
                                  this.queryFailed.bind(this));

        if (this.flushContentBeforeQuery)
            this.setContent(null);
    },

    /** Extract the interesting content from the JSON response. Many APIs wrap
     *  the useful content in extra layers of messaging information. Subclasses
     *  may override this method to extract only the useful information.
     *  
     *  @param obj  The JSON data object returned by the server.
     *  @returns the same value as `obj`.
     */
    extractContent: function(obj)
    {
        return obj;
    },

    /** Callback method invoked when the query has succeeded. This method takes
     *  the `responseText` and evaluates it to create a JSON packet. This JSON
     *  packet is converted into a KVO-compliant object and then the interesting
     *  content is extracted via {@link extractContent}.
     *  
     *  @param xhr  The `Ajax.Request` object
     */
    querySucceeded: function(response)
    {
        var obj = null;
        var type = "json";
        
        if (this.dataModel) {
            if ("xml" == this.dataModel.dataType) {
                type = "xml";
            }
        }
        
        if (type == "json") {
            DC.KVO.adaptTree(response);
            obj = response;
        } else if( type == "xml" && response) {
            if (this.dataModel.model) {
                var model = this.dataModel.model;
                var node = response;
                
                for (var child = node.firstChild; child != null; child = child.nextSibling) {
                    
                    if ((child.nodeType == 1)){
                        node = child;
                        break;
                    }					
                }
                
                if (model && node) {
                    obj = new DC.ModeledXMLProxy(response,node,model);
                }
            }
        }
        
        if (!obj)
        {
            err= new Error('XHR request failed');
            err.url= this.url;
            err.method= this.method;
            err.status= 400;
            err.statusText= 'Invalid feed.';
                
            this.queryFailed(err);
            return;
        }
        
        this.setContent(this.extractContent(obj));
        this.setValueForKey("", "statusCode");
        this.setValueForKey("", "errorMessage");        
        this.setValueForKey(false, "queryInProgress");        
    },

    /** Callback method invoked when the query fails for any reason. This method
     *  updates the `statusCode` and `errorMessage` properties before setting
     *  the controller's content to `null`.
     *  
     *  @param xhr  The `Ajax.Request` object
     */
    queryFailed: function(err)
    {
        this.setValueForKey(-1, "statusCode");
        this.setValueForKey(err.statusText, "errorMessage");
        this.setContent(null);
        this.setValueForKey(false, "queryInProgress");
    }
    
});