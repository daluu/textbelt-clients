/*jsl:import ObjectController.js*/



/** Sure would be nice to use a generator here...
 */
function IndexRange(begin, end)
{
    var i;
    var r=[];

    if (1==arguments.length && begin.length)
    {
        end= begin.length-1;
        begin= 0;
    }
    
    for (i=begin; i<=end; ++i)
        r.push(i);
    return r;
}



/** An ArrayController manages the interaction between an array-based model
 *  object and a view or other controller.
 *  
 *  @declare DC.ArrayController
 *  @extends DC.ObjectController
 */
DC.ArrayController= Class.create(DC.ObjectController, {

    /** Create a new ArrayController instance.
     *  
     *  @param {Object} [parameters=null]  a mapping between the controller's
     *          exposed bindings and the global context.
     */
    constructor: function(parameters)
    {
        this.base(parameters);
        this.arrangedObjects= [];
        this.__sortDescriptors= [];
        this.__filterPredicate= null;
        this.__selectionIndexes= [];
    },

    keyDependencies: {
        selectedObjects: ['selectionIndexes'],
        selectionIndex: ['selectionIndexes'],
        hasSelection: ['selectionIndexes'],
        canRemove: ['editable', 'selectionIndexes'],
        canAdd: ['editable']
    },
    
    selectsInsertedObjects: true,
    
    exposedBindings: ["selectionIndexes", "sortDescriptors", "filterPredicate",
                      "contentForMultipleSelection"],

    /** Observe changes to the content... This method will update the arranged
     *  object collection as appropriate.
     *  
     *  @param change   a change notification specifying whether the content has
     *                  been set or new elements were inserted, deleted or
     *                  replaced.
     */
    observeContentChange: function(change)
    {
        var len;
        var i;
        
        switch (change.changeType)
        {
            case DC.ChangeType.setting:
                this.setContent(change.newValue);
                break;
                
            case DC.ChangeType.insertion:
                this._insertObjectsIntoArrangedObjects(change.newValue);
                if (this.selectsInsertedObjects && !this.selectedObjects())
                {
                    var selectedObjects= this.selectedObjects();
                    selectedObjects= selectedObjects.concat(change.newValue);
                    this.setSelectedObjects(selectedObjects);
                } else if (!this.selectionIndexes().length && this.avoidsEmptySelection()) {
                    this.setValueForKey([ 0 ], "selectionIndexes");
                }
                
                break;
                
            case DC.ChangeType.deletion:
                this.rearrangeObjects();
                //  removed object will automatically be removed from the
                //  selection by rearrangeObjects.
                break;
                
            case DC.ChangeType.replacement:
                this.rearrangeObjects();
                //  Probably need to select the new objects...
                break;
                
            default:
                break;
        }
    },

    /** Accessor to determine whether new items may be added to the array
     *  managed by this controller. By default, if the controller is
     *  editable, `canAdd` returns true.
     */
    canAdd: function()
    {
        return this.editable();
    },

    /** Add a new instance of the class managed by this controller.
     */
    add: function()
    {
        var newObject= new (this.objectClass)();
        var content= this.content();
        content.addObject(newObject);
    },
    
    /** Can the currently selected elements be removed from the content?
     */
    canRemove: function()
    {
        return this.editable() && this.selectionIndexes().length;
    },
    
    /** Remove the currently selected elements from the content.
     */
    remove: function()
    {
        var selectedObjects= this.selectedObjects();
        var content= this.content();
        content.removeObjects(selectedObjects);
    },
    
    /** Set the array of object managed by this controller. This triggers a
     *  change to the `arrangedObjects` property.
     *      
     *  @param newContent   the array of objects to use for the new content.
     **/
    setContent: function(newContent)
    {
        newContent= newContent||[];
        if (this.bindings.content)
            this.bindings.content.setValue(newContent);
        this.__content= newContent;
        //  need to update the arrangedContent attribute
        this.rearrangeObjects(newContent);
    },
    
    /** Retrieve the sort descriptors for this ArrayController.
     *  @returns an array of sort descriptors or an empty array if there are no
     *           sort descriptors defined.
     **/
    sortDescriptors: function()
    {
        return this.__sortDescriptors;
    },
    
    /** Set the sort descriptors for this DC.ArrayController. Setting the
     *  sort descriptors will trigger the content to be rearranged according to
     *  the new sort information.
     *  
     *  @param descriptors  the sort descriptors used for sorting the contents of
     *                      this DC.ArrayController.
     **/
    setSortDescriptors: function(descriptors)
    {
        if (this.bindings.sortDescriptors)
            this.bindings.sortDescriptors.setValue(descriptors);
        this.__sortDescriptors= descriptors;
        this.rearrangeObjects();
    },
    
    /** Retrieve the filter predicate function.
     *  @returns the function used to filter the content or null if no predicate
     *           has been specified.
     **/
    filterPredicate: function()
    {
        return this.__filterPredicate;
    },
    
    /** Set the filter predicate for this ArrayController. Calls
     *  rearrangeObjects to update the value of arrangedObjects.
     *  @param  predicate   The filter predicate that should be used to limit the
     *                      content presented via the arrangedObjects property
     **/
    setFilterPredicate: function(predicate)
    {
        if (this.bindings.filterPredicate)
            this.bindings.filterPredicate.setValue(predicate);
        this.__filterPredicate= predicate;
        this.rearrangeObjects();
    },
    
    /** Filter an array of objects according to the filterPredicate. This
     *  actually operates only on the indexes of the array.
     *
     *  @param content  the content array to filter
     *
     *  @returns the indexes that pass the filter predicate.
     **/
    filterObjects: function(content)
    {
        var filterPredicate= this.filterPredicate();

        if (!filterPredicate)
            return IndexRange(content);
        
        var indexes=[];
    
        //  First filter the content, because it's always quicker to sort fewer
        //  elements than more.
        var i;
        var len;
        var v;
    
        //  Initialise the arranged object array to an empty array
        for (i=0, len=content.length; i<len; ++i)
        {
            v= content[i];
            if (filterPredicate(v))
                indexes.push(i);
        }

        return indexes;
    },
 
    /** Compare two objects according to the specified sort descriptors.
     *  @returns -1 if obj1 appears before obj2, 1 if obj1 appears after obj2,
     *           and 0 if obj1 is equal to obj2. If no sort descriptors have
     *           been set, all objects are equal.
     */
    _compareObjects: function(obj1, obj2)
    {
        var s;
        var result;
        var descriptors= this.sortDescriptors();
        var len= descriptors.length;
        
        for (s=0; s<len; ++s)
        {
            result= descriptors[s].compareObjects(obj1, obj2);
            if (!descriptors[s].ascending)
                result*=-1;
            if (0!==result)
                return result>0?1:-1;
        }
    
        return 0;
    },
    
    /** Sort an array of objects according to the sortDescriptors. This actually
     *  works only on the indexes of the array.
     *
     *  @param content  the content array to sort
     *  @param indexes  the indexes of the array to sort
     *
     *  @returns the indexes array arranged in order based on the
     *           sortDescriptors and the content.
     **/
    sortObjects: function(content, indexes)
    {
        indexes= indexes || IndexRange(content);

        /** A simple sort function that uses all the sort descriptors associated
            with this DC.ArrayController. The first descriptor that returns a non-zero
            value (AKA not equal) terminates the comparison. Note, this sort
            function receives the indexes from the arranged array and uses those
            indexes to find the objects to compare in the content array.
        
            @param index1   the index in the content array of the first object
            @param index2   the index in the content array of the second object
            @returns -1 if obj1 is less than obj2, 0 if the two objects are equal,
                     1 if obj1 is greater than obj2.
         **/
        var sortDescriptors= this.sortDescriptors();
        var numberOfSortDescriptors= sortDescriptors.length;
        
        function sortFunction(index1, index2)
        {
            var s;
            var result;
            var obj1= content[index1];
            var obj2= content[index2];
            var len= numberOfSortDescriptors;
            var descriptors= sortDescriptors;
            
            for (s=0; s<len; ++s)
            {
                result= descriptors[s].compareObjects(obj1, obj2);
                if (!descriptors[s].ascending)
                    result*=-1;
                if (0!==result)
                    return result;
            }
        
            return 0;
        }
    
        //  Now sort the arranged indexes array -- the actual sort is defined above.
        if (0!==sortDescriptors.length)
            indexes.sort(sortFunction);
    
        //  Determine the actual array of arranged objects by pulling out the object
        //  corresponding to the arranged index.
        return indexes;
    },

    /** Filter and Sort an array of objects according to the filterPredicate and
     *  sortDescriptors.
     *  
     *  @param content  the content array to filter & sort.
     *  @returns a copy of the content array filtered and sorted.
     **/
    arrangeObjects: function(content)
    {
        //  This contains the indexes of the content objects after being arranged
        //  according to the filter predicate and sort descriptors.
        var arranged= this.filterObjects(content);
    
        //  Sort the content objects based on the sortDescriptors
        arranged= this.sortObjects(content, arranged);
        
        //  If arranging the content (rather than an arbitrary collection),
        //  remember the mapping
        if (content===this.content())
        {
            var contentToArrangedMap= [];
            var len= arranged.length;
            for (var i=0; i<len; ++i)
                contentToArrangedMap[arranged[i]]= i;
            
            this.__contentToArrangedMap= contentToArrangedMap;
            this.__arrangedToContentMap= arranged;
        }
        //  corresponding to the arranged index.
        return content.objectsAtIndexes(arranged);
    },
    
    /** Rearrange the content objects according to the filter predicate and sort
     *  descriptors. Signals an KVO notification for arrangedObjects.
     **/
    rearrangeObjects: function(newContent)
    {
        var content= newContent || this.content() || [];
    
        var arrangedObjects= this.arrangeObjects(content);
        
        //  Determine new selection
        var selectedObjects= this.selectedObjects();
        var selectionIndexes= [];
        var len= selectedObjects.length;
        var sel;
        var i;
        
        this._inReArrangeObjects = true;

        for (i=0; i<len; ++i)
        {
            sel= arrangedObjects.indexOf(selectedObjects[i]);
            if (-1!==sel)
                selectionIndexes.push(sel);
        }
        
        // If we avoid empty selection we need to set a selection
        if (arrangedObjects.length && this.avoidsEmptySelection() && !selectionIndexes.length) {
            selectionIndexes.push(0);
        }
        
        this.setValueForKey(arrangedObjects, "arrangedObjects");
        this.setValueForKey(selectionIndexes, "selectionIndexes");

        this._inReArrangeObjects = false;

    },
    
    /** Find the correct position within the arranged objects and insert it.
     */
    _insertObjectsIntoArrangedObjects: function(newObjects)
    {
        //  sort and filter the new objects
        var sorted= this.arrangeObjects(newObjects);
        var sortedLen= sorted.length;

        var arranged= this.arrangedObjects;
        var arrangedLen= arranged.length;

        var indexes= [];
        var arrangedPos= 0;
        var newObj;
        var arrangedObj;
        var i;

        //  The indexes array will always be the same length as the sorted
        //  array of objects
        indexes.length= sortedLen;
        
        //  consider each new object
        for (i=0; i<sortedLen; ++i)
        {
            newObj= sorted[i];
            
            while (arrangedPos<arrangedLen)
            {
                arrangedObj= arranged[arrangedPos];
                
                //  newObj appears before arrangedObj
                if (-1===this._compareObjects(newObj, arrangedObj))
                    break;
                
                ++arrangedPos;
            }

            //  record where the arrangedObject will be inserted
            indexes[i]= arrangedPos + i;
        }

        arranged.insertObjectsAtIndexes(sorted, indexes);
    },
    
    /** Retrieve the objects that are selected.
     *  @returns the selected objects.
     **/
    selectedObjects: function()
    {
        return this.__selectedObjects;
    },
    
    /** Set the objects that are selected. This really only works if each object
     *  appears only once in the arrangedObject array, otherwise, only the first
     *  instance will be selected and subsequent instances will be ignored.
     *
     *  @param selectedObjects  the array of objects to select
     *  @returns true if the selection changed
     **/
    setSelectedObjects: function(selectedObjects)
    {
        var selectionIndexes= [];
        var i;
        var index;
        var arrangedObjects= this.arrangedObjects;
    
        for (i=0; i<selectedObjects.length; ++i)
        {
            index= arrangedObjects.indexOf(selectedObjects[i]);
            //  Can't select an object that isn't in the arranged object array.
            if (-1===index)
                continue;
            selectionIndexes.push(index);
        }
    
        //  Set the selected indexes based on the indexes computed above
        return this.setSelectionIndexes(selectionIndexes);
    },
    
    /** Retrieve the selected indexes for this ArrayController. Contrary to
     *  Apple's documentation for selectionIndexes, these are in terms of the
     *  arrangedObjects rather than the content array.
     *
     *  @returns an array of selected indexes, an empty array is returned when
     *           there is nothing selected.
     **/
    selectionIndexes: function()
    {
        return this.__selectionIndexes;
    },
    
    /** Set the selected indexes for this ArrayController. Contrary to Apple's
     *  documentation for selectionIndexes, these are in terms of the
     *  arrangedObjects rather than the content array.
     *
     *  @param selectionIndexes  the new array of selected indexes
     *  @returns true if the selection was modified
     **/
    setSelectionIndexes: function(selectionIndexes)
    {
        //  First I need to sort the selectionIndexes, otherwise I can't compare them
        //  against the current selectionIndexes.
        selectionIndexes= selectionIndexes || [];
        selectionIndexes.sort();

        //  If the selected indexes are the same, then don't bother changing them (unless in rearrangeObjects
        //  as that method might change the objects behind the selection
        if ((0===(this.selectionIndexes()||[]).compare(selectionIndexes)) && !this._inReArrangeObjects) {
            return false;
        }

        if (this.bindings.selectionIndexes)
            this.bindings.selectionIndexes.setValue(selectionIndexes);
        this.__selectionIndexes= selectionIndexes;

        var arrangedObjects= this.arrangedObjects;
        this.__selectedObjects= arrangedObjects.objectsAtIndexes(selectionIndexes);
        //  The selection proxy will never actually change, so I need to force
        //  a change notification.
        this.forceChangeNotificationForKey('selection');
        return true;
    },
    
    /** Set the single selection index -- for single-select controls.
     *
     *  @param selectedIndex    the index of the object to select.
     *  @returns true if the selection changed
     **/
    setSelectionIndex: function(selectionIndex)
    {
        var result= this.setSelectionIndexes([selectionIndex]);
        return result;
    },
    
    /** Retrieve the selection index -- the first element in the list of selected
     *  indexes.
     *  @returns the first element in the selectionIndexes array.
     **/
    selectionIndex: function()
    {
        var selectionIndexes= this.selectionIndexes();
        if (0===selectionIndexes.length)
            return -1;
        
        return selectionIndexes[0];
    },
    
    hasSelection: function()
    {
        return (this.selectionIndexes().length > 0);
    },
    
    setAvoidsEmptySelection: function(avoidsEmpty)
    {
        this.__avoidsEmptySelection = avoidsEmpty;
        
        // If we don't have a selection, try and set one up
        if (!this.hasSelection() && this.arrangedObjects.length) {
            this.setValueForKey([ 0 ], "selectionIndexes");
        }
    },
    
    avoidsEmptySelection: function()
    {
        return this.__avoidsEmptySelection;
    }
    
});
