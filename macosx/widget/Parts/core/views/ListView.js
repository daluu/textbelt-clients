/*jsl:import View.js*/
/*jsl:import ../controllers/ArrayController.js*/

/** A view that will iterate over a collection of objects. This view exposes
 *  the following bindings:
 *  
 *   - `content`: The view's content is an array of objects which should be
 *     displayed.
 *   - `selectionIndexes`: This binding is for an array representing the indexes
 *     of the selected elements in the view.
 *   - `selectedIndex`: This binding is the single selection equivalent of
 *     `selectionIndexes`. Note: binding `selectedIndex` does not restrict
 *     the view to single selection. To enable multiple selection in a
 *     ListView, refer to the {@link #multiple} property.
 *   - `selectedObject`: This binding presents the single selected object in a
 *     ListView.
 *  
 *  The first child node within the view's node is considered the template
 *  node and will be used to generate nodes for each element in the view's
 *  content array. Consider the following example:
 *  
 *      <ul contentBinding="state.content">
 *        <li textBinding="*.name">Nothing To See Here</li>
 *      </ul>
 *  
 *  This defines an unordered list with a single child item. The nodes bind to
 *  state data using custom attributes (`contentKeyPath` and `textKeyPath`). The
 *  `LI` node binds to the elements of the ListView's `content` by starting
 *  its keypath with `*`. Now, if the value of `state.content` is the array:
 *  
 *      [{name: 'Madeline'}, {name: 'Augustus'}, {name: 'Tim'}, {name: 'Magic'}]
 *  
 *  The ListView will generate the following:
 *  
 *      <ul contentBinding="state.content">
 *        <li textBinding="*.name">Madeline</li>
 *        <li textBinding="*.name">Augustus</li>
 *        <li textBinding="*.name">Tim</li>
 *        <li textBinding="*.name">Magic</li>
 *      </ul>
 *  
 *  @property multiple  This property controls whether the ListView supports
 *                      multiple selection or not. You may set this property
 *                      directly on the view's node (e.g.
 *                      `<ul multiple="true" ...>`).
 *  @property selectionIndexes  An array containing the index of each selected
 *                              element in the ListView.
 *  @property selectedIndex An analogue for the SELECT node's `selectedIndex`
 *                          property. This will probably go away in the next
 *                          version.
 *  
 *  @declare DC.ListView
 *  @extends DC.View
 */
DC.ListView= Class.create(DC.DashcodePart, {

    exposedBindings: ['content', 'selectionIndexes', 'selectedIndex',
                      'selectedObject'],
    
    allowsEmpty: true,
    
    /** This will be a PartList for all the items in the list. The PartList is
     *  created as part of `init` because this view class services many
     *  different tags.
     */
    _items: null,
    
    _activeItem: -1,
    
    /** Maximum rows kept cached out of the DOM when the rows decrease **/
    maximumCachedRows: 30,
                          
    /** Initialise the ListView. Based on the type of node the view has been
     *  attached to, the `_items` PartList is constructed with the appropriate
     *  child elements. Care must be taken with UL & OL nodes, because we don't
     *  want to capture nested lists.
     *  
     *  For nodes other than SELECTs, the view establishes `click` and
     *  `keydown` event handlers.
     *  
     *  Finally, it initialises its selection to an empty list.
     */
    init: function()
    {
        //  Call base init
        this.base();
    
        var view= this.viewElement();
        var container;

        switch (view.tagName)
        {
            case 'SELECT':
                this._isSelectElement= true;
                this._items= PartList('option');
                this.templateElement= document.createElement("option");
                Event.observe(view, "change",
                              this.selectedIndexChanged.bindAsEventListener(this));
                break;
                
            case 'TABLE':
                container= this.setContainer(view.tBodies[0]);
                this._items= PartList('> tbody tr');
                this.templateElement= Element.clone(this._items(0));
                break;
                
            default:
                container= this.container();
                
                var node= view.firstChild;
                while (node)
                {
                    if (1===node.nodeType)
                        break;
                    node= node.nextSibling;
                }
                //  list view is empty?
                if (!node)
                    return;

                this._items= PartList(node.nodeName);
                this.templateElement = node;
                DC.View.createViewsForNodeTree(node,null,this.__context);
                node.parentNode.removeChild(node);
                this._items().forEach(this.removeChild, this);
                this._items.removeAll();
                break;
        }

        //  Determine whether multiple selection is enabled
        if ('true'===(view.getAttribute('multiple')||'').toLowerCase())
            this.multiple= true;

        //  On the chance that the template element has an ID, strip it off
       // this.templateElement.id= "";

        //  If the template isn't a function, strip it out.
        if (this.template && 'function'!==typeof(this.template))
            delete this.template;
        //  If the template is simply a constructor, create a factory fn
        if (this.template && !(this.template.valueOf()).__factoryFn__)
            this.template= this.template();
    },

    initFromDOM: function()
    {
        var container= this.container();

        container.innerHTML= "";
        //  need to also clear the items part list, because it has the template
        //  node in it.
        if (this._items && this._items.removeAll)
            this._items.removeAll();
    },

    clonedFrom: function(originalView){
        if (originalView.templateElement) {
            this.templateElement = originalView.templateElement;
            this._items= PartList(this.templateElement.nodeName);
            this._items().forEach(this.removeChild, this);
            this._items.removeAll();
        }
    },
    
    /** Compute the indexes of selected elements. This method visits each node
     *  within the `_items` PartList to determine whether it's selected (as
     *  indicated by the value of its `selected` property).
     *
     *  @returns an array of indexes of the selected elements.
     **/
    computeSelectionIndexes: function()
    {
        var selectionIndexes= [];
        var items= this._items();
        
        function visitNode(e, index)
        {
            if (e.selected)
                selectionIndexes.push(index);
        }
        items.forEach(visitNode);
        
        //  return the array of selected indexes.
        return selectionIndexes;
    },
    
    /** Should the ListView accept being the first responder?
     */
    acceptsFirstResponder: function()
    {
        var view= this.viewElement();

        if (view.disabled || view.readOnly)
            return false;
        return true;
    },
    
    highlightSelection: function(item, highlight)
    {
        return;
    },
    
    highlightSelectionIndexes: function(newSelectionIndexes)
    {
        //  Update the DOM
        var view= this.viewElement();
        var items= this._items();
        var len= items.length;
        var i;
        var noHighlight= !!this._isSelectElement;
        var selected;
        var selectedClass= DC.Style.kSelectedClass;
        var addClass;
        var removeClass;
                
        if (this.animated)
        {
            var options = {curve: DC.easing.inOutSine, duration: 300};
            addClass = function(item, className) {
                DC.Animator.addClassName(item, className, options);
            };
            removeClass = function(item, className) {
                DC.Animator.removeClassName(item, className, options);
            };
        } else {
            addClass = Element.addClassName;
            removeClass = Element.removeClassName;
        }
        
        if (!noHighlight) {
            var oldSelectionLen = this.__selectionIndexes ? this.__selectionIndexes.length : 0;

            // un-highlight
            for (i=0; i < oldSelectionLen; i++) {
                var oldSelection = this.__selectionIndexes[i];
                
                // Skip items in new selection
                if (newSelectionIndexes.containsObject(oldSelection)) {
                    continue;
                }
                
                if (oldSelection < items.length) {
                    items[oldSelection].selected= false;

                    removeClass(items[oldSelection], selectedClass);     
                    
                    // Give the subclasses a chance to do highlighting
                    this.highlightSelection(items[oldSelection],false);
                }
            }
            // highlight
            for (i=0; i < newSelectionIndexes.length; i++) {
                var newSelection = newSelectionIndexes[i];
                              
                items[newSelection].selected= true;

                addClass(items[newSelection], selectedClass);
            
                // Give the subclasses a chance to do highlighting
                this.highlightSelection(items[newSelection],true);
            }
        }
        
        if (1===newSelectionIndexes.length)
            this.selectedIndex= view.selectedIndex= newSelectionIndexes[0];

        this.__selectionIndexes= newSelectionIndexes;
    },
    
    selectionIndexes: function()
    {
        return this.__selectionIndexes;
    },
    
    setSelectionIndexes: function(newSelectionIndexes)
    {
        var selectedIndex;
        var view= this.viewElement();
        var bindings= this.bindings;
        
        newSelectionIndexes= (newSelectionIndexes||[]).concat();

        if (String(newSelectionIndexes)===String(this.__selectionIndexes))
            newSelectionIndexes= this.__selectionIndexes;

        if (1===newSelectionIndexes.length)
            selectedIndex= this.selectedIndex= view.selectedIndex= newSelectionIndexes[0];
        else if (newSelectionIndexes.length)
            selectedIndex= view.selectedIndex= newSelectionIndexes[0];
        else
            selectedIndex= view.selectedIndex= -1;
    
        if (bindings.selectionIndexes)
            bindings.selectionIndexes.setValue(newSelectionIndexes);
        if (bindings.selectedIndex)
            bindings.selectedIndex.setValue(selectedIndex);
        if (bindings.selectedObject && bindings.content)
        {
            var selectedObject=null;
        
            if (-1!==selectedIndex)
                selectedObject= (this.__content||[])[selectedIndex];
            bindings.selectedObject.setValue(selectedObject);
        }
        //  For SELECT elements
        if (bindings.selectedValue)
        {
            var selectedValue=null;
            if (-1!==selectedIndex)
                selectedValue= view.options[selectedIndex].value;
            bindings.selectedValue.setValue(selectedValue);
        }
        
        // This is done in highlightSelectionIndexes (REMOVE ME)
        //this.__selectionIndexes= newSelectionIndexes;
        
        this.highlightSelectionIndexes(newSelectionIndexes);
    },
    
    selectedObjects: function()
    {
        var content= this.__content||[];
        return content.objectsAtIndexes(this.selectionIndexes()||[]);
    },
    
    /** Handle a keydown notification to update selection. If the view doesn't
     *  have the focus, then the view ignores key events. This event handler
     *  only processes KEY_UP (cursor up) and KEY_DOWN (cursor down) events.
     *  
     *  Keyboard selection without the shift key works according to the Mac
     *  standard (up selects the previous element or the last element in the
     *  collection if none are presently selected, down selects the next element
     *  or the first element in the collection if no elements are selected).
     *
     *  @TODO: Keyboard selection with the shift key works like Tiger but should
     *  be converted to work like Leopard.
     *  
     *  @param event    the HTML event object
     *  @returns false to indicate that this event has been handled
     **/
    onkeydown: function(event)
    {
        var view= this.viewElement();
        if (view.disabled)
            return;

        //  Only need to trap up & down arrows
        if (Event.KEY_UP != event.keyCode && Event.KEY_DOWN != event.keyCode)
            return;

        Event.stop(event);
        
        var selectionIndexes= this.selectionIndexes().sort(function(a,b){return a - b});
        var maxIndex= (this.__content||[]).length-1;
        var newIndex;
                
        if (this.multiple && event.shiftKey && selectionIndexes.length)
        {
            var topAnchor= (this.selectedIndex==selectionIndexes[0]);
            var first= selectionIndexes[0];
            var last= selectionIndexes[selectionIndexes.length-1];
            
            if (1==selectionIndexes.length)
            {
                if (Event.KEY_UP==event.keyCode)
                    newIndex= first-1;
                else
                    newIndex= first+1;
                //  index is out of range
                if (newIndex<0 || newIndex>maxIndex)
                    return;
                selectionIndexes.push(newIndex);
            }
            else if (topAnchor)
            {
                if (Event.KEY_UP==event.keyCode)
                    selectionIndexes.length--;
                else if (last<maxIndex)
                    selectionIndexes.push(newIndex= last+1);
            }
            else
            {
                if (Event.KEY_DOWN==event.keyCode)
                    selectionIndexes.splice(0, 1);
                else if (first>0)
                    selectionIndexes.push(newIndex= first-1);
            }
        }
        else if (!selectionIndexes.length)
        {
            //  no current selection
            if (Event.KEY_UP==event.keyCode)
                this.selectedIndex= maxIndex;
            else if (Event.KEY_DOWN==event.keyCode)
                this.selectedIndex= 0;
            selectionIndexes= [newIndex= this.selectedIndex];
        }
        else
        {
            if (Event.KEY_UP==event.keyCode && this.selectedIndex>0)
                this.selectedIndex--;
            else if (Event.KEY_DOWN==event.keyCode && this.selectedIndex<maxIndex)
                this.selectedIndex++;
            selectionIndexes= [newIndex= this.selectedIndex];
        }

        if (!isNaN(newIndex))
        {
            var item= this._items(newIndex);

            var scrollParent= Element.scrollParent(view);
            var scrollParentHeight= scrollParent.offsetHeight;

            var scrollTop= item.offsetTop - scrollParent.scrollTop;
            var itemHeight= item.offsetHeight;
            var container= this.container();
            
            if (item.offsetParent !== container)
                scrollTop-= container.offsetTop;

            if (scrollTop<0)
                item.scrollIntoView(true);
            else if (scrollTop+itemHeight>scrollParentHeight)
                item.scrollIntoView(false);
        }
        this.setSelectionIndexes(selectionIndexes);
        return;
    },
    
    /** Handle the change notification from SELECT elements. Update the data
     *  model with the selected index, object, and value as appropriate.
     *
     *  @param event    (ignored) the event object for this change.
     **/
    selectedIndexChanged: function(event)
    {
        //  If there's no selectionIndexes or selectionIndex binding, then there's
        //  no point in processing the selection change.
        if (!this.bindings.selectionIndexes && !this.bindings.selectedIndex &&
            !this.bindings.selectedObject && !this.bindings.selectedValue)
            return;

        var view= this.viewElement();
    
        var selectionIndexes;
        
        //  If the SELECT supports multiple selection, the only way to
        //  determine what is selected is to enumerate all the items and
        //  check their .selected property.
        if (this.multiple)
            selectionIndexes= this.computeSelectionIndexes();
        else
            selectionIndexes= [this.selectedIndex=view.selectedIndex];

        this.setSelectionIndexes(selectionIndexes);
    },

    /** Remove the selection highlight from all elements. Does not update bound
     *  selection.
     **/
    _clearSelection: function()
    {
        var view= this.viewElement();
        
        //  should we do the class select thing
        var clearHighlight= ('SELECT'!==view.tagName);
        var removeClass= Element.removeClassName;
        var selectedClassName= DC.Style.kSelectedClass;
        
        function clearSelectedFlag(e)
        {
            e.selected= false;
            if (clearHighlight)
                removeClass(e, selectedClassName);
        }
    
        var items= this._items();
        items.forEach(clearSelectedFlag);

        view.selectedIndex= -1;
    },
    
    /** Observe changes to the `selectedIndex` binding. This just calls
     *  {@link #setSelection} with the new value.
     *  
     *  @param change   the new value for the `selectedIndex` property
     */
    observeSelectedIndexChange: function(change)
    {
        var newValue= change.newValue;
        var validValue= (-1!==newValue && null!==newValue && 'undefined'!==typeof(newValue));
        var newSelection= validValue?[newValue]:[];
        
        this.setSelectionIndexes(newSelection);
    },
    
    /** Observe changes to the `selectedObject` binding. This method needs to
     *  determine the index of the object in the `content` array. If the new
     *  object doesn't exist in the content array, the selection is cleared.
     *
     *  @param change   the new value for the `selectedObject` property
     */
    observeSelectedObjectChange: function(change)
    {
        var newValue= change.newValue;
        var content= this.__content||[];
        var index= content.indexOf(newValue);
        var selection= (-1===index?[]:[index]);
        this.setSelectionIndexes(selection);
    },
    
    /** Observe changes to the `selectionIndexes` binding. This method merely
     *  passes along the value to the {@link #setSelection} method.
     *  
     *  @param change   the new value for the `selectionIndexes` property.
     */
    observeSelectionIndexesChange: function(change)
    {
        var newSelection= change.newValue || [];
        this.setSelectionIndexes(newSelection);
    },
    
    _updateDomWithContent: function(content)
    {
        var rebind= DC.View.rebindNodeTreeWithRelativeSource;
        var unbind= DC.View.unbindNodeTree;
        
        var selectedObjects= this.selectedObjects();
        var selectionIndexes= [];
        
        var contentLength= content.length;
        var items= this._items();
        var numberOfItems= items.length;
        var numberToReuse= Math.min(numberOfItems, contentLength);
        
        var i=0;
        var obj;
        var e;
        var oldObj;
        var v;
        
        while (i<numberToReuse)
        {
            obj= content[i];
            if (-1!==selectedObjects.indexOf(obj))
                selectionIndexes.push(i);
            e= items[i];
            oldObj= e.objectValue;
            e.objectValue= obj;
            if ('undefined'===typeof(oldObj))
                this.setupElement(e, e.objectValue);
            else
                rebind(e, oldObj, obj);
            v= DC.View.fromNode(e);

            if (!v || !v.bindings.visible)
                e.style.display='';
            
            // Note that this row is being used
            this.elementUsedForIndex(e, i);

            ++i;
        }
        
        if (i<contentLength)
        {
            var container= this.container();
            var frag= document.createDocumentFragment();
            
            while (i<contentLength)
            {
                obj= content[i];
                if (-1!==selectedObjects.indexOf(obj))
                    selectionIndexes.push(i);
                e= this.createElement(obj, null, frag, i);
                this._items.add(e);
                                
                ++i;
            }

            container.appendChild(frag);
        }
        else
        {
            while (i<numberOfItems)
            {
                e= items[i];
                if (i > this.maximumCachedRows) {
                    this.removeChild(items[i]);
                } else {
                    unbind(e);
                    e.objectValue=null;
                    e.style.display='none';
                    this.elementUsedForIndex(e,-1);
                }
                ++i;
            }
            
            // Delete rows that are beyond our cache
            if (numberOfItems > this.maximumCachedRows) {
                this._items.refresh();
            }
        }

        this.highlightSelectionIndexes(selectionIndexes);
    },
    
    /** Observe changes for the ListView's `content`. This method is smart
     *  enough to handle insertion, deletion and replacement as well as simple
     *  setting of the content. The view attempts to keep the selection static
     *  by mapping the originally selected objects onto the new content. As a
     *  result, this method often updates the selection bindings.
     *  
     *  @TODO: this is one of the few places where a view does not initialise
     *  the data model based on the DOM.
     *  
     *  @param change   The change notification containing updates to the
     *                  content.
     */
    observeContentChange: function(change)
    {
        var container= this.container();
        var view= this.viewElement();
        var self = this;
        var index;
        var beforeNode;
        var e;
        var items = this._items();
        var len;
        var selectionIndexes= [];
        
        var rebind= DC.View.rebindNodeTreeWithRelativeSource;
        var unbind= DC.View.unbindNodeTree;
        var originalFirst = items[0];
        var originalLastIndex = this.__content ? this.__content.length-1 : 0;
        
        function rebindNode(e, newObject, index)
        {
            var oldObject= e.objectValue;
            e.objectValue= newObject;
            rebind(e, oldObject, newObject);
            e.style.display='';
            self.elementUsedForIndex(e,index);
        }
        
        switch (change.changeType)
        {
            case DC.ChangeType.setting:

                this.__content= change.newValue||[];
                this._updateDomWithContent(this.__content);
                break;

            case DC.ChangeType.insertion: 
                // Adjust the last index, as it already includes the change
                originalLastIndex -= change.indexes.length;
                
                //  add the specific indexes.
                for (index=0; index<change.indexes.length; ++index)
                {
                    beforeNode= this._items(change.indexes[index]);
                    if (beforeNode && 'none'===beforeNode.style.display)
                    {
                        e= beforeNode;
                        rebindNode(beforeNode, change.newValue[index], change.indexes[index]);
                    }
                    else
                    {
                        e= this.createElement(change.newValue[index], beforeNode, null, change.indexes[index]);
                        this._items.insertPartAtIndex(e, change.indexes[index]);
                    }
                    if (this.animated)
                    {
                        Element.addClassName(e, DC.Style.kInsertedClass);
                        DC.Animator.removeClassName(e, DC.Style.kInsertedClass, {
                                                            discreteTransitionPoint: 1,
                                                            duration: this.updateAnimationDuration
                                                        });
                    }
                }                
            break;
            case DC.ChangeType.replacement:
                //  set the specific indexes.
                function _replaceNode(e)
                {
                    rebindNode(e, e.newObjectValue);
                    e.newObjectValue= null;
                    DC.Animator.removeClassName(e, DC.Style.kReplacingClass, {
                                                        duration: 250,
                                                        discreteTransitionPoint: 1
                                                    });
                }
                
                for (index=0; index<change.indexes.length; ++index)
                {
                    e= this._items(change.indexes[index]);
                    if (!this.animated)
                        rebindNode(e, change.newValue[index], change.indexes[index]);
                    else
                    {
                        e.newObjectValue= change.newValue[index];
                        DC.Animator.addClassName(e, DC.Style.kReplacingClass, {
                                                            duration: this.updateAnimationDuration,
                                                            discreteTransitionPoint: 0,
                                                            callback: _replaceNode.bind(this)
                                                        });
                    }
                }
                break;
        
            case DC.ChangeType.deletion:
                // Adjust the last index, as it already includes the change
                originalLastIndex += change.indexes.length;

                //  Remove entries.
                selectionIndexes= this.selectionIndexes();

                for (index= change.indexes.length-1; index>=0; --index)
                {
                    var nodeIndex= change.indexes[index];
                    selectionIndexes.removeObject(nodeIndex);
                    e= this._items(nodeIndex);
                    this._items.removePartAtIndex(nodeIndex);
                    if (!this.animated)
                        this.removeChild(e);
                    else
                    {
                        DC.Animator.addClassName(e, DC.Style.kDeletedClass, {
                                                            duration: this.updateAnimationDuration,
                                                            discreteTransitionPoint: 0,
                                                            callback: this.removeChild.bind(this)
                                                        });
                    }
                }
            
                this.setSelectionIndexes(selectionIndexes);
                break;
            
            default:
                console.log( "Unknown change type: " + change.changeType );
                break;
        }
        
        if (this.__content && this.__content.length) {
            if (items[0] != originalFirst) {
                Element.addClassName(items[0], DC.Style.kFirstClass);
                Element.removeClassName(originalFirst, DC.Style.kFirstClass);
            }
            
            if (originalLastIndex != (this.__content.length-1)) {    
                Element.addClassName(items[this.__content.length-1], DC.Style.kLastClass);
                if (originalLastIndex < items.length) {
                    Element.removeClassName(items[originalLastIndex], DC.Style.kLastClass);            
                }
            }
        } else {
            if (items.length) {
                Element.removeClassName(originalFirst, DC.Style.kFirstClass);
                if (originalLastIndex < items.length) {
                    Element.removeClassName(originalFirst, DC.Style.kLastClass);
                }
            }
        }
        
        //  Given the changed content, the displayValues binding should probably
        //  requery for the correct values.
        if (this.bindings.displayValues)
            this.bindings.displayValues.update();
        if (this.bindings.contentValues)
            this.bindings.contentValues.update();
    },

    setupElement: function(e, relativeSource)
    {
        e.objectValue= relativeSource;
        if (this.template)
        {
            var oldDataModel= DC.dataModel;
            var view;
            
            DC.dataModel= this.__context;
            this.template.call(this, e, relativeSource);
            //  restore original data model
            DC.dataModel= oldDataModel;
        }
        else
            DC.View.createViewsForNodeTree(e, relativeSource, this.__context);
        return e;
    },
    
    /** Helper method to create a new template element. This will clone the
     *  template and insert it in the correct location. It also sets up the
     *  objectValue and calls setupNode to bind the node to the relativeSource.
     *  
     *  @param relativeSource   an object which should be used when resolving
     *                          keypaths that begin with *.
     *  @param beforeNode       the new node will be inserted before this node
     *  @param container        [optional] if specified, the new node will be
     *                          inserted in this container rather than the
     *                          view's container. This is used to add new
     *                          nodes to a document fragment to speed up DOM
     *                          manipulation.
     *  @returns the new node
     */
    createElement: function(relativeSource, beforeNode, container, forIndex)
    {
        if(!this.templateElement) {
            console.log("No template row");
            return;
        }

        var view= this.viewElement();
        var e = null;    
        var node = null;

        container= container || this.container();

		if (this.template){
			node = Element.clone(this.templateElement);
            if (beforeNode) {
                e = container.insertBefore(node, beforeNode);
            } else {
                e = container.appendChild(node);
            }
            e = this.setupElement(e, relativeSource);
		} else {
			node = DC.View.cloneViewsForTreeNode(this.templateElement,relativeSource,this.__context);			
                          
          if (!beforeNode) {
            var elements = container.children;
            var lastChild = null;
            
            if (elements && elements.length) {
                lastChild = elements[elements.length-1];
            }
          
            if (lastChild)
                beforeNode = lastChild.nextSibling;
          }
          
          if (beforeNode) {
            e = container.insertBefore(node, beforeNode);        
          } else {
            e = container.appendChild(node);
          }
          
          e.objectValue = relativeSource;
		}

        this.elementUsedForIndex(e, forIndex);
        
        return e;
    },
        
    /** Helper method, primarily used in subclasses, to notify a the list when
     *  a element is being re-used or being put into the cache (index = -1). 
     *  Subclasses should use this method to do any work that is specific to 
     *  the implementation for when a row is added
     *  
     *  @param row              The element representing the "row"
     *  @param index            Index the "row" will be in the list.  -1 means
     *                          it is being placed offscreen in the cache.
     */
    elementUsedForIndex: function(row, index)
    {
        return;
    },

    ontouchstart: function(event) {
        // get the row now instead of mouse down because it will be called after a delay.
        var e = event.target||event.srcElement;
        var container= this.container();
        while (e && e.parentNode!=container)
            e = e.parentNode;

        if (e != container)
            this._touchedRow = e;
        else
            this._touchedRow = null;
    }, 
    
    onmousedown: function(event)
    {
        var view= this.viewElement();
        if (view.disabled)
            return;
            
        if ('SELECT'===view.tagName)
        {
            this.base(event);
            return;
        }
        
        var e = null;
        if (DC.Support.Touches && this._touchedRow) {
            e = this._touchedRow;
        } else {
            e = event.target||event.srcElement;
        }

        var container= this.container();
        var items= this._items();

        if (e==container)
            return;
        
        while (e && e.parentNode!=container)
            e= e.parentNode;

        if (e==container)
            return;
        
        this._activeItem= items.indexOf(e);    
        Element.addClassName(e, DC.Style.kActiveClass);
    },

    onmouseup: function(event)
    {
        var view= this.viewElement();
        if (view.disabled)
            return;
            
        if (-1!==this._activeItem)
            Element.removeClassName(this._items(this._activeItem), DC.Style.kActiveClass);
        this._activeItem= -1;
    },

    ontouchmove: function(event)
    {
        var view= this.viewElement();
        if (view.disabled)
            return;
            
        if (-1!==this._activeItem)
            Element.removeClassName(this._items(this._activeItem), DC.Style.kActiveClass);
        this._activeItem= -1;
        this.base(event);
    },
    
    /** Handle click events for items within the view. This supports multiple
     *  and discontiguous selection.
     */
    onclick: function(event)
    {
        var view= this.viewElement();
        
        //  When the ListView is disabled, pass the click event up the Responder
        //  chain to see if anyone up above would like to handle it.
        if (view.disabled)
        {
            this.base(event);
            Event.stop(event);
            
            return;
        }
        
        if ('SELECT'===view.tagName)
        {
            this.base(event);
            return;
        }
        
        var e= event.target||event.srcElement;
        var selectedIndex=-1;
        var selectedObject=null;
        var container= this.container();
        var items= this._items();
        
        if (e==container)
            return;
            
        while (e && e.parentNode!=container)
            e= e.parentNode;

        if (e)
        {
            selectedIndex= items.indexOf(e);
            selectedObject= e.objectValue;
        }
    
        var selectionIndexes;
    
        if (!this.multiple){
            if ((event.ctrlKey || event.metaKey) && this.allowsEmpty)
            {
                selectionIndexes = this.selectionIndexes();
                if (-1 != selectionIndexes.indexOf(selectedIndex)) {
                    selectedIndex = -1;
                }
            }
            
            if (selectedIndex != -1) {
                selectionIndexes = [selectedIndex];
            } else {
                selectionIndexes = [];
            }
            
            this.setSelectionIndexes( selectionIndexes );  
        }
        else
        {
            selectionIndexes= this.selectionIndexes().slice();

            if (event.shiftKey)
            {
                var newSelection = [];
                
                if (this.selectedIndex > selectedIndex) 
                    newSelection = IndexRange(selectedIndex,this.selectedIndex);
                else
                    newSelection = IndexRange(this.selectedIndex,selectedIndex);
                
                this.setSelectionIndexes(newSelection);
            }
            else if (event.ctrlKey || event.metaKey)
            {
                var index= selectionIndexes.indexOf(selectedIndex);
                
                //  do discontiguous selection
                if (-1===index)
                {
                    this.selectedIndex= selectedIndex;
                    selectionIndexes.push(selectedIndex);
                }
                else if (this.allowsEmpty || (selectionIndexes.length > 1))
                {
                    selectionIndexes.splice(index, 1);
                }
        
                this.setSelectionIndexes(selectionIndexes);
            }
            else
            {
                this.selectedIndex= selectedIndex;
                this.setSelectionIndexes([selectedIndex]);
            }
        }
            
        //  don't let anchors display the wacky dotted border (MSIE only?)
        if (e && 'A'==e.tagName)
            e.blur();
            
        //  Send the action to let the target know a selection was made
        this.sendAction();
    }

});
