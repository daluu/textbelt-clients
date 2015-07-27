/** @class
 *  An initialiser for a set-like object. The arguments passed to the
 *  initialiser function determine the values in the set. A Set may only have
 *  string members.
 *  
 *  You may invoke `Set` with either a single argument that is an array or with
 *  any number of arguments. If the only argument is an array, then the array
 *  will be turned into a set and returned. Otherwise, the set will be created
 *  with the individual arguments.
 *  
 *      var s1= Set(['a', 'b', 'c']);
 *      var s2= Set('a', 'b', 'c');
 *  
 *  In the previous example, the two constructors yield the same value.
 **/
function Set()
{
    var s= this;
    if (s.constructor!==Set)
        s= new Set();
        
    var args= arguments;
    if (1==args.length && args[0] instanceof Array)
        args= args[0];
    var i;
    var len= args.length;
    for (i=0; i<len; ++i)
        s[args[i]]= true;
    return s;
}

/** Union two sets. This is not placed as a method on individual sets because
    then it would show up as a member of the set. Note: this function will work
    on regular objects with somewhat unpredictable results.
    
    @param s1   first set
    @param s2   second set
    @returns a new Set object that contains all the elements from s1 & s2
 **/
Set.union= function( s1, s2 )
{
    var s3= Object.clone(s1);
    if (!s2)
        return s3;
    var p;
    for (p in s2)
        s3[p]= true;
    return s3;
}

/** Intersect two sets.
 *  
 *  @param s1   first set
 *  @param s2   second set
 *  @returns the intersection of sets 1 and 2.
 */
Set.intersect= function(s1, s2) {
    var s3= new Set();
    var p;
    for (p in s1) {
        if (p in s2)
            s3[p]= true;
    }
    return s3;
}

/** Add an entry to a set. This is implemented as a non-member method because
    otherwise the method name would appear as a member of the set.

    @param set  the set to modify
    @param key  the key to add to the set.
    @returns the original set.
 **/
Set.add= function( set, key )
{
    set[key]= true;
    return set;
}

/** Remove an entry from a set. Like add, this is implemented as a non-member
    method to prevent it from appearing in the set itself.

    @param set  the set to modify
    @param key  the key to remove from the set.
    @returns the original set.
 **/
Set.remove= function( set, key )
{
    delete set[key];
    return set;
}

/** Convert a set to an array. See add & remove for why this is implemented as
    a non-member method.
    
    @param set  the set to convert to an array
    @returns an array containing the elements in the set
 **/
Set.toArray= function( set )
{
    var e;
    var a= [];
    for (e in set)
        a.push(e);
    return a;
}

/** Iterate over the contents of the set.
 *
 *  @param set      the set to iterate
 *  @param fn       the function to call for each value in the set
 *  @param scope    (optional) an object to pass as the scope for fn
 */
Set.forEach= function(set, fn, scope)
{
    var e;
    var i=0;
    for (e in set)
        fn.call(scope, e, i++);
}

/** Create a string with the keys of a Set.
 *
 *  @param set      the set
 *  @param joinstr  the string to use as the separator for the string
 *  @returns a string with the keys of set separated by joinstr.
 */
Set.join= function(set, joinstr)
{
    var e;
    var a= [];
    for (e in set)
        a.push(e);
    return a.join(joinstr||'');
}

/** Create a helpful alias for making a Set.
 **/
var $S= Set;
