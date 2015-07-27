/*jsl:import startup.js*/
/*jsl:import Error.js*/

/** Constructor for the data kept for each observable/observed key.
 *  
 *  @property __uid An unique identifier for this key info, used in creating the
 *                  parent link information.
 *  @property reader    A reference to the getter function (if one exists) used
 *                      to retrieve the current value from an object.
 *  @property mutator   A reference to the setter function (if one exists) which
 *                      will be used to update the key for an object.
 *  @property validator A reference to the validation method (usually in the
 *                      form `validate` + key) which _may_ be invoked to
 *                      determine whether a value is valid. This method is
 *                      **never** called by `setValueForKey` and should only be
 *                      called by user interface code.
 *  @property key   The original key name that this KeyInfo object represents.
 *  @property mutable   Is the field with this key name mutable on objects? A
 *                      field is not mutable if a getter function exists but no
 *                      setter function exists.
 *  @property changeCount   The number of times `willChangeValueForKey` has been
 *                          called. This is decremented each time
 *                          `didChangeValueForKey` is called.
 *  
 *  @declare DC.KeyInfo
 *  @private
 **/
DC.KeyInfo= Class.create({

    /** Create a new KeyInfo object.
     *  
     *  @param {Object} obj the object on which the key is defined
     *  @param {String} key the name of the key to manage
     */
    constructor: function(obj, key)
    {
        var methods= DC.KVO.getPropertyMethodsForKeyOnObject(key, obj);

        this.__uid= [key, DC.generateUid()].join('_');

        //  store accessor & mutator
        this.reader= methods.getter;
        this.mutator= methods.mutator;
        this.validator= methods.validator;
        this.key= key;
        
        //  Obviously, a key is mutable if there's a mutator defined, but
        //  if the key has neither reader or mutator methods, then I
        //  access it via direct property access and the key is mutable
        this.mutable= ((this.mutator||!this.reader)?true:false);

        if (!this.reader && !this.mutator)
            this.mutable= true;

        //  changeCount is the number of times willChangeValueForKey has been
        //  called. This is decremented for each call to didChangeValueForKey.
        //  When this value returns to 0, a change notification is issued. The
        //  previous value is only cached for the first change.
        this.changeCount= 0;
        
        //  Setup initial parent link for value if there is one
        var value= methods.value;
        if (!value)
            return;
            
        var valueType= DC.typeOf(value);
        if (valueType in DC.KVO.typesOfKeyValuesToIgnore ||
            !value._addParentLink)
            return;

        value._addParentLink(obj, this);
    },
    
    /** Retrieve the value of this key for a given object. If the value can have
     *  a parent link, this method will create it.
     *  
     *  @param {DC.KVO} obj   the KVO instance from which to fetch the
     *         value.
     *  @returns the current value of the key for the specified object
     */
    get: function(obj)
    {
        //  This is kind of tortured logic, because undefined is reserved to
        //  mean that there's a missing object in the keyPath chain. So the
        //  result of valueForKey should NEVER be undefined.

        if (this.reader)
            return this.reader.call(obj);
            
        var value;

        if (this.key in obj)
            value= obj[this.key];
        else
            value= null;
        
        if (value && value._addParentLink)
            value._addParentLink(obj, this);
            
        return value;
    },
    
    /** Store a new value for a given object. This method will call a mutator
     *  method if one exists, or otherwise will call `willChangeValueForKey`,
     *  update the field directly, and then call `didChangeValueForKey`.
     *  
     *  @param obj  the object to modify
     *  @param newValue the new value that will replace the old value.
     */
    set: function(obj, newValue)
    {
        if (this.mutator)
            this.mutator.call(obj, newValue);
        else
        {
            //  bracket modification of the value with change notifications.
            //  This should only ever be executed for MSIE or other browsers
            //  that don't support properties.
            obj.willChangeValueForKey(this.key, this);
            obj[this.key]= newValue;
            obj.didChangeValueForKey(this.key, this);
        }
    },
    
    /** Validate the new value for a given object. This method will call a
        validator function if one exists. Otherwise, it will simply return true.
     */
    validate: function(obj, newValue)
    {
        if (!this.validator)
            return newValue;
        return this.validator.call(obj, newValue);
    },
    
    /** Remove the parent link for this KeyInfo object. Child object reference
     *  the parentLink rather than the owner object directly. This gives the
     *  owner a method to disconnect from the child without maintaining a
     *  reference to the child.
     */
    unlinkParentLink: function()
    {
        if (!this.parentLink)
            return;
        this.parentLink.observer= null;
        this.parentLink.callback= null;
        this.parentLink= null;
    }

});




/** Enumerations for the types of changes.
 *  
 *  @property setting       a key's value has changed, the newValue property of
 *                          the change notification will contain the new value.
 *                          If the key represents an array, the newValue is the
 *                          new array.
 *  @property insertion     an element or elements have been inserted into an
 *                          array. The newValue property of the change
 *                          notification will contain the new elements. The
 *                          indexes property of the change notification will
 *                          contain the index at which each element was inserted.
 *                          The oldValue property will be null.
 *  @property deletion      an element or elements have been removed from an
 *                          array. The newValue property of the change
 *                          notification will be null. The oldValue property
 *                          will contain the elements removed from the array.
 *                          And the indexes property will contain the index of
 *                          each element that was removed.
 *  @property replacement   an element or elements have been replace in an array.
 *                          The newValue property of the change notification
 *                          contains the new values for each element.
 *                          The oldValue property contains the previous values
 *                          for each element. And the indexes property will
 *                          contain the index of each element replaced.
 *  
 *  @namespace
 **/
DC.ChangeType=
{
    setting: 0,
    insertion: 1,
    deletion: 2,
    replacement: 3
};



    
/** Change notifications are the root of all updates.
 *  
 *  @property object    The object for which this update is being sent
 *  @property changeType    one of the values from {@link DC.ChangeType}.
 *  @property newValue  The new value for the property
 *  @property oldValue  The previous value for the property
 *  @property indexes   If the change is for an array, this is an array of
 *                      modified indexes.
 *
 *  @declare DC.ChangeNotification
 **/
DC.ChangeNotification= Class.create({

    /** Initialise a new ChangeNotification instance.
     *  
     *  @param object       a reference to the object that has changed
     *  @param changeType   the type of change (@see DC.ChangeType)
     *  @param newValue     the new value of the key
     *  @param oldValue     the old value of the key
     */
    constructor: function(object, changeType, newValue, oldValue, indexes)
    {
        this.object= object;
        this.changeType= changeType;
        this.newValue= newValue;
        this.oldValue= oldValue;
        this.indexes= indexes;
        this.objectKeyPath= [];
    },
    
    toString: function()
    {
        var str= "[ChangeNotification changeType: ";
        switch (this.changeType)
        {
            case DC.ChangeType.setting:
                str+= "setting";
                break;
            
            case DC.ChangeType.insertion:
                str+= "insertion";
                break;
        
            case DC.ChangeType.deletion:
                str+= "deletion";
                break;
            
            case DC.ChangeType.replacement:
                str+= "replacement";
                break;
            
            default:
                str+= "<<unknown>>";
                break;
        }
    
        str+= " newValue=" + this.newValue +
              " oldValue=" + this.oldValue +
              (this.indexes?" indexes=" + this.indexes.join(", "):"") + "]";
    
        return str;
    }
});




/** An ObserverEntry is an internal structure and probably doesn't hold much
 *  general value.
 *  
 *  @declare DC.ObserverEntry
 *  @private
 *  
 *  @property observer  A reference to the object which will be used to call the
 *                      callback method.
 *  @property callback  A reference to a function which will be invoked when
 *                      changes occur.
 *  @property context   General purpose value which will be passed to the
 *                      observer method as the final parameter (context). This
 *                      is often used to construct the full key path from a
 *                      child notification.
 */
DC.ObserverEntry=Class.create({

    /** Construct a new ObserverEntry
     */
    constructor: function(observer, callback, context)
    {
        this.observer= observer;
        this.callback= callback;
        this.context= context;
    },
    
    observeChangeForKeyPath: function(changeNotification, keyPath)
    {
        //  check to see whether this observer has already been notified
        if (!this.callback || !this.observer ||
            -1!==changeNotification.objectKeyPath.indexOf(this.observer))
            return;

        this.callback.call(this.observer, changeNotification, keyPath,
                           this.context);
    }
    
});




/** KVO is the base of all key value observing compliant classes. Classes which
 *  intend to participate in binding and change notifications should (probably)
 *  be subclasses of KVO.
 *  
 *  @property [__mutableKeys]   An array of keys which should be assumed to be
 *            the sum total mutable properties on the object or class,
 *            regardless of what introspection might otherwise reveal.
 *  
 *  @declare DC.KVO
 */
DC.KVO= Class.create({

    /** Initialiser for the KVO class. This doesn't actually do anything
     *  specific. Most initialisation is defered to exactly when it's needed.
     *  This is a practical decision rather than an optimisation decision,
     *  because objects which are not directly derived from DC.KVO may be
     *  adapted for key value compliance. Therefore, the KVO constructor would
     *  not have executed for those objects.
     **/
    constructor: function()
    {
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
    },
    
    /** Set a value for a particular key path on the given object.

        @param value    the value to assign
        @param keyPath  where to store the value
    
        @throws InvalidArgumentError if the keyPath is null
     **/
    setValueForKeyPath: function(value, keyPath)
    {
        if (!keyPath || 0===keyPath.length)
            throw new InvalidArgumentError( "keyPath may not be empty" );

        //  if the keyPath is a string, split it into an array on the period
        //  between each key
        if ("string"==typeof(keyPath))
            keyPath= keyPath.split(".");

        var key= keyPath[0];
        
        //  Handle degenerate case where there is only one key
        if (1==keyPath.length)
        {
            this.setValueForKey(value, key);
            return;
        }
        
        if ('@'==key.charAt(0))
        {
            //  silently fail, because keyPaths with array operators are immutable.
            return;
        }

        //  Find the key value
        var object= this.valueForKey(key);
    
        if (!object)
            return;
                                    
        //  ask it to set the value based on the remaining key path
        object.setValueForKeyPath(value, keyPath.slice(1));
    },

    /** Set a value for a particular key on the given object. A key is a leaf
        attribute.
    
        @param value    the value to assign
        @param key      the name of the attribute to assign
    
        @throws InvalidArgumentError if a null key is used
     **/
    setValueForKey: function(value, key)
    {
        if (!key || 0===key.length)
            throw new InvalidArgumentError( "key may not be empty" );

        //  can't change value of readonly attributes
        var keyInfo= this.infoForKey(key);
        if (!keyInfo || !keyInfo.mutable)
            return;

        keyInfo.set(this, value);
    },

    /** Retrieve the value for a particular key path on the given object.
     *
     *  @param keyPath  where to find the value
     *
     *  @returns the value of the given key or undefined if an object in the
     *           keypath chain was missing.
     *  
     *  @throws InvalidArgumentError if the keyPath is empty
     */
    valueForKeyPath: function(keyPath)
    {
        if (!keyPath || 0===keyPath.length)
            throw new InvalidArgumentError( "keyPath may not be empty" );
        
        //  if the keyPath is a string, split it into an array on the period
        //  between each key
        if ("string"==typeof(keyPath))
            keyPath= keyPath.split(".");

        var key= keyPath[0];
        
        //  Handle degenerate case where there is only one key
        if (1==keyPath.length)
            return this.valueForKey(key);
        
        if ('@'==key.charAt(0))
        {
            var operator= key.substr(1);
            var values= this.valueForKeyPath( keyPath.slice(1) );
            return DC.ArrayOperator[operator]( values );
        }

        //  Find the key value
        var object= this.valueForKey(key);
    
        //  if there is no value for the container, return null for the terminal
        //  value -- this makes bindings work for containers that haven't been
        //  created yet.
        if ('undefined'===typeof(object) || null===object)
            return undefined;
    
        //  ask it to get the value based on the remaining key path
        return object.valueForKeyPath(keyPath.slice(1));
    },

    /** Retrieve the value of a particular key for this object.

        @param key  the name of the attribute to retrieve.
    
        @returns the value of the key
        @throws InvalidArgumentError if the key is null
     **/
    valueForKey: function(key)
    {
        if (!key || 0===key.length)
            throw new InvalidArgumentError( "the key is empty" );
    
        var keyInfo= this.infoForKey(key);
    
        if (!keyInfo)
            return null;

        return keyInfo.get(this);
    },

    /** Determine whether the value may be assigned to the property represented
     *  by keyPath.
     *
     *  @param value    the value to validate
     *  @param keyPath  where to find the value
     *
     *  @returns a valid value or an instance of DC.Error if the value
     *           could not be coerced into a valid value.
     *  
     *  @throws InvalidArgumentError if the keyPath is empty
     */
    validateValueForKeyPath: function(value, keyPath)
    {
        if (!keyPath || 0===keyPath.length)
            throw new InvalidArgumentError( "keyPath may not be empty" );
        
        //  if the keyPath is a string, split it into an array on the period
        //  between each key
        if ("string"==typeof(keyPath))
            keyPath= keyPath.split(".");

        var key= keyPath[0];
        
        //  Handle degenerate case where there is only one key
        if (1==keyPath.length)
            return this.validateValueForKey(value, key);

        //  Find the key value
        var object= this.valueForKey(key);
    
        //  if there is no value for the container, then just return the
        //  value...
        //  TODO: Is this really correct?
        if ('undefined'===typeof(object) || null===object)
            return value;
    
        //  ask it to validate the value based on the remaining key path
        return object.validateValueForKeyPath(value, keyPath.slice(1));
    },


    /** Validate the value to be assigned to a key.
     *  
     *  @param value    the value to check
     *  @param key      the key to check
     *  
     *  @returns A valid value or an instance of DC.Error to signify
     *           that the value could not be coerced into a valid value.
     *  
     *  @throws InvalidArgumentError if the key is null or empty.
     */
    validateValueForKey: function(value, key)
    {
        if (!key || !key.length)
            throw new InvalidArgumentError("missing key");
            
        var keyInfo= this.infoForKey(key);
        return keyInfo.validate(this, value);
    },
    
    /** Change notification handler for property values. This handler receives a
     *  notification for changes to the key values of contained objects.
     *
     *  @private
     *
     *  @param change   a ChangeNotification object
     *  @param keyPath  the key path that has changed
     *  @param context  the context information original specified for this key
     **/
    observeChildObjectChangeForKeyPath: function(change, keyPath, context)
    {
        //  Pass this along up the change
        if (DC.KVO.kAllPropertiesKey!=keyPath)
            keyPath= context + '.' + keyPath;
        else
            keyPath= context;

        var changeClone= Object.clone(change);
        changeClone.object= this;
        this.notifyObserversOfChangeForKeyPath( changeClone, keyPath );
    },

    /** Discover information about the specified key.
     *
     *  @param keyPath  path to the attribute
     *
     *  @returns an instance of KeyInfo for the specified keyPath
     *
     *  @throws InvalidArgumentError if the keyPath is null
     **/
    infoForKeyPath: function(keyPath)
    {
        if (!keyPath || 0===keyPath.length)
            throw new InvalidArgumentError( "keyPath is empty" );

        //  if the keyPath is a string, split it into an array on the period
        //  between each key
        if ("string"==typeof(keyPath))
            keyPath= keyPath.split(".");
        
        var key= keyPath[0];
        
        //  Handle degenerate case where there is only one key
        if (1==keyPath.length)
            return this.infoForKey(key);
        else if ('@'==key.charAt(0))
        {
            //  Array operators make a keyPath immutable.
            var keyInfo= new DC.KeyInfo(null, null);
            keyInfo.mutable= false;
            return keyInfo;
        }
        else
        {
            //  Find the key value
            var object= this.valueForKey(key);

            //  If an object along the way is null, then return that the key in
            //  question can't be read and can't be written.
            if (!object)
                return undefined;

            if (!object.infoForKeyPath)
                return undefined;
            //  ask it to set the value based on the remaining key path
            return object.infoForKeyPath(keyPath.slice(1));
        }
    },

    /** Discover information about the specified key.
     *
     *  @param keyPath  path to the attribute
     *
     *  @returns an instance of KeyInfo for the specified key
     *
     *  @throws InvalidArgumentError if the keyPath is null
     **/
    infoForKey: function(key)
    {
        var keyInfo;

        if (!this.__keys)
            this.__keys= {};
            
        if (DC.KVO.kAllPropertiesKey==key)
            return null;
            
        keyInfo= this.__keys[key];
    
        if (keyInfo)
            return keyInfo;
        
        keyInfo= new DC.KeyInfo(this, key);
    
        this.__keys[key]= keyInfo;
        return keyInfo;
    },
    
    /** Register dependent key for a set of keys. When any one of the set of
     *  keys changes, observers of the dependent key will be notified of a
     *  change to the dependent key. This is useful for a (read-only) composite
     *  value or similar.
     *  
     *  Consider declaring key dependencies via the keyDependencies prototype
     *  member instead of calling this method directly.
     *
     *  @param keys         an array of keys which will trigger a change
     *                      notification to the dependent key.
     *  
     *  @param dependentKey the name of a dependent key
     *  
     *  @throws InvalidArgumentError if either the keys or dependentKey is null.
     **/
    setKeysTriggerChangeNotificationsForDependentKey: function(keys, dependentKey)
    {
        if (!keys || !keys.length)
            throw new InvalidArgumentError("keys array is not valid");
    
        if (!dependentKey)
            throw new InvalidArgumentError("dependentKey can not be null");
        
        if (-1!==dependentKey.indexOf('.'))
            throw new InvalidArgumentError('dependentKey may not be a key path');
            
        var key;
        var keyInfo;
        var keyIndex;
        var dependentKeys;

        if ('string'===typeof(keys))
            keys= [keys];
            
        if (!this.__dependentKeys)
            this.__dependentKeys= {};

        for (keyIndex=0; keyIndex<keys.length; ++keyIndex)
        {
            key= keys[keyIndex];
            if (!key)
                throw new InvalidArgumentError("key at index " + keyIndex +
                                               " was null");

            if (!(key in this.__dependentKeys))
                this.__dependentKeys[key]= [];

            //  swizzle the getter/mutator methods if necessary for this key.
            DC.KVO.getPropertyMethodsForKeyOnObject(key, this);
            
            dependentKeys= this.__dependentKeys[key];

            if (-1==dependentKeys.indexOf(dependentKey))
                dependentKeys.push(dependentKey);
        }
    },

    /** Determine the list of mutable keys.
        @returns an array of the names of the mutable keys.
     **/
    mutableKeys: function()
    {
        var keys=[];
        var k;
        var v;
        var firstChar;
    
        //  If there is a __mutableKeys property, return that instead of calculating
        //  the list of mutable keys.
        if ("__mutableKeys" in this && this.__mutableKeys.concat)
            return this.__mutableKeys;
        
        var keysToIgnore= Set.union(DC.KVO.keysToIgnore, this.__keysToIgnore);
    
        for (k in this)
        {
            if (k in keysToIgnore || '__'===k.substr(0,2))
                continue;
            
            v= this[k];
            //  If it isn't a function, then it is inherently mutable.
            if ('function'!==typeof(v))
            {
                keys.push(k);
                continue;
            }
        
            //  Setters must have only one argument and begin with 'set',
            //  ignore everything else.
            if (1!==v.length || 'set'!==k.substr(0,3))
                continue;

            //  Setters must have a uppercase letter following the 'set' prefix.
            firstChar= k.charAt(3);
            if (firstChar!==firstChar.toUpperCase())
                continue;

            //  Keys begin with a lowercase letter.
            k= firstChar.toLowerCase() + k.substr(4);
        
            //  Only add the key if I didn't already see a non-function property
            //  with the same name.
            if (-1===keys.indexOf(k))
                keys.push(k);
        }
    
        return keys;
    },

    /** Initialise Key Value Observing for this object.
     **/
    initialiseKeyValueObserving: function()
    {
        //  Setting observers early helps prevent cycles when initialising
        //  key-value observing
        this.__uid= this.__uid||DC.generateUid();
        this.__observers= {};
    },

    _addParentLink: function(parent, keyInfo, uid)
    {
        if (!this.hasOwnProperty('__observers'))
            this.initialiseKeyValueObserving();

        var parentObservers= this.__observers[DC.KVO.kAllPropertiesKey];
        if (!parentObservers)
            parentObservers= this.__observers[DC.KVO.kAllPropertiesKey]= {};
        
        uid= uid||keyInfo.__uid;

        //  already has parent link
        if (uid in parentObservers)
            return;

        var parentLink= new DC.ObserverEntry(parent,
                                    parent.observeChildObjectChangeForKeyPath,
                                    keyInfo?keyInfo.key:'');
                                    
        parentObservers[uid]= parentLink;

        if (!keyInfo)
            return;
            
        keyInfo.unlinkParentLink();
        keyInfo.parentLink= parentLink;
    },
    
    _removeParentLink: function(parent, keyInfo, uid)
    {
        if (!this.__observers)
            return;
            
        var parentObservers= this.__observers[DC.KVO.kAllPropertiesKey];
        if (!parentObservers)
            parentObservers= this.__observers[DC.KVO.kAllPropertiesKey]= {};
        
        uid= uid||keyInfo.__uid;

        if (keyInfo && keyInfo.parentLink===parentObservers[uid])
            keyInfo.unlinkParentLink();

        //  remove the parent link
        delete parentObservers[uid];
    },
    
    /** Register for changes to a particular key path.
     *
     *  @param observer     the object interested in changes to the value of key
     *                      path
     *  @param callback     (optional) the function to call when the key changes,
     *                      defaults to "observeChangesForKeyPath"
     *  @param keyPath      the key path of interest
     *  @param context      a value passed back to the callback -- meaningful only
     *                      to the observer
     *  
     *  @throws InvalidArgumentError when the keypath is empty, observer is null,
     *          callback is null.
     **/
    addObserverForKeyPath: function(observer, callback, keyPath, context)
    {
        if (!keyPath || 0===keyPath.length)
            throw new InvalidArgumentError( "keyPath is empty" );
                                    
        if (!observer)
            throw new InvalidArgumentError( "Observer may not be null" );

        if (!callback)
            callback= observer["observeChangeForKeyPath"];
        
        if ('string'===typeof(callback))
            callback= observer[callback];
            
        if (!callback)
            throw new InvalidArgumentError( "Missing callback method" );

        if (!this.hasOwnProperty('__observers'))
            this.initialiseKeyValueObserving();

        if (!this.__observers[keyPath])
        {
            //  fetch the keyInfo for this keyPath, to swizzle setter methods
            //  along the path to fire willChange/didChange methods.
            this.infoForKeyPath(keyPath);
            this.__observers[keyPath]= [];
        }
        
        var observerEntry= new DC.ObserverEntry(observer, callback,
                                                      context);

        this.__observers[keyPath].push(observerEntry);
    },

    /** Remove an observer for a keyPath.
     *
     *  @param keyPath          the key path of interest
     *  @param observer         the object interested in changes to the value of key
     *                          path
     **/
    removeObserverForKeyPath: function(observer, keyPath)
    {
        if (!keyPath || 0===keyPath.length)
            throw new InvalidArgumentError( "keyPath may not be empty" );
                                    
        if (!observer)
            throw new InvalidArgumentError( "Observer may not be null" );

        if (!this.__observers || !this.__observers[keyPath])
            return;

        var allObservers= this.__observers[keyPath];
        var entryIndex=-1;
        var entry;
        var len= allObservers.length;
    
        //  TODO: This could be faster... It shouldn't be necessary to scan
        //  the entire list of observers.
        for (entryIndex=0; entryIndex<len; ++entryIndex)
        {
            entry= allObservers[entryIndex];
            if (entry.observer==observer)
            {
                allObservers.splice(entryIndex, 1);
                return;
            }
        }
    },

    /** Prepares for a later invocation of didChangeValueForKey by caching the
     *  previous value in the key's KeyInfo structure. Should be called for manual
     *  KVO implementation.
     *
     *  @param key  the key that has changed
     *  @throws InvalidArgumentError if the key is null
     **/
    willChangeValueForKey: function(key, keyInfo)
    {
        if (!key)
            throw new InvalidArgumentError("key may not be null");

        keyInfo= (keyInfo instanceof DC.KeyInfo) ? keyInfo : this.infoForKey(key);
        if (!keyInfo)
            return;

        //  Only remember the previous value the first time
        //  willChangeValueForKey is called.
        if (1!==++keyInfo.changeCount)
            return;

        //  Prepare change notification for dependent keys
        var dependentKeys= (this.__dependentKeys && this.__dependentKeys[key]);
        if (dependentKeys)
            dependentKeys.forEach(this.willChangeValueForKey, this);
            
        keyInfo.previousValue= keyInfo.get(this);
    },

    forceChangeNotificationForKey: function(key, keyInfo)
    {
        if (!key)
            throw new InvalidArgumentError( "key may not be null" );

        keyInfo= (keyInfo instanceof DC.KeyInfo) ? keyInfo : this.infoForKey(key);
        if (!keyInfo)
            return;
            
        if (0!==keyInfo.changeCount)
            return;
        keyInfo.changeCount=1;
        this.didChangeValueForKey(key, keyInfo);
    },
    
    /** Invoked to notify observers that the value has changed.
     *
     *  @param key  the key that has changed
     **/
    didChangeValueForKey: function(key, keyInfo)
    {
        if (!key)
            throw new InvalidArgumentError( "key may not be null" );

        keyInfo= (keyInfo instanceof DC.KeyInfo) ? keyInfo : this.infoForKey(key);
        if (!keyInfo)
            return;

        //  If this isn't the final call to didChangeValueForKey, don't issue
        //  the change notification.
        if (0!==--keyInfo.changeCount)
            return;
            
        var newValue= keyInfo.get(this);
        var previousValue= keyInfo.previousValue;
        keyInfo.previousValue= null;
        
        if (newValue!==previousValue)
        {
            var change= new DC.ChangeNotification(this,
                                                        DC.ChangeType.setting,
                                                        newValue, previousValue);
            this.notifyObserversOfChangeForKeyPath(change, key);
        
            //  stop observing changes to old value
            if (previousValue && previousValue._removeParentLink)
                previousValue._removeParentLink(this, keyInfo);

            //  observe changes to the new value
            if (newValue && newValue._addParentLink)
                newValue._addParentLink(this, keyInfo);
        }

        //  Fire change notification for dependent keys
        var dependentKeys= (this.__dependentKeys && this.__dependentKeys[key]);
        if (dependentKeys)
            dependentKeys.forEach(this.didChangeValueForKey, this);
    },

    /** Notify all observers that the specified keyPath has changed. Not usually
     *  called by external code.
     *
     *  @param change   An instance of {@link DC.ChangeNotification}
     *  @param change.newValue     new value of the key
     *  @param change.oldValue     original value of the key
     *  @param change.changeType   what kind of change is this
     *  @param keyPath      path to the key that has changed
     **/
    notifyObserversOfChangeForKeyPath: function(change, keyPath)
    {
        if (!keyPath)
            throw new InvalidArgumentError( "keyPath may not be null" );
    
        //  Nothing to do if no-one is observing changes in this object
        if (!this.__observers)
            return;

        var observerIndex;
        var observers;
        var len;
        
        //  First notify containers -- registered as observers for the
        //  KVO.kAllPropertiesKey key
        observers= this.__observers[DC.KVO.kAllPropertiesKey];
        if (observers)
        {
            var changeClone= Object.clone(change);
            var objectKeyPathLength= change.objectKeyPath.length;
            change.objectKeyPath.push(this);

            for (observerIndex in observers)
            {
                var o= observers[observerIndex];
                o.observeChangeForKeyPath(changeClone, keyPath);
            }
            
            //  restore the length of the objectKeyPath array
            change.objectKeyPath.length= objectKeyPathLength;
        }
    
        //  don't bother with the rest of notifications for whole-object changes
        if (DC.KVO.kAllPropertiesKey==keyPath)
            return;
        
        //  Next notify actual observers for the specified keyPath
        observers= this.__observers[keyPath];
        if (observers && observers.length)
        {
            len= observers.length;
            for (observerIndex=0; observerIndex < len; ++observerIndex)
                observers[observerIndex].observeChangeForKeyPath(change, keyPath);
        }
    
        //  Notify observers for a subkey: for example, if someone is observing
        //  foo.bar.baz and foo.bar is changed, a change notification should
        //  be sent out for baz.
        var subkey= keyPath + ".";
        var subkeyLength= subkey.length;
        var restOfKeyPath;
        var observerKeyPath;
        var subkeyChange;
        var oldSubValue;
        var newSubValue;
        var hasPreviousValue= !(null===change.oldValue ||
                                'undefined'===typeof(change.oldValue));
        
        for (observerKeyPath in this.__observers)
        {
            if (observerKeyPath.substr(0, subkeyLength)!=subkey)
                continue;

            observers= this.__observers[observerKeyPath];
            if (!observers || !observers.length)
                continue;
            
            restOfKeyPath= observerKeyPath.substr(subkeyLength);

            oldSubValue= change.oldValue;
            if (oldSubValue && oldSubValue.valueForKeyPath)
                oldSubValue= oldSubValue.valueForKeyPath(restOfKeyPath);
            else
                oldSubValue= null;
            newSubValue= change.newValue;
            if (newSubValue && newSubValue.valueForKeyPath)
                newSubValue= newSubValue.valueForKeyPath(restOfKeyPath);
            else
                newSubValue= null;
                
            //  skip notifications if the value hasn't really changed
            if (hasPreviousValue && oldSubValue===newSubValue)
                continue;
            subkeyChange= new DC.ChangeNotification(change.object,
                                                      change.changeType,
                                                      newSubValue, oldSubValue,
                                                      change.indexes);
            len= observers.length;
            for (observerIndex=0; observerIndex < len; ++observerIndex)
            {
                observers[observerIndex].observeChangeForKeyPath(subkeyChange,
                                                               observerKeyPath);
            }
        }
    }
});

//  Internal key used for observing property changes to a KVO-compliant object
DC.KVO.kAllPropertiesKey= "*";

/** Set of keys which should be ignored when computing the list of mutable keys
 *  and when adapting an existing object.
 */
DC.KVO.keysToIgnore= $S("__keys","__observers","__keysToIgnore",
                              "__dependentKeys", "__mutableKeys",
                              "__factories__");

/** Set of value types which will be ignored when adapting an object and when
 *  attempting to observe child object changes.
 */
DC.KVO.typesOfKeyValuesToIgnore= $S("string", "number", "boolean", "date",
                                          "regexp", "function");


/** Private method for getting property methods for an object.
 *  @private
 *  @function
 */
DC.KVO.getPropertyMethodsForKeyOnObject= (function(){

    /** Create property getter/setter methods for a key. The actual value of the
     *  key will be stored in __kvo_prop_+key. The getter and setter methods
     *  will automatically call willChange & didChange and addParentLink.
     *  
     *  @param key  the name of the key to wrap
     *  @param [privateKey] the name of the private key to use.
     *  
     *  @inner
     */
    function createPropertyMethods(key, privateKey)
    {
        privateKey= privateKey || '__kvo_prop_' + key;
        
        var methods= {
        
            getter: function()
            {
                var value= null;
                if (privateKey in this)
                    value= this[privateKey];
                var keyInfo= this.__keys?this.__keys[key]:null;
                if (!keyInfo)
                    return value;
                    
                if (value && value._addParentLink)
                    value._addParentLink(this, keyInfo);
                else
                    keyInfo.unlinkParentLink();
                return value;
            },
            
            mutator: function(newValue)
            {
                this.willChangeValueForKey(key);
                //  Change undefined values to null, because undefined is used
                //  as a marker that an object in the hierarchy didn't exist.
                if ('undefined'===typeof(newValue))
                    newValue= null;
                this[privateKey]= newValue;
                this.didChangeValueForKey(key);
                return newValue;
            }
            
        };
        
        //  Setting the __key property on the mutator to the name of the key
        //  allows us to tell that this function was created by the library.
        methods.mutator.__key= key;
        methods.getter.__key= key;
        
        return methods;
    }
    
    /** Create a wrapper function that will invoke willChange before
     *  calling the original mutator and didChange after calling the
     *  original mutator.
     *  
     *  @param mutator  the original mutator function to wrap
     *  @param key      the name of the key
     *  @returns a wrapped function
     *  
     *  @inner
     */
    function wrapMutatorWithChangeNotificationForKey(mutator, key)
    {
        function wrapped(value)
        {
            this.willChangeValueForKey(key);
            var result= mutator.call(this, value);
            this.didChangeValueForKey(key);
            return result;
        }
        wrapped.__key= key;
        wrapped.valueOf= function()
        {
            return mutator;
        }
        wrapped.toString= function()
        {
            return String(mutator);
        }
        return wrapped;
    }

    /** Create a wrapped getter function which will ensure that the parent link
     *  is added to all property values.
     *  
     *  @param getter   the original getter function to wrap
     *  @param key      the name of the key
     *  @returns a wrapped function
     *  
     *  @inner
     */
    function wrapGetterWithAddParentLinkForKey(getter, key)
    {
        function wrapped()
        {
            var value= getter.call(this);
            var keyInfo= this.__keys?this.__keys[key]:null;
            if (!keyInfo)
                return value;

            if (value && value._addParentLink)
                value._addParentLink(this, keyInfo);
            else
                keyInfo.unlinkParentLink();
                
            return value;
        }
        wrapped.__key= key;
        wrapped.valueOf= function()
        {
            return getter;
        }
        wrapped.toString= function()
        {
            return String(getter);
        }
        return wrapped;
    }
    
    /** The actual implementation of getPropertyMethodsForKeyOnObject for
     *  browsers that support JavaScript getters and setters.
     *  
     *  @inner
     */
    function getPropertyMethodsForKeyOnObject(key, obj)
    {
        var proto= obj.constructor.prototype;
        var objectIsPrototype= (proto==obj);
        var where= (proto!=Object.prototype &&
                    proto!=DC.KVO.prototype)?proto:obj;

        var keyAsTitle= key.titleCase();
        var getterName= "get" + keyAsTitle;
        var mutatorName= "set" + keyAsTitle;
        var validatorName= "validate" + keyAsTitle;
        var getter;
        var mutator;
        var value;
        var validator= obj[validatorName];
        
        //  Are the getter & mutator properties?
        var properties= ('undefined'!==typeof(getter=obj.__lookupGetter__(key)) &&
                         'undefined'!==typeof(mutator=obj.__lookupSetter__(key)));

        if (!properties)
        {
            getterName= (getterName in obj)?getterName:key;
            getter= obj[getterName];
            mutator= obj[mutatorName];
        }

        //  Handle factory functions: call them before resolving the property
        // if ('function'==typeof(getter) && getter.__factoryFn__)
        //     obj[getterName]= getter= getter.call(obj);
            
        //  If the getter isn't a function, then there can be no mutator
        if ('function'!==typeof(getter))
        {
            var privateKey= '__kvo_prop_' + key;
            var methods= createPropertyMethods(key, privateKey);

            //  determine whether to remember the initial value
            if (key in obj)
            {
                value= obj[privateKey]= ('undefined'==typeof(getter)?null:getter);
                delete obj[key];
            }
            
            getter= methods.getter;
            mutator= methods.mutator;
            properties= true;
        }
        else
        {
            //  determine the initial value of the key, can't be after wrapping
            //  the getter because the KeyInfo might not yet be created...
            if (getter && !objectIsPrototype)
                value= getter.valueOf().call(obj);

            //  If the getter hasn't already been wrapped to call _addParentLink
            //  wrap it now
            if (getter && key!==getter.__key)
                getter= wrapGetterWithAddParentLinkForKey(getter, key);
                
            //  If the mutator hasn't already been wrapped to call willChange &
            //  didChange, wrap it now
            if (mutator && key!==mutator.__key)
                mutator= wrapMutatorWithChangeNotificationForKey(mutator, key);
        }
        
        if (properties)
        {
            where.__defineGetter__(key, getter);
            where.__defineSetter__(key, mutator);
        }
        else
        {
            if (getter)
            {
                if (obj.hasOwnProperty(getterName))
                    obj[getterName]= getter;
                else
                    where[getterName]= getter;
            }
            
            if (mutator)
            {
                if (obj.hasOwnProperty(mutatorName))
                    obj[mutatorName]= mutator;
                else
                    where[mutatorName]= mutator;
            }
        }
        
        //  return the getter & mutator methods
        return {
            getter: getter,
            mutator: mutator,
            validator: validator,
            value: value
        };
    }

    /** The implementation for getPropertyMethodsForKeyOnObject for browsers
     *  that don't support JavaScript getters and setters (MSIE).
     *  
     *  @inner
     */
    function getPropertyMethodsForKeyOnObject_MSIE(key, obj)
    {
        var proto= obj.constructor.prototype;
        var objectIsPrototype= (proto==obj);
        var where= (proto!=Object.prototype &&
                    proto!=DC.KVO.prototype)?proto:obj;

        var keyAsTitle= key.titleCase();
        var mutatorName= "set" + keyAsTitle;
        var getterName= "get" + keyAsTitle;
        var validatorName= "validate" + keyAsTitle;

        getterName= (getterName in obj)?getterName:key;
        
        var getter= obj[getterName];
        var mutator= obj[mutatorName];
        var validator= obj[validatorName];
        var value;

        //  Handle factory functions: call them before resolving the property
        // if ('function'==typeof(getter) && getter.__factoryFn__)
        //     obj[getterName]= getter= getter.call(obj);
        
        //  If the getter isn't a function, then there can be no mutator
        if ('function'!==typeof(getter))
        {
            if (key in obj)
                value= getter;
            getter= null;
            mutator= null;
        }
        else
        {
            //  determine the initial value of the key, can't be after wrapping
            //  the getter because the KeyInfo might not yet be created...
            if (getter && !objectIsPrototype)
                value= getter.valueOf().call(obj);

            //  If the getter hasn't already been wrapped to call _addParentLink
            //  wrap it now
            if (getter && key!==getter.__key)
                getter= wrapGetterWithAddParentLinkForKey(getter, key);
                
            //  If the mutator hasn't already been wrapped to call willChange &
            //  didChange, wrap it now
            if (mutator && key!==mutator.__key)
                mutator= wrapMutatorWithChangeNotificationForKey(mutator, key);
        }
        
        if (getter)
        {
            if (obj.hasOwnProperty(getterName))
                obj[getterName]= getter;
            else
                where[getterName]= getter;
        }
        
        if (mutator)
        {
            if (obj.hasOwnProperty(mutatorName))
                obj[mutatorName]= mutator;
            else
                where[mutatorName]= mutator;
        }
            
        return {
            getter: getter,
            mutator: mutator,
            validator: validator,
            value: value
        };
    }

    if (DC.Support.Properties)
        return getPropertyMethodsForKeyOnObject;
    else
        return getPropertyMethodsForKeyOnObject_MSIE;
    
})();


/** Add KVO methods to an object that doesn't already have them.
 *  
 *  @param obj  the object to add the methods to
 **/
DC.KVO.adapt= function(obj)
{
    //  either there's no object or the object already has the methods
    if (!obj)
        throw new InvalidArgumentError( "Can't adapt a null object" );

    var p;
    
    for (p in DC.KVO.prototype)
    {
        if (p in obj)
            continue;
        obj[p]= DC.KVO.prototype[p];
    }

    //  perform magic for key dependencies
    if ('keyDependencies' in obj && !('__dependentKeys' in obj))
    {
        var depends= obj.keyDependencies;
        for (p in depends)
            obj.setKeysTriggerChangeNotificationsForDependentKey(depends[p], p);
    }
    
    return obj;
}




/** Add KVO methods to all the objects within an object. Allows using object
 *  literals with KVO. It is important that the object not have cycles or this
 *  code will hang your browser.
 *  
 *  @param obj  the object graph to adapt
 **/
DC.KVO.adaptTree= function(obj)
{
    DC.KVO.adapt(obj);
    
    var p;
    var value;
    
    for (p in obj)
    {
        if (p in DC.KVO.keysToIgnore)
            continue;
            
        value= obj[p];
        
        if (!value)
            continue;
            
        if (DC.typeOf(value) in DC.KVO.typesOfKeyValuesToIgnore)
            continue;

        DC.KVO.adaptTree(value);
    }

    return obj;
}


/** Perform magic to automatically create key dependencies when a subclass of
 *  KVO is created.
 *  
 *  This processes the subclass's `keyDependencies` to create dependent keys by
 *  calling `setKeysTriggerChangeNotificationsForDependentKey`.
 */
DC.KVO.__subclassCreated__= function(subclass)
{
    var baseproto= subclass.superclass.prototype;
    var proto= subclass.prototype;
    
    //  Subclass hasn't changed the key dependencies prototype property...
    if (baseproto.keyDependencies===proto.keyDependencies)
        return;

    var depends= proto.keyDependencies||{};
    for (var p in depends)
        proto.setKeysTriggerChangeNotificationsForDependentKey(depends[p], p);
}
