/*jsl:import kvo.js*/


/** SortDescriptors are a helper class that is used to sort groups of 
 *  KVO-compliant objects.
 *  
 *  @declare DC.SortDescriptor
 **/
DC.SortDescriptor= Class.create({

    /** Initialise a new SortDescriptor.
     *  
     *  @param keyPath      the path to the key to compare on each object
     *  @param ascending    whether this descriptor sorts values in ascending (true)
     *                      or descending (false) order.
     *  @param comparisonFn (optional) either the name of the comparison method,
     *                      which must be defined on the values to compare, or a
     *                      reference to a comparison function. This function must
     *                      take one parameter, the object to compare against, and
     *                      must return -1,0,1 based on whether the this value is
     *                      less than, equal to, or greater than the comparison
     *                      value.
     *  @throws InvalidArgumentError if comparisonFn is neither a string nor a
     *          function.
     */
    constructor: function(keyPath, ascending, comparisonFn)
    {
        this.keyPath= keyPath;
        this.ascending= ascending;
        this.comparisonFn= comparisonFn || this.defaultCompare;

        var comparisonType= typeof(this.comparisonFn);
        if ("string"!=comparisonType && "function"!=comparisonType)
            throw new InvalidArgumentError( "comparisonFn must be either the name of a method or a function reference" );
    },
    
    /** Find the comparison function on o.
     *  
     *  @param o    the object on which comparisonFn should be found
     *  @returns a method reference to a method on o
     *  @throws TypeError if the comparisonFn member doesn't resolve to a function.
     **/
    resolveComparisonFn: function(o)
    {
        var fn= this.comparisonFn;
        if ("string"===typeof(fn))
            fn= o[fn];
        if ("function"!==typeof(fn))
            throw new TypeError( "comparisonFn does not resolve to a function" );
        
        return fn;
    },
    
    /** Compare two objects using the comparison function to determine their
     *  sort order.
     *  
     *  @param object1  first object
     *  @param object2  second object
     *  @returns -1 if object1 preceeds object2, 0 if object1 and object2 are equal,
     *           1 if object1 follows object2.
     **/
    compareObjects: function(object1, object2)
    {
        if (!object1.valueForKeyPath || !object2.valueForKeyPath)
            throw new InvalidArgumentError( "Objects are not Key Value compliant" );
        var v1= object1.valueForKeyPath(this.keyPath);
        var v2= object2.valueForKeyPath(this.keyPath);

        var fn= this.resolveComparisonFn(v1);
    
        return fn.call(v1, v2);
    },
    
    /** Default comparison function which will work for Strings, Numbers, Dates,
     *  and Booleans. This method is meant to be called as a method of one of the
     *  objects to compare (via the call method).
     *  @returns -1,0,1 depending on sort order.
     **/
    defaultCompare: function(o)
    {
        return DC.compareValues(this, o);
    },
    
    /** Return a SortDescriptor that sorts in the reverse order to this descriptor.
     *  @returns a new SortDescriptor.
     **/
    reversedSortDescriptor: function()
    {
        return new DC.SortDescriptor(this.keyPath, !this.ascending,
                                           this.comparisonFn);
    }

});
