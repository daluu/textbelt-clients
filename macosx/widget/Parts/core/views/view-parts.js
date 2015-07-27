/*jsl:import view-core.js*/

/** A declarative part of a View. This is used to declare a method on a
 *  View which will return an array of elements matching the part specifier.
 *  Part specifiers use a limited CSS query style: [tag name].[class name]
 *  
 *  @namespace
 **/
DC.PartFinder= (function(){

    function makePartFinder(partIds, nodes)
    {
        var len= partIds.length;
        var cache= Array.from(nodes);
        
        function removeAll()
        {
            partIds= [];
            cache= null;
            len= 0;
        }
        function removePartAtIndex(index)
        {
            partIds.splice(index, 1);
            if (cache)
                cache.splice(index, 1);
            len= partIds.length;
        }
        function removePart(part)
        {
            var id= Element.assignId(part);
            var partIndex= partIds.indexOf(id);
            if (-1==partIndex)
                return;
            partIds.splice(partIndex, 1);
            if (cache)
                cache.splice(partIndex, 1);
            len= partIds.length;
        }
        function insertPartAtIndex(part, index)
        {
            var newId= Element.assignId(part);
            partIds.splice(index, 0, newId);
            if (cache)
                cache.splice(index, 0, part);
            len= partIds.length;
        }
        function add(part)
        {
            partIds.push(Element.assignId(part));
            len= partIds.length;
            if (cache)
                cache.push(part);
        }
        function clearCache()
        {
            cache= null;
        }
        
        function refresh()
        {
            var newIds= [];
            var part;
            
            for (var i=0; i<len; ++i)
            {
                part= document.getElementById(partIds[i]);
                if (!part)
                    continue;
                newIds.push(partIds[i]);
            }
            
            partIds= newIds;
            len= newIds.length;
            cache= null;
        }
        
        function partFinder(partIndex)
        {
            if (cache)
            {
                if (1==arguments.length)
                    return cache[partIndex];
                return cache;
            }
            
            if (1==arguments.length)
                return document.getElementById(partIds[partIndex]);
                
            var result=[];
            for (var i=0; i<len; ++i)
                result[i]= document.getElementById(partIds[i]);
            
            //  setup the cache and the timeout to clear the cache    
            cache= result;
            window.setTimeout(clearCache, 250);
            
            return result;
        }
        
        if (nodes)
            window.setTimeout(clearCache, 250);
            
        partFinder.removePartAtIndex= removePartAtIndex;
        partFinder.removePart= removePart;
        partFinder.insertPartAtIndex= insertPartAtIndex;
        partFinder.add= add;
        partFinder.removeAll= removeAll;
        partFinder.refresh= refresh;
        return partFinder;
    }
    
    function makeSinglePartFinder(partId, node)
    {
        var cache= node;
        
        function clearCache()
        {
            cache= null;
        }
        
        function singlePartFinder()
        {
            if (cache)
                return cache;
            
            cache= document.getElementById(partId);
            window.setTimeout(clearCache, 250);
            return cache;    
        }
        return singlePartFinder;
    }
    
    function findNodesMatchingSpec(view, partSpec)
    {
        var nodes= Element.queryAll(view, partSpec);
        var ids= Array.map(nodes, Element.assignId);

        //  Now nodes contains all the elements that match the part spec and
        //  ids contains all the matching elements IDs.
        return {
            nodes: nodes,
            ids: ids
        };
    }
    
    /** @scope DC.PartFinder **/
    return {
        //  A function that resolves into a query function the first time it's
        //  called.
        singlePart: function(partSpec, view)
        {
            function one()
            {
                var _view = view;
                var viewType= typeof(_view);
                
                if ('function'===viewType)
                    _view= _view();
                else if ('string'===viewType)
                    _view= document.getElementById(_view);
                else if (!_view)
                    _view= this.viewElement();
                    
                var match= findNodesMatchingSpec(_view, partSpec);
                var finder= makeSinglePartFinder(match.ids[0], match.nodes[0]);

                var propName= Class.findPropertyName(this, arguments.callee);
                if (propName)
                    this[propName]= finder;
                
                return match.nodes[0];
            }
            return one;
        },
        
        multipleParts: function(partSpec, view)
        {
            function many(index)
            {
                var _view = view;
                var viewType= typeof(_view);
                
                if ('function'===viewType)
                    _view= _view();
                else if ('string'===viewType)
                    _view= document.getElementById(_view);
                else if (!_view)
                    _view= this.viewElement();

                var match= findNodesMatchingSpec(_view, partSpec);
                var finder= makePartFinder(match.ids, match.nodes);
                
                var propName= Class.findPropertyName(this, arguments.callee);
                if (propName)
                    this[propName]= finder;

                if (arguments.length)
                    return match.nodes[index];
                else
                    return Array.from(match.nodes);
            }
            return many;
        }
    };
    
})();

/** @class
 *  Create a function which will retrieve a single DOM node within a view that
 *  matches a simplified CSS query. This is used as a declarative element in a
 *  new class definition:
 *  
 *      MyClass= Class.create(DC.View, {
 *          openButton: Part('button.open'),
 *          closeButton: Part('button.close'),
 *          ...
 *      });
 *  
 *  The previous example defines a view with two parts: `openButton` and
 *  `closeButton`. These parts might be used in the `init` method as follows:
 *  
 *          init: function()
 *          {
 *              this.openButton().disabled= false;
 *              this.closeButton().disabled= true;
 *          }
 *  
 *  To retrieve a reference to the DOM node associated with the part, you must
 *  invoke the part as if it were a function (which it is).
 *  
 *  @param partSpec The simplified CSS reference which specifies the part.
 **/
var Part= DC.PartFinder.singlePart;

/** @class
 *  Create a function which will retrieve an array of DOM nodes within a view
 *  matching a simplified CSS query. This is typically used as a declarative
 *  element in a class definition:
 *  
 *      MyClass= Class.create(DC.View, {
 *          links: PartList('a.link'),
 *          ...
 *      });
 *  
 *  In the previous example, the view declares a PartList that matches any
 *  anchor with the class `link`. Your code may invoke the PartList with no
 *  arguments to retrieve all DOM nodes or with a single index to retrieve a
 *  single DOM node.
 *  
 *      init: function()
 *      {
 *          this.links().forEach(function(e) { e.style.display='none'; });
 *          this.links(0).style.display='block';
 *      }
 *  
 *  This example first retrieves the array of all link nodes and sets their
 *  display attribute to `none`. Then it retrieves the first link node and sets
 *  its display attribute to `block`. This is a contrived example of course.
 *  
 *      init: function()
 *      {
 *          var view= this.viewElement();
 *          this.links.add(view.appendChild(document.createElement('a')));
 *      }
 *  
 *  The example above creates a new anchor element and appends it to the view
 *  and also adds it to the links PartList.
 *  
 *  @param partSpec The simplified CSS reference specifying the matching parts
 */
var PartList= DC.PartFinder.multipleParts;

/** Remove a node from the PartList. This does not remove the node from the DOM.
 *  @name PartList.prototype.removePartAtIndex
 *  @function
 *  @param index    the index of the node to remove from the PartList
 */

/** Remove all nodes from the PartList. This does not remove any nodes from the
 *  DOM.
 *  @name PartList.prototype.removeAll
 *  @function
 */

/** Insert a new node into the PartList at a specific index. This does not
 *  modify the DOM at all.
 *  @name PartList.prototype.insertPartAtIndex
 *  @function
 *  @param part a reference to the DOM node to insert into the PartList.
 *  @param index    the index at which to insert the new node
 */

/** Remove a specific node from the PartList. This does not remove the node from
 *  the DOM.
 *  @name PartList.prototype.removePart
 *  @function
 *  @param part a reference to the DOM node to remove from the PartList.
 */

/** Add a new node to the end of the PartList. This does not modify the DOM.
 *  @name PartList.prototype.add
 *  @function
 *  @param part a reference to the new DOM node to add to the PartList.
 */