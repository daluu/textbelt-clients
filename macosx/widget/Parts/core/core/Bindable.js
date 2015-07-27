/*jsl:import kvo.js*/


/** Bindable is a base class that provides a simple mechanism for keeping one
 *  object's properties in sync with the properties of another. Views and
 *  Controllers are subclasses of Bindable.
 *  
 *  @declare DC.Bindable
 *  @extends DC.KVO
 *  
 *  @property bindings  a map of the bindings that have been established for
 *            this object.
 */
DC.Bindable= Class.create(DC.KVO, {

    /** Construct a new Bindable instance. This initialises the bindings
     *  property to an empty hash.
     */
    constructor: function(parameters)
    {
        this.bindings={};
        this.__parameters= parameters;
        this.__context= DC.dataModel;
    },

    __createFactoryObjects: function()
    {
        var oldDataModel= DC.dataModel;
        var oldContext= this.__context;
        
        DC.dataModel= this.__context= this;
        
        //  Create declarative objects
        var p;
        var v;
        for (p in this.__factories__)
        {
            v= this[p];
            if (!v.__factoryFn__)
                continue;
            this[p]= v.call(this);
        }
        
        //  Restore data model
        DC.dataModel= oldDataModel;
        this.__context= oldContext;
    },
    
    exposedBindings: [],
    
    /** Declarative structure for placeholders based on the binding. For example:
        
        defaultPlaceholders: {
            value: {
                nullValue: "No Value",
                multipleValues: "Multiple Values",
                noSelection: "No Selection"
            }
        }
    
        The exact value will be sent when the binding receives the specified
        marker value.
     **/
    defaultPlaceholders: {},
    
    automaticallySetupBindings: true,
    
    /** An object to use for relative bindings (*.foo) */
    __relativeSource: null,
    
    /** Return the default placeholder value for the given marker value.
    
        @param marker   The marker type
        @param binding  The binding name
        @returns The placeholder value or null if none was registered
     **/
    defaultPlaceholderForMarkerWithBinding: function(marker, binding)
    {
        var placeholders= this.defaultPlaceholders[binding];
        if (!placeholders)
            return null;
        
        return placeholders[marker]||null;
    },
    
    /** Create an observer method that simple calls setValueForKey to note the
        change. This allows simple bindings to be implemented with only a
        getter and setter pair.
        
        @param name The name of the binding
        @param keyPath  The keypath that is being observed. This is only used
               when signalling error for an unhandled change type.
        @returns an observer method
     **/
    __createObserverMethod: function(name, keyPath)
    {
        function observer(change)
        {
            if (DC.ChangeType.setting!==change.changeType)
                throw new InvalidArgumentError('Received invalid change type for synthesized binding observer (name="' + name + '" keyPath="' + keyPath + '")');
                
            var newValue= change.newValue;
            this.setValueForKey(change.newValue, name);
        }
        
        return observer;
    },
    
    /** Bind an exposed binding name to a given key path. The instance must
     *  implement an observer method for the exposed binding. The observer
     *  method must be named `observe<Binding>Change` where <Binding> is the
     *  titlecase version of `name`.
     *  
     *  If `keyPath` begins with an asterix (`*`), then the keypath is assumed
     *  to be in relation to the `relativeSource` object. Otherwise, the keypath
     *  is to an object in the global scope.
     *
     *      var foo1= new DC.Bindable();
     *      foo1.bindNameToKeyPath('bar', 'zebra.bar', null);
     *  
     *  In the example above, `foo1` has a binding for `bar` which will be kept
     *  synchronised with the value in the global context found by following the
     *  key path `zebra.bar`.
     *  
     *      var foo2= new DC.Bindable();
     *      var zebra= {
     *          bar: "I'm a bar"
     *      };
     *      foo2.bindNameToKeyPath('bar', '*.bar', zebra);
     *  
     *  In the second example, `foo2` will keep its `bar` binding in sync with
     *  the `bar` property of the `zebra` variable.
     *  
     *  @param {String} name        the name of the binding exposed via exposedBindings
     *  @param {String} keyPath     the path to the value used for this binding
     *  @param {Object} [relativeSource=null]   the model object to be used for
     *          relative key paths
     */
    bindNameToKeyPath: function(name, keyPath, relativeSource)
    {
        var fn;
        var binding;
        var info= {};
        
        if (!this.bindings)
            this.bindings={};
        
        fn= this["observe" + name.titleCase() + "Change"] ||
            this.__createObserverMethod(name, keyPath);
    
        //  Unbind the old value
        if (this.bindings[name])
            this.bindings[name].unbind();

        var context= this.__context;

        if ('object'===typeof(keyPath))
        {
            Object.extend(info, keyPath);
            keyPath= info.keypath;
        }
        
        //  parse out the keypath and transformer from the binding string
        Object.extend(info, DC.Binding.bindingInfoFromString(keyPath));
        
        if ('transformValue' in info)
        {
            info.transformer= {
                transformValue: info.transformValue,
                reverseTransformedValue: info.reverseTransformedValue||null
            };
            
            delete info.transformValue;
            delete info.reverseTransformedValue;
        }
        
        //  Handle relative keypaths
        if ('*.'===info.keypath.substr(0,2))
        {
            if (relativeSource)
                context= relativeSource;
            else
                context= new DC.KVO();
                
            info.keypath= info.keypath.substr(2);
        }
        
        //  Create the Binding based on the context, keypath and transformer
        info.name= name;
        info.object= context;
        info.observer= this;
        info.observerFn= fn;

        binding= new DC.Binding(info);
        binding.bind();
        this.bindings[name]= binding;
    },
    
    __postConstruct: function()
    {
        if (!this.automaticallySetupBindings)
            return;
            
        this.__initialising= true;

        this.__copyParameters(this.__parameters||{});

        this.setupBindings();
        this.updateBindings();
        this.createObservers();
        delete this.__initialising;
    },
    
    __copyParameters: function(parameters)
    {
        var p;
        var v;
        var adaptTree= DC.KVO.adaptTree;
        
        for (p in parameters)
        {
            if (-1!==p.search(/Binding$/))
                continue;
            v= parameters[p];
            if ('object'===DC.typeOf(v) && !('addObserverForKeyPath' in v))
                adaptTree(v);
            this[p]= v;
        }

        this.__parameters= parameters;
    },
    
    bindingInfoForName: function(bindingName)
    {
        if (!this.__parameters)
            return null;
        return this.__parameters[bindingName+"Binding"];
    },
    
    __createAutoObserver: function(fn, bindingName)
    {
        var setting= DC.ChangeType.setting;
        
        return function(change)
        {
            if (this.bindings[bindingName] || setting==change.changeType)
                return;
            fn.apply(this, arguments);
        };
    },
        
    /** Create default observers.
     */
    createObservers: function()
    {
        var bindings= this.exposedBindings;
        var len= bindings.length;
        var i;
        var fn;
        var bindingName;
        
        for (i=0; i<len; ++i)
        {
            bindingName= bindings[i];
            fn= this['observe' + bindingName.titleCase() + 'Change'];
            if (!fn)
                continue;
            fn= this.__createAutoObserver(fn, bindingName);
            this.addObserverForKeyPath(this, fn, bindingName, '__auto_observer__');
        }
    },
    
    /** Establish all the exposed bindings. This is performed in two parts:
     *  
     *  1. Setup each binding with updates deferred.
     *  2. Loop through each binding and call update.
     *  
     *  This allows all bindings to be established before invoking the change
     *  notification handlers for them, because the handlers might require the
     *  values of other bindings to complete properly.
     */
    setupBindings: function()
    {
        //  setup bindings
        var exposed= this.exposedBindings;
        var len= exposed.length;
        var keyPath;
        var b;
        var i;

        for (i=0; i<len; ++i)
        {
            b= exposed[i];
            keyPath= this.bindingInfoForName(b);
            if (!keyPath)
                continue;
            this.bindNameToKeyPath(b, keyPath, this.__relativeSource);
        }
        
    },

    /** Update the value of the bindings. Updated in the same order they were
        declared via exposedBindings.
     **/
    updateBindings: function()
    {
        var bindings= this.bindings;
        var exposed= this.exposedBindings;
        var len= exposed.length;
        var b;
        var i;
        
        for (i=0; i<len; ++i)
        {
            b= bindings[exposed[i]];
            if (!b)
                continue;
            b.update();
        }
    },
    
    unbind: function()
    {
        for (var b in this.bindings)
            this.bindings[b].unbind();
    }
    

});

/** Handler for creation of subclasses of Bindable: this fixes up the exposed
 *  bindings silliness by adding all the base class exposed bindings to the
 *  prototype value.
 *  
 *  @function
 *  @param subclass a reference to the constructor of the new class derived from
 *         Bindable which needs its exposedBindings property fixed up.
 */
DC.Bindable.__subclassCreated__= function(subclass)
{
    var baseproto= subclass.superclass.prototype;
    var proto= subclass.prototype;
    
    //  Handle default placeholders
    if (proto.hasOwnProperty('defaultPlaceholders'))
    {
        var placeholders= Object.clone(baseproto.defaultPlaceholders);
        proto.defaultPlaceholders= Object.extend(placeholders,
                                                 proto.defaultPlaceholders);
    }
    
    //  Nothing to do if the exposedBindings is the same as the superclass and
    //  there are no masked bindings
    if (baseproto.exposedBindings===proto.exposedBindings &&
        !proto.maskedBindings)
            return;

    //  create a set of the maskedBindings.  Masked bindings are those unique to this class
    //  as any masks have already been applied to the base class.  
    var masked= (baseproto.maskedBindings===proto.maskedBindings)?{}:$S(proto.maskedBindings);
    
    function isBindingExposed(binding)
    {
        return !(binding in masked);
    }

    //  gather all the exposed superclass bindings
    var bindings= baseproto.exposedBindings.filter(isBindingExposed);
    
    //  if the class defines its own bindings, filter those
    if (baseproto.exposedBindings!==proto.exposedBindings)
        bindings= bindings.concat(proto.exposedBindings.filter(isBindingExposed));

    //  stash the exposed bindings
    proto.exposedBindings= bindings;
};
