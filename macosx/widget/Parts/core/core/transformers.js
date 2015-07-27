/*jsl:import startup.js*/


DC.ValueTransformer = Class.create({

    transformedValue: function(value)
    {
        return value;
    },
    
    reverseTransformedValue: function(value)
    {
        return value;
    },

    __factory__: function()
    {
        var args= Array.from(arguments);
        var klass= this;
        
        function dummyConstructor(){}
        
        return function()
        {
            dummyConstructor.prototype= klass.prototype;
            var obj= new dummyConstructor();
            klass.prototype.constructor.apply(obj, args);
            return obj;
        };
    }
    
});

DC.ValueTransformer.__subclassCreated__= function(subclass)
{
    var rootproto= DC.ValueTransformer.prototype;
    var proto= subclass.prototype;
    
    /*  Mask the reverseTransformedValue if not overridden in a subclass.
        This enables the detection of whether the Transformer _really_ supports
        reverse transformation, while at the same time, clearly documenting the
        API for reverseTransformedValue.
        @JEFF: I think this may be a bit dangerous, because if someone were just
        inspecting the code, he might be confused about why reverseTransformedValue
        wasn't executing...
     */
    if (rootproto.reverseTransformedValue == proto.reverseTransformedValue)
        subclass.prototype.reverseTransformedValue = null;
}

/** @namespace
    This is where all the ValueTransformer classes are registered.
 **/
DC.transformer= {};

/** @namespace
    This is where all the registered instances of ValueTransformers live.
 **/
DC.transformerInstances= {};

/** Lookup a ValueTransformer instance by name.
 *  
 *  @param transformerName  the name of the value transformer
 *  @returns a reference to the specifed value transformer
 *  @throws InvalidArgumentError if the transformerName does not specify
 *          a pre-registered value transformer
 **/
DC.findTransformerWithName= function(transformerName)
{
    var valueTransformer= DC.transformerInstances[transformerName.toLowerCase()];
    if (valueTransformer)
        return valueTransformer;

    //  Try to create an instance of the transformer assuming the transformerName
    //  value is a class name
    if (-1===transformerName.indexOf('.'))
        valueTransformer= DC.transformer[transformerName];
    
    //  If there were dots in the name or the undotted name wasn't found, try to
    //  evaluate the string to see if it resolves to an instance, constructor, or
    //  finally a factory function.    
    if (!valueTransformer)
    {
        try
        {
            valueTransformer= eval(transformerName);
        }
        catch(e)
        {}
    }
    
    if (!valueTransformer)
        throw new InvalidArgumentError("The transformerName argument does not specify a valid ValueTransformer: " +
                                       transformerName);

    //  If the valueTransformer isn't a function, just return it
    if ('function'!==typeof(valueTransformer))
        return valueTransformer;
        
    //  valueTransformer is now either a factory function or a constructor.
    //  Create an instance of the transformer, if you need arguments, you should
    //  probably consider using the factory function version...
    if (valueTransformer.__factoryFn__)
        valueTransformer= valueTransformer();
    else
        valueTransformer= new valueTransformer();

    return valueTransformer;
}

/** Register an instance of a ValueTransformer with a specific name.

    @param valueTransformer the value transformer instance or constructor
                            to register
    @param name             the name by which this value transformer is known
    
    @throws InvalidArgumentError if the valueTransformer parameter
            doesn't specify either a constructor or an instance of a valid
            ValueTransformer subclass.
 **/
DC.registerTransformerWithName= function(valueTransformer, name)
{
    //  make certain it really is a value transformer
    if (!valueTransformer.transformedValue)
        throw new InvalidArgumentError( "The valueTransformer argument does not support the ValueTransformer method transformedValue" );

    name= name.toLowerCase();    
    DC.transformerInstances[name]= valueTransformer;
}




/** Simple ValueTransformer that reverses the truth value of a key
 **/
DC.transformer.Not= Class.create(DC.ValueTransformer, {

    transformedValue: function(value)
    {
        return (value?false:true);
    },
    
    reverseTransformedValue: function(value)
    {
        return !!value;
    }
    
});

DC.registerTransformerWithName(new DC.transformer.Not(), "not");


/** ValueTransformer that returns true only for a particular value.
 **/
DC.transformer.Boolean= Class.create(DC.ValueTransformer, {

    constructor: function(trueValue, falseValue)
    {
        this.trueValue= trueValue;
        this.falseValue= falseValue;
    },
    
    transformedValue: function(value)
    {
        return (value==this.trueValue);
    },
    
    reverseTransformedValue: function(value)
    {
        return (value?this.trueValue:this.falseValue);
    }

});


/** ValueTransformer that returns true only for values matching a regex
 **/
DC.transformer.Matches= Class.create(DC.ValueTransformer, {

    constructor: function(trueRegex)
    {
        this.trueRegex= trueRegex;
    },
    
    transformedValue: function(value)
    {
        return this.trueRegex.test(value);
    }

});


/** A transformer that maps between two lists of values.
 **/
DC.transformer.Generic= Class.create(DC.ValueTransformer, {

    constructor: function(modelValues, displayValues)
    {
        this.modelValues= modelValues;
        this.displayValues= displayValues;
    },
    
    transformedValue: function(value)
    {
        var index= this.modelValues.indexOf(value);
        var novalue;
        
        if (-1==index)
            return novalue;
        else
            return this.displayValues[index];
    },
    
    reverseTransformedValue: function(value)
    {
        var index= this.displayValues.indexOf(value);
        var novalue;
        
        if (-1==index)
            return novalue;
        else
            return this.modelValues[index];
    }
    
});



DC.transformer.Truncated= Class.create(DC.ValueTransformer, {

    constructor: function(max)
    {
        this.max= max || 50;
    },
    
    ellipsis: String.fromCharCode(0x2026),
    
    transformedValue: function(value)
    {
        if (!value && 0!==value)
            return value;

        value= "" + value;
        var len= value.length;
        if (len<=this.max)
            return value;

        //  Perform the ellipsis trick
        var half= this.max/2-2;
    
        //  Have to use Unicode character rather than entity because otherwise this
        //  won't work as a text binding.
        return [value.substr(0, half), this.ellipsis, value.substr(len-half)].join(' ');
    }
    
});

DC.registerTransformerWithName(new DC.transformer.Truncated(50), "truncated");




DC.transformer.StringsToObjects= Class.create(DC.ValueTransformer, {

    constructor: function(key)
    {
        this.key= key||'string';
    },
    
    transformedValue: function(array)
    {
        //  not really an array
        if (!array || !array.map)
            return array;
        
        function makeObj(string)
        {
            var kvo= new DC.KVO();
            kvo[this.key]= string;
            return kvo;
        }
        return array.map(makeObj, this);
    },
    
    reverseTransformedValue: function(array)
    {
        if (!array || !array.map)
            return array;
        
        function makeString(obj)
        {
            return obj[this.key];
        }
        return array.map(makeString, this);
    }
    
});
DC.registerTransformerWithName(new DC.transformer.StringsToObjects('string'), 'StringsToObjects');


DC.transformer.FirstObject= Class.create(DC.ValueTransformer, {
    transformedValue: function(array) {
        if (DC.typeOf(array) == 'array') {
            return array[0];
        }
        
        return array;
    }
});