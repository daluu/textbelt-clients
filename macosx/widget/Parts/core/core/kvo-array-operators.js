/*jsl:import kvo-array.js*/



/** Implementations of the Array Operators for Key Value Coding.
 *  
 *  @namespace
 **/
DC.ArrayOperator= {

    avg: function(values)
    {
        return this.sum(values) / values.length;
    },
    
    count: function(values)
    {
        throw new InvalidArgumentError( "@count operator must end the keyPath" );
    },
    
    distinctUnionOfArrays: function(values)
    {
        //  Return the distinct elements from the big flat array.
        return this.unionOfArrays(values).distinct();
    },
    
    distinctUnionOfObjects: function(values)
    {
        return values.distinct();
    },
    
    max: function(values)
    {
        var max= null;
        var i;
        var len;
        var v;
    
        for (i=0, len=values.length; i<len; ++i)
        {
            v= values[i];
            if (null===max || v>max)
                max= v;
        }
        return max;
    },
    
    min: function(values)
    {
        var min= null;
        var i;
        var len;
        var v;
    
        for (i=0, len=values.length; i<len; ++i)
        {
            v= values[i];
            if (null===min || v<min)
                min= v;
        }
        return min;
    },
    
    sum: function(values)
    {
        var sum= 0;
        var len= values.length;
        var i;
        for (i=0; i<len; ++i)
            sum+= values[i];
        return sum;
    },
    
    unionOfArrays: function(values)
    {
        //  TODO: Can't I just use: Array.prototype.concat.apply([], values)?
        var flattened= [];
        var len;
        var i;
        //  Flatten all arrays into a single BIG array
        for (i=0, len=values.length; i<len; ++i)
            flattened= flattened.concat( values[i] );
        return flattened;
    },
    
    unionOfObjects: function(values)
    {
        //  This seems to be a noop...
        return values;
    }
    
};
