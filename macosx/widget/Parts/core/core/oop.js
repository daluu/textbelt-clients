/*jsl:import startup.js*/

/**
 *  @namespace
 */
var Class= (function(){

    /** Wrap a constructor function so that it may invoke the base constructor.
     *  @param construct    the original constructor function
     *  @param superclass   the superclass' constructor function
     *  @returns a wrapped function which sets up the base method correctly.
     *
     *  @inner
     */
    function wrapConstructorForBase(construct, superclass)
    {
        var wrapped;
        
        if (!construct && !superclass)
            return construct;
            
        if (!construct)
            wrapped= function()
            {
                return superclass.apply(this, arguments);
            };
        else
        {
            var callsBase= /this\.base/.test(construct);

            if (!callsBase && !superclass)
                return construct;
                
            if (!callsBase)
                wrapped= function()
                {
                    superclass.call(this);
                    return construct.apply(this, arguments);
                };
            else
                wrapped= function()
                {
                    var prev= this.base;
                    this.base= superclass||function(){};
                    var result= construct.apply(this, arguments);
                    this.base= prev;
                    return result;
                };
        }
        
        wrapped.valueOf= function()
        {
            return construct;
        }
        wrapped.toString= function()
        {
            return String(construct);
        }
        return wrapped;
    }
    
    function callFactory(klass, args)
    {
        var fn= klass.prototype.__factory__.apply(klass, args);
        if ('function'!==typeof(fn))
            throw new Error('Factory function doesn\'t return a function');
        fn.__factoryFn__= true;
        return fn;
    }
    
    function createFactoryObjects(obj)
    {
        if (obj.__createFactoryObjects)
        {
            obj.__createFactoryObjects();
            return;
        }
        
        //  Create declarative objects
        var p;
        var v;
        for (p in obj.__factories__)
        {
            v= obj[p];
            if (!v.__factoryFn__)
                continue;
            obj[p]= v.call(obj);
        }
    }
    
    /** Create a constructor for a class. Depending on whether the constructor
     *  exists, the superclass exists, and whether the constructor calls its
     *  ancestor constructor, this function returns a wrapper function that
     *  is invoked first.
     *  
     *  @inner
     *  @param construct    the actual constructor for the new class
     *  @param [superclass] the constructor for the superclass
     *  @returns a wrapped function which calls the __postConstruct hook if the
     *           class defines one.
     */
    function makeConstructor(construct, superclass)
    {
        if (construct && !(construct instanceof Function))
            throw new Error('Invalid constructor');
        if (superclass && !(superclass instanceof Function))
            throw new Error('Invalid superclass');
        
        //  Remove the postConstruct wrapping around the constructor for the
        //  superclass.
        superclass= superclass?superclass.valueOf():null;
        
        //  If the constructor calls this.base, wrap it with the appropriate
        //  stuff.
        construct= wrapConstructorForBase(construct, superclass);

        var wrapped;
        
        if (construct)
            wrapped= function()
            {
                if (!(this instanceof wrapped))
                    return callFactory(wrapped, arguments);
                    
                this.__uid= this.__uid||DC.generateUid();

                var result= construct.apply(this, arguments);

                if (result) {
                    return result;
                }
            
                createFactoryObjects(this);
                
                if (this.__postConstruct instanceof Function)
                    this.__postConstruct();

                return this;
            };
        else
            wrapped= function()
            {
                if (!(this instanceof wrapped))
                    return callFactory(wrapped, arguments);

                this.__uid= this.__uid||DC.generateUid();

                createFactoryObjects(this);
                
                if (this.__postConstruct instanceof Function)
                    this.__postConstruct();

                return this;
            }
        
        //  make wrapped constructor look like the original
        wrapped.valueOf= function()
        {
            return construct;
        }
        wrapped.toString= function()
        {
            return String(construct||wrapped);
        }
        return wrapped;
    }

    /** Create a prototype with the minimum amount of closure baggage.
     *  @param superclass   the constructor of the superclass which should be
     *                      created as the prototype
     *  @returns a new prototype based on the superclass
     *  @inner
     */
    function makePrototype(superclass)
    {
        function silent() {}
        silent.prototype= superclass.prototype;
        return new silent();
    }

    /** Create a method wrapper that has access to the base method. Because
     *  of the wrapping of methods, I define a valueOf member on the wrapped
     *  method to return the original method. That allows the code to determine
     *  whether this method is the same as another.
     *  
     *  @param method   a reference to the method which may call `this.base(...)`
     *  @param ancestorMethod   a reference to the method which should be called
     *                          when the method calls `this.base(...)`.
     *  @returns a new function which sets up the base method
     *  @inner
     */
    function wrapMethodForBase(method, name, superproto)
    {
        if (!method || !/this\.base/.test(method))
            return method;
            
        function wrappedMethod()
        {
            var prev= this.base;
            this.base= superproto[name]||function(){};
            var ret= method.apply(this, arguments);
            this.base= prev;
            return ret;
        }
        wrappedMethod.valueOf= function()
        {
            return method;
        }
        wrappedMethod.toString= function()
        {
            return String(method);
        }
        return wrappedMethod;
    }
    
    /** Add a member to the prototype for a new class. If the value is a
     *  function, determine whether it calls 'this.base' to access its ancestor
     *  method and if so, wrap it in a closure which provides access to the
     *  ancestor method.
     *  
     *  @param proto    a reference to the prototype to which the member should
     *                  be added
     *  @param name     the name with which the member should be inserted
     *  @param value    the value of the new member
     *  @returns the value inserted as the new member (which might have been
     *           wrapped if it was a function)
     *  @inner
     */
    function addMember(proto, name, value, superproto)
    {
        //  determine whether value is a function that calls this.base()
        if (value instanceof Function && superproto)
        {
            var realValue= value.valueOf();
            value= wrapMethodForBase(value, name, superproto);
            value.name= name;
            
            if (realValue.__factoryFn__)
                proto.__factories__[name]= value;
        }

        proto[name]= value;
        
        return value;
    }

    /** Walk the class hierarchy to call the __subclassCreated__ hooks if
     *  present. Passes a reference to the newClass constructor.
     *  
     *  @param newClass the new class that is being created
     *  @inner
     */
    function postSubclassNotification(newClass)
    {
        var klass;
        for (klass= newClass.superclass; klass; klass=klass.superclass)
            if ('__subclassCreated__' in klass)
                klass.__subclassCreated__(newClass);
    }

    /** @scope Class */
    return {
    
        /** Create a class. This attempts to mimic classical OOP programming
         *  models in JavaScript. The first parameter (superclass) is optional
         *  and if not specified, the new class will have no superclass. The
         *  syntax is a bit awkward (what would you expect of trying to mimic
         *  a programming model that isn't _really_ supported), but it seems
         *  to be prevelant out there on the Internets.
         *  
         *      var Animal= Class.create( {
         *          constructor: function(name)
         *          {
         *              ...
         *          }
         *      });
         *  
         *  The constructor member of the class declaration is the method which
         *  will be invoked when your script executes: `new Animal(...)`. But
         *  there may be some wrapping magic going on to make inheritence work
         *  better. For example:
         *  
         *      var Cat= Class.create(Animal, {
         *          constructor: function(name, breed)
         *          {
         *              this.base(name);
         *              this.breed= breed;
         *          }
         *      });
         *  
         *  There's no _real_ base member, but `Class.create` actually creates
         *  a wrapper function which temporarily stashes the ancestor method
         *  in base and removes it when the method is finished. This works for
         *  any method.
         *  
         *  Additionally, you may define a class method (`__subclassCreated__`)
         *  which will be called each time a new class is created using your
         *  class as a superclass or ancestor class. The following example
         *  defines a subclass hook function for the `Animal` class:
         *  
         *      Animal.__subclassCreated__= function(newClass)
         *      {
         *      ...
         *      }
         *  
         *  Finally, classes may define a `__postConstruct` method which will be
         *  called after all constructors are invoked. In the case of Views,
         *  the `__postConstruct` method invokes their `init` method if the
         *  DOM node is available or schedules the `init` method if the DOM has
         *  not finished loading.
         *  
         *  @param [superclass] a reference to the super class for this class.
         *                      If no superclass is specified, the new class
         *                      will inherit from Object.
         *  @param decl an object literal declaring the instance members for the
         *              class. These members will be created on the prototype
         *              for the class. So be careful about using object literals
         *              within this declaration, because they may not work as
         *              you might be expecting -- they will be shared among all
         *              instances.
         *  
         *  @returns a reference to a constructor function that will be used to
         *           initialise instances of this class.
         */
        create: function(superclass, decl)
        {
            var construct;
            var proto= {};

            switch (arguments.length)
            {
                case 0:
                    throw new TypeError('Missing superclass and declaration arguments');
            
                case 1:
                    decl= superclass;
                    superclass= undefined;
                    break;
                
                default:
                    proto= makePrototype(superclass);
                    break;
            }

            //  Allow decl to be a function that returns an object
            if ('function'==typeof(decl))
            {
                decl= decl();
                if (!decl)
                    throw new Error('Class declaration function did not return a prototype');
            }
            
            if (decl.hasOwnProperty('constructor'))
            {
                construct= decl['constructor'];
                delete decl['constructor'];
            }
            
            construct= makeConstructor(construct, superclass);
            
            construct.prototype= proto;
            construct.prototype.constructor= construct;
            construct.superclass= superclass;
            
            //  Prepare for factory functions in class decl.
            if (superclass)
                proto.__factories__= Object.clone(superclass.prototype.__factories__);
            else
                proto.__factories__= {};
            
            //  Create a unique ID for each class, helps the Dashcode indexer
            construct.__class_id__= DC.generateUid();
                
			// Give the class a UID, for easier lookup
            proto.__class_id__ = DC.generateUid();

            this.extend(construct, decl);
        
            postSubclassNotification(construct);
        
            return construct;
        },

        /** Determine the name of the property of an object with the given
         *  value. Because the property value might appear more than once in
         *  a given object, this function might not be definitive. But for
         *  things like methods (which seldom appear more than once), it
         *  should be good enough.
         *  
         *  @returns the name of the property having the given value or null
         *  if the name could not be determined.
         */
        findPropertyName: function(obj, propertyValue)
        {
            var v;
            
            for (var p in obj)
            {
                v= obj[p];
                if (v===propertyValue ||
                    ('function'===typeof(v) && v.valueOf()===propertyValue))
                    return p;
            }
            return null;
        },
        
        /** Extend a class definition with the elements of an object literal.
         *  If the host JavaScript environment supports getters and setters
         *  (Firefox 2.0, Safari 3, SpiderMonkey, and Rhino) then this function
         *  will create appropriate getters and setters rather than copying
         *  the value.
         *  
         *  @function
         *  @param class    a reference to the constructor for the class which
         *                  should be extended
         *  @param decl     an object literal defining the members to add to the
         *                  class prototype
         *  
         *  @returns the original class object.
         */
        extend: (function(){
            if (DC.Support.Properties)
                return function(klass, decl)
                        {
                            var proto= klass.prototype;
                            var superproto= klass.superclass && klass.superclass.prototype;
                            var v;
        
                            for (var p in decl)
                            {
                                var g= decl.__lookupGetter__(p);
                                var s= decl.__lookupSetter__(p);
                                if (g || s)
                                {
                                    g && proto.__defineGetter__(p, g);
                                    s && proto.__defineSetter__(p, s);
                                }
                                else
                                    addMember(proto, p, decl[p], superproto);
                            }

                            return klass;
                        };
            else
                return function(klass, decl)
                        {
                            var proto= klass.prototype;
                            var superproto= klass.superclass && klass.superclass.prototype;
                            for (var p in decl)
                                addMember(proto, p, decl[p], superproto);
                        };
        })()
    };
    
})();