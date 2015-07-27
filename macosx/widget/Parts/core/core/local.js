/** Localised marker strings used by various views
 *  @namespace
 */
DC.strings= {

    //  Marker strings for TextField
    'marker.input.multipleValues': 'Multiple Values',
    'marker.input.placeholder': '',
    'marker.input.noSelection': 'No Selection',
    
    //  Marker strings for View
    'marker.text.multipleValues': 'Multiple Values',
    'marker.text.placeholder': '',
    'marker.text.noSelection': 'No Selection',
    
    //  Default Error description
    'error.no_description': 'An unspecified error occurred.',
    
    //  Default Error description for Formatters
    'error.invalid_value': 'This value is not valid.',
    'error.invalid_number': 'This value is not a valid number.'
};

/** Return the localised string for the given key. If the key is not present in
 *  the {@link DC.strings} namespace, this function will just return the
 *  key itself.
 */
DC.localisedString= function(key)
{
    return {
        toString: function()
        {
            if (key in DC.strings)
                return DC.strings[key];
            console.log('Localisation missing string for key: ' + key);
            return key;
        }
    };
}

/** An alias of {@link DC.localisedString} which is rather shorter to
 *  type. This mimics a fairly common localisation function pattern.
 *  
 *  @function
 *  @public
 */
var _= DC.localisedString;
