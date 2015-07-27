/*jsl:import set.js*/

/** Make a shallow-copy clone of an object. Modifications are copy-on-write.
    Note, because this is a shallow copy, only properties actually on the cloned
    object will be copy-on-write. For example, if you clone foo into bar and
    then change bar.baz.foo, the change will propagate to the original, foo.
    
    @param obj  the object to clone.
    @returns    a new object with all the same properties as obj.
 **/
Object.clone= function(obj)
{
    var fn = (function(){});
    fn.prototype = obj;
    return new fn();
}

/** Apply default values to an object.
 *  
 *  @param obj  the object to receive default values
 *  @param defaults the object from which to retrieve defaults
 *  @returns obj
 */
Object.applyDefaults = function(obj, defaults)
{
    obj= obj||{};
    
    if (!defaults)
        return obj;

    for (var p in defaults)
    {
        if (p in obj)
            continue;
        obj[p]= defaults[p];
    }
    return obj;
}

Object.extend= function(obj, extensions)
{
    obj= obj||{};
    
    for (var p in extensions)
        obj[p]= extensions[p];

    return obj;
}
    
Object.merge = function(obj1, obj2)
{
    var o= {};
    var prop;

    for (prop in obj1)
        o[prop]= obj1[prop];

    for (prop in obj2)
    {
        if (prop in o)
            continue;
        o[prop]= obj2[prop];
    }
    
    return o;
};

/** Query string handling extensions to Object.
 **/
(function(){

    var typesToExclude= Set('file', 'submit', 'image', 'reset', 'button');
    var genericObject={};
    
	function setValue(object, name, value)
	{
		var previousValue= object[name];
		var previousType= DC.typeOf(previousValue);
		
		if ('string'===previousType)
		    object[name]= [previousValue, value];
		else if ('array'===previousType)
		    previousValue.push(value);
		else
		    object[name]= value;
	}

    function fromFormVisitNode(node)
    {
        var name= node.name;
        var type= (node.type||'').toLowerCase();
        
        if (node.disabled || type in typesToExclude)
            return;
            
        if ('radio'===type || 'checkbox'===type)
        {
            if (node.checked)
                setValue(this, name, node.value);
        }
        else if (node.multiple)
        {
            function visitOption(option)
            {
                if (option.selected)
                    setValue(this, name, option.value);
            }
            this[name]= [];
            Array.forEach(node.options, visitOption, this);
        }
        else
        {
            setValue(this, name, node.value);
            if ('image'===type)
            {
                setValue(this, name+'.x', 0);
                setValue(this, name+'.y', 0);
            }
        }
    }
    
    Object.fromForm=function(node)
    {
        var object= {};
        Array.forEach(node.elements, fromFormVisitNode, object);
        return object;
    };
    
    function fromQueryStringProcessPair(pair)
    {
        pair= pair.split('=');
        if (1===pair.length)
            return;
        
        var key= decodeURIComponent(pair[0].trim());
        var value= decodeURIComponent(pair[1].trim())||null;
        
        setValue(this, key, value);
    }
    
    Object.fromQueryString = function(query)
    {
        if ("?"==query.charAt(0))
            query= query.slice(1);
        
        query= query.split(/\s*&\s*/);

        var object= {};

        query.forEach(fromQueryStringProcessPair, object);
        return object;
    };

    /** Create a query string from an object.
     */
    Object.toQueryString = function(obj)
    {
        if (!obj)
            return "";

        var key;
        var value;
        var typeOfValue;
        var args= [];

        /** Add a value to the args array. Assumes key has already been
            encoded using encodeURIComponent.
         **/
        function addValue(value)
        {
            if (null!==value && 'undefined'!==typeof(value))
                value= encodeURIComponent(value);
            var stringValue = value + '';
            
            if (stringValue.length)
                args.push(key+'='+stringValue);
            else
                args.push(key);
        }
        
        for (key in obj)
        {
            value= obj[key];
            typeOfValue= DC.typeOf(value);
            
            //  skip properties defined on Object
            if ('function'===typeOfValue || value===genericObject[key])
                continue;

            key= encodeURIComponent(key);
            if ('array'===typeOfValue)
                value.forEach(addValue);
            else
                addValue(value);
        }
    
        return args.join("&");
    };
    
})();
