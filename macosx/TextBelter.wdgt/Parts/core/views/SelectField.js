/*jsl:import ListView.js*/


/** A view for popup select lists.
 *  
 *  @declare DC.SelectField
 *  @extends DC.ListView
 *  
 */
DC.SelectField= Class.create(DC.ListView, {

    exposedBindings: ['displayValues', 'contentValues', 'selectedValue', 'name'],

    observeContentValuesChange: function(change)
    {
        var view= this.viewElement();
        //  assumes that the content collection has already been set
        var optionIndex;
        var option;
        var allOptions= view.options;
        var optionsLength= allOptions.length;
    
        switch (change.changeType)
        {
            case DC.ChangeType.setting:
                if (!change.newValue)
                    break;

                for (optionIndex=0; optionIndex<optionsLength; ++optionIndex)
                    allOptions[optionIndex].value= change.newValue[optionIndex];
                break;
            
            case DC.ChangeType.insertion:
            case DC.ChangeType.replacement:
                var index;
                for (index=0; index<change.indexes.length; ++index)
                {
                    optionIndex= change.indexes[index];
                    option= allOptions[optionIndex];
                    option.value= change.newValue[index];
                }
                break;
            
            default:
                console.log('Unknown change type: ' + change.changeType);
                break;
        }
    },
    
    observeDisplayValuesChange: function(change)
    {
        var view= this.viewElement();
        //  assumes that the content collection has already been set
        var optionIndex;
        var option;
        var allOptions= view.options;
        var optionsLength= allOptions.length;
    
        switch (change.changeType)
        {
            case DC.ChangeType.setting:
                if (!change.newValue)
                    break;

                for (optionIndex=0; optionIndex<optionsLength; ++optionIndex)
                {
                    if (DC.Browser.IE)
                        allOptions[optionIndex].innerText= change.newValue[optionIndex];
                    else
                        allOptions[optionIndex].text= change.newValue[optionIndex];
                }
                break;
            
            case DC.ChangeType.insertion:
            case DC.ChangeType.replacement:
                var index;
                for (index=0; index<change.indexes.length; ++index)
                {
                    optionIndex= change.indexes[index];
                    option= allOptions[optionIndex];
                    option.text= change.newValue[index];
                }
                break;
            
            default:
                console.log('Unknown change type: ' + change.changeType);
                break;
        }
    },
    
    observeSelectedValueChange: function(change, keyPath, context)
    {
        if (this.bindings.content && !this.bindings.content.value())
            return;
        
        var view= this.viewElement();
        var options= view.options;
        var len= options.length;
        var newValue= change.newValue;

        view.disabled= 'undefined'===typeof(newValue) ||
                         DC.Markers.MultipleValues===newValue ||
                         DC.Markers.NoSelection===newValue;
            
        var selectionIndexes= [];
        
        for (var index= 0; index<len; ++index)
            if (options[index].value==newValue)
            {
                selectionIndexes= [index];
                break;
            }

        this.setSelectionIndexes(selectionIndexes);
    },
    
    observeNameChange: function(change, keyPath, context)
    {
        var view= this.viewElement();
        view.name= change.newValue;
    }

});
