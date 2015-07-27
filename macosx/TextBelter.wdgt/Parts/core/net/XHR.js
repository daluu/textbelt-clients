/*jsl:declare XHR*/
/*jsl:declare XMLHttpRequest*/
/*jsl:declare ActiveXObject*/

window.XHR= (function(){

    var getTransport= function()
                      {
                          throw new Error('XMLHttpRequest not available.');
                      };
    
    //  Everything but IE gets the native XMLHttpRequest
    if (!DC.Browser.IE)
        getTransport= function ()
        {
            return new XMLHttpRequest();
        };
    else
    {
        //  Hereafter, everything is IE related
        var progIdCandidates= ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'];
        var len= progIdCandidates.length;

        var progId;
        var xhr;
        
        for (var i=0; i<len; ++i)
        {
            try
            {
                progId= progIdCandidates[i];
                xhr= new ActiveXObject(progId);
                //  ActiveXObject constructor throws an exception
                //  if the component isn't available.
                getTransport= function()
                {
                    return new ActiveXObject(progId);
                };
                break;
            }
            catch (e)
            {
                //  Ignore the error
            }
        }
    }
    
    function send(url, method, options)
    {
        var timeout;
        
        function noop()
        {}
        
        function cancel()
        {
            xhr.onreadystatechange= noop;
            xhr.abort();
        }
        
        function readyStateChanged(xhrEvent)
        {
            if (4!==xhr.readyState)
                return;
            
            if (timeout)
                clearTimeout(timeout);
            
            if (xhrSent===false) {
                arguments.callee.delay(0);
                return;
            }
            
            var status= xhr.status;
            var succeeded= (status>=200 && status<300) || 304==status;

            if (0===status || 'undefined'===typeof(status))
            {
                var protocol= window.location.protocol;
                succeeded= 'file:'===protocol || 'chrome:'===protocol;
            }
            
            var result= xhr.responseText;
            var err;
            
            if (succeeded)
            {
                if ('HEAD'==method) {
                    result= {};
                    try {
                        var headers= xhr.getAllResponseHeaders();
                        if (headers) {
                            headers= headers.split("\n");
                            headers.forEach(function(header) {
                                var match= header.match(/^([^:]+):(.+)$/m);
                                var name= match[1].trim();
                                result[name]= match[2].trim();
                            });
                        }
                    } catch(e) {}
                } else {
                    var contentType= options.responseContentType||
                                     xhr.getResponseHeader("Content-Type");
                    
                    // Response is JSON
                    if (contentType.match(/(?:application\/(?:x-)?json)|(?:text\/json)/)) {
                        try
                        {
                            result= eval('('+result+')');
                        }
                        catch (e)
                        {
                            err= e;
                            succeeded= false;
                        }
                    }
                    // Response is XML
                    if (contentType.match(/(?:application|text)\/xml/)) {
                        result = xhr.responseXML;
                    }
                }
            }
            else
            {
                err= new Error('XHR request failed');
                err.url= url;
                err.method= method;
                err.xhr= xhr;
                err.status= xhr.status;
                err.statusText= "Failed to load resource.";
            }
            
            if (succeeded)
                deferred.callback(result);
            else
                deferred.failure(err);
            
            xhr.onreadystatechange= noop;
            xhr= null;
        }
        
        var xhr= getTransport();
        var queryString= Object.toQueryString(options.parameters||{});
        var body= options.body||"";
        var async= !options.sync;
        var deferred= new DC.Deferred(cancel);
        var xhrSent = false;
        
        //  default values
        method= (method||'GET').toUpperCase();
        
        try{ 
            if ('GET'==method)
            {
                //  no parameters in URL
                if (queryString && -1===url.indexOf('?'))
                    url= url + '?' + queryString;
                else if (queryString && -1!==url.indexOf('?'))
                    url= url + '&' + queryString;
                else if ('&'===url.slice(-1))
                    url= url + queryString;
                else
                    url= url + queryString;
            }
            
            if (options.responseContentType && xhr.overrideMimeType) {
                xhr.overrideMimeType(options.responseContentType);
            }
                        
            if (options.user)
                xhr.open(method, url, async, options.user, options.password||"");
            else               
                xhr.open(method, url, async);

            //  Set headers for the request
            var headers= options.headers||{};
            for (var h in headers)
                xhr.setRequestHeader(h, headers[h]);

            if ('POST'==method)
            {
                xhr.setRequestHeader("Content-Type", options.contentType||"application/x-www-form-urlencoded");
                body= queryString;
            }
                    
            if (async) {
                xhr.onreadystatechange= readyStateChanged;
                timeout = setTimeout(function(){
                    xhr.abort();
                },30000);
            }
            
            xhr.send(body);
            xhrSent = true;

            if (!async)
                readyStateChanged();
        } catch( e ) {
            var err= new Error('XHR request failed');
            err.url= url;
            err.method= method;
            err.xhr= xhr;
            err.status= -1;
            err.statusText= "Failed to load resource.";
                
            deferred.failure(err)
        }
        
        return deferred;
    }

    return {

        get: function(url, parameters, options)
        {
            return XHR.request('GET', url, parameters, options);
        },
    
        post: function(url, parameters, options)
        {
            return XHR.request('POST', url, parameters, options);
        },
        
        request: function(method, url, parameters, options)
        {
            method= method.toUpperCase();
            options= options||{};
            options.parameters= parameters;
            return send(url, method, options);
        }
        
    };

})();
