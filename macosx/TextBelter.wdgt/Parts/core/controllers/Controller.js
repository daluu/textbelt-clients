/*jsl:import ../core/Bindable.js*/
/*jsl:import ../core/SortDescriptor.js*/


/** Base Controller class used for all other controllers.
 *  
 *  @declare DC.Controller
 *  @extends DC.Bindable
 */
DC.Controller= Class.create(DC.Bindable, {

    /** Create the base Controller class and registers it with the global
     *  context by the name parameter. After the Controller is fully
     *  constructed, all the bindings will be established (via `__postConstruct`
     *  hook).
     *  
     *  @param {Object} [parameters]   A mapping between exposed bindings and
     *          keypaths in the global context
     **/
    constructor: function(parameters)
    {
        this.base(parameters);
    },
    
    registerWithName: function(name)
    {
        if (!name)
            return;
        this.name= name;
        DC.registerModelWithName(this, name);
    }
        
});





