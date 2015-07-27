/*jsl:import startup.js*/
/*jsl:import local.js*/

DC.Error= Class.create({

    constructor: function(details)
    {
        Object.extend(this, details);
    },
    
    description: _('error.no_description'),
    recoverySuggestion: null
    
});
