/*jsl:import ../core/startup.js*/

//  Trick picked up from Prototype to get around IE8's fixed Element & Event
(function() {
  var element = this.Element;
  this.Element = {};
  Object.extend(this.Element, element || {});
}).call(window);

/*jsl:declare Element*/

/**
 *  @scope Element
 */
Object.extend(Element, {

    uniqueId: function()
    {
        return 'DC_id_' + Element.assignId.uniqueId++;
    },
    
    /** Make certain an element has an ID. If it doesn't have one, assign an
        unique ID to it.
        
        @returns the element's ID
     **/
    assignId: function(element)
    {
        return element.id ||
               (element.id=('DC_id_' + Element.assignId.uniqueId++));
    },

    /** Create a regular expression that will match a particular class name
     **/
    regexForClassName: function(className)
    {
        var fn= arguments.callee;
        if (!fn._lookup)
            fn._lookup= {};
        if (className in fn._lookup)
            return fn._lookup[className];
            
        return (fn._lookup[className]=new RegExp("(^|\\s)" + className + "(\\s|$)"));
    },
    
    /** Determine whether an element has the specified class name
     **/
    hasClassName: function(element, className)
    {
        var elementClassName = element.className;
        if (!elementClassName)
            return false;
        if (elementClassName==className)
            return true;
        
        return Element.regexForClassName(className).test(elementClassName);
    },

    /** Add the specified class name to the element.
     **/
    addClassName: function(element, className)
    {
        if (!className)
            return;
            
        if (Element.hasClassName(element, className))
            return;
        element.className += ' ' + className;
    },

    /** Remove the specified class name from the element.
     **/
    removeClassName: function(element, className)
    {
        if (!element || !className)
            return;
            
        var regex= Element.regexForClassName(className);
        element.className= element.className.replace(regex, ' ').trim();
    },
    
    /** Remove the specified class name from the element.
     **/
    replaceClassName: function(element, className, newClassName)
    {
        if (!className)
            return;
            
        if (!newClassName) {
            Element.removeClassName(element, className);
            return;
        }
            
        var regex= Element.regexForClassName(className);
        element.className= element.className.replace(regex, '$1'+newClassName+'$2').trim();
    },
    
    /** If the element has the class name, remove it, otherwise add it.
     **/
    toggleClassName: function(element, className)
    {
        if (!className)
            return;
            
        var regex= Element.regexForClassName(className);
        var elementClassName= element.className;
        
        if (regex.test(elementClassName))
            element.className= elementClassName.replace(regex, ' ').trim();
        else
            element.className+= ' ' + className;
    },
    
    /** Add and remove classes to/from an element. This preserves existing classes
        and only adds the class if it doesn't already exist and only removes classes
        that do exist.
    
        @param addClasses       either a single class name or an array of classes to
                                add to the element
        @param removeClasses    either a single class name or an array of classes to
                                remove from the element
        @param element          the element to modify
     **/
    updateClass: function(element, classesToAdd, classesToRemove)
    {
        var classes= $S(element.className.split(' '));
        var add= Set.add;
        var remove= Set.remove;
        
        var i;
        var len;
        
        if ('string'===typeof(classesToAdd))
            add(classes, classesToAdd);
        else
            for (i=0, len=classesToAdd.length; i<len; ++i)
                add(classes, classesToAdd[i]);
                
        if ('string'===typeof(classesToRemove))
            remove(classes, classesToRemove);
        else
            for (i=0, len=classesToRemove.length; i<len; ++i)
                remove(classes, classesToRemove[i]);
                
        element.className= Set.join(classes, ' ');
    },

    /** The list of CSS properties that will be returned from getStyles when the
        propsToGet parameter is missing.
     **/
    PROPERTIES: ['backgroundColor', 'backgroundPosition', 'borderTopColor', 
                 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 
                 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 
                 'borderLeftWidth', 'color', 'display', 'fontSize', 'letterSpacing', 
                 'lineHeight', 'opacity', 'width', 'height', 'top', 'bottom', 
                 'left', 'right', 'marginTop', 'marginRight', 'marginBottom', 
                 'marginLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
    
    /** Retrieve the styles for an element.
        @param element  the DOM node for which to fetch styles
        @param [propsToGet] an array of the properties to fetch, if not
               specified, the value of Element.PROPERTIES is used.
     **/
    getStyles: function(element, propsToGet)
    {
        var styles = {};
        var computedStyle= window.getComputedStyle(element, null);

        if ('string'===typeof(propsToGet))
            return element.style[propsToGet]||computedStyle[propsToGet]||null;
        
        propsToGet= propsToGet||Element.PROPERTIES;
    
        var p;
        var len= propsToGet.length;

        for (var i=0; i<len; ++i)
        {
            p= propsToGet[i];
            styles[p]= element.style[p]||computedStyle[p]||null;
        }
    
        return styles;
    },

    setStyle: function(element, style, value)
    {
        element.style[style]= value;
    },
    
    setStyles: function(element, styles)
    {
        var elementStyle= element.style;
        for (var p in styles)
            elementStyle[p]= styles[p];
    },
    
    getDimensions: function(node)
    {
        var display = Element.getStyle(node, 'display');
        if (display && display != 'none') // Safari bug
            return {
                left: node.offsetLeft,
                top: node.offsetTop,
                width: node.offsetWidth,
                height: node.offsetHeight
            };

        // All *Width and *Height properties give 0 on elements with display none,
        // so enable the element temporarily
        var els = node.style;
        var originalVisibility = els.visibility;
        var originalPosition = els.position;
        var originalDisplay = els.display;
        els.visibility = 'hidden';
        els.position = 'absolute';
        els.display = 'block';
        var dimensions = {
            width: node.offsetWidth,
            height: node.offsetHeight,
            left: node.offsetLeft,
            top: node.offsetTop
        };
        els.display = originalDisplay;
        els.position = originalPosition;
        els.visibility = originalVisibility;
        return dimensions;
    },
    
    set3PiecesBorderImage : function(element, url, leftWidth, rightWidth){
        if (DC.Support.BorderImage) {            
            // Set the border-image
            element.style.borderWidth = url ? '0px ' + rightWidth + 'px 0px ' + leftWidth + 'px ' : '0px';
            var value = url ? "url(" + url + ") 0 " + rightWidth + " 0 " + leftWidth + " repeat stretch" : '';
            element.style.webkitBorderImage = value;
            element.style.MozBorderImage = value;
        
        } else {
            if(!url){
                element.innerHTML = ""; //remove all children.
                return;
            }

            // Generate 3 div with a background-image
            var mPart = document.createElement('div');
            var middleStyle = mPart.style;
            middleStyle.position = 'absolute';
            middleStyle.top = '0px';
            middleStyle.bottom = '0px';

            var cont = mPart.cloneNode(false);
            cont.style.left = "0px";
            cont.style.right = "0px";
            
            var lPart = mPart.cloneNode(false);
            var leftStyle = lPart.style;          
            leftStyle.backgroundImage = 'url(' + url + ')';
            leftStyle.backgroundRepeat = 'no-repeat';
            
            
            var rPart = lPart.cloneNode(false);
            var rightStyle = rPart.style;
            leftStyle.left = '0px';
            leftStyle.width = leftWidth + 'px';
            
            rightStyle.right = '0px'
            rightStyle.width = rightWidth + 'px';
            rightStyle.backgroundPosition = '100% 0px'; //Image sticks to the right side.
            
            middleStyle.left = leftWidth + 'px';
            middleStyle.right = rightWidth + 'px';
            middleStyle.backgroundImage = 'url(' + url.replace(/.png/, '__mid.png') + ')';
            middleStyle.backgroundRepeat = 'repeat-x';

        	// Insert left, middle and right parts.
            if (element.firstChild)
                element.insertBefore(cont, element.firstChild);
            else
                element.appendChild(cont);
        	cont.appendChild(lPart)
        	cont.appendChild(mPart)
        	cont.appendChild(rPart);
        }
    },
    
    /** IE has problems with cloneNode, so a wrapper is necessary.
     */
    clone: function(node)
    {
        return node.cloneNode(true);
    },
    
    /** Visit all elements in the node tree rooted at e in depth first order. If
        the visitor function returns false (and exactly false, not a false-y
        value like null or undefined), the traversal will abort.
    
        @param e    the DOM node tree root element
        @param visitor  a function to call for each element
        @param scope    the scope to use for the visitor function
     **/
    depthFirstTraversal: function(node, visitor, scope)
    {
        if (!node || !visitor)
            return;
        var end= node.nextSibling||node.parentNode;
        var visitChildren;
        
        scope= scope||visitor;

        while (node!==end)
        {
            if (1===node.nodeType)
            {
                visitChildren= visitor.call(scope, node);
                
                if (false!==visitChildren && node.firstChild)
                {
                    node= node.firstChild;
                    continue;
                }
            }
            
            while (!node.nextSibling)
            {
                node= node.parentNode;
                if (node===end)
                    return;
            }
            
            node= node.nextSibling;
        }
    },
    
    /** Wrapper method for querySelector. This wrapper enables using a helper
        library for browsers that don't support the W3C query API.
        
        @param node the root node from which to begin the query
        @param selector a CSS selector to find
        @returns one node that matches the selector or null
     **/
    query: function(node, selector)
    {
        if (1==arguments.length) {
            selector = node;
            node = document;
        } else if (node != document) {
            selector = '#'+Element.assignId(node)+' '+selector;
        }
        return node.querySelector(selector);
    },
    
    /** Wrapper method for querySelectorAll. This wrapper enables using a helper
        library for browsers that don't support the W3C query API.
        
        @param node the root node from which to begin the query
        @param selector a CSS selector to find
        @returns a list of nodes that match the selector (may be empty)
     **/
    queryAll: function(node, selector)
    {
        if (1==arguments.length) {
            selector = node;
            node = document;
        } else if (node != document) {
            selector = '#'+Element.assignId(node)+' '+selector;
        }
        return Array.from(node.querySelectorAll(selector));
    },
    
    /** Determine whether the node matches a specific selector.
    
        @param node
        @param selector
        @returns true if the node matches the selector or false if not
     **/
    match: function(node, selector)
    {
        return Sizzle.matches(selector, [node]).length==1;
    },
    
    getViewport: function()
    {
        var docElement= document.documentElement;
        var body= document.body;
        
        return {
            left: window.scrollLeft||docElement.scrollLeft||body.scrollLeft,
            top: window.scrollTop||docElement.scrollTop||body.scrollTop,
            width: window.innerWidth||docElement.clientWidth||body.clientWidth,
            height: window.innerHeight|docElement.clientHeight||body.clientHeight
        };
    },
    
    /** Determine the parentNode that controls scrolling.
        @param e    the element that is scrolled
        @returns a node that has overflow set to scroll or auto with a height.
     */
    scrollParent: function(node)
    {
        var styles;
        var getStyles= Element.getStyles;
        var body= document.body;
        
        while (node && node!=body)
        {
            styles= getStyles(node, ['overflow', 'overflowX', 'overflowY']);
            for(var styleKey in styles){
                var style = styles[styleKey];
                
                if ('auto' == style || 'scroll' == style) {
                    return node;
                }
            }
            node= node.parentNode;
        }
        
        return node;
    },
    
    /** Determine the client rectangle of an element.
    
        @param node the node to find
        @param [relativeToViewport] optional boolean value. When true, position is 
               relative to the viewport instead of the page
        @returns an object with top, left, bottom, right, width, and height
                 properties containing the px-based values for the node.
     **/
    getRect: function(node, relativeToViewport)
    {
        if (!node)
            return null;

        var docElement= document.documentElement;
        var body= document.body;

    	var left= 0;
    	var top = 0;
        
        if (node!=document.body && node.getBoundingClientRect)
        {
            var box= node.getBoundingClientRect();
            //  values of box are read only...
            box= {
                left: box.left,
                right: box.right,
                top: box.top,
                bottom: box.bottom
            };
            
            if (!!relativeToViewport===false) {
                box.left+= Math.max(docElement.scrollLeft, body.scrollLeft);
                box.right+= Math.max(docElement.scrollLeft, body.scrollLeft);
                box.top+= Math.max(docElement.scrollTop, body.scrollTop);
                box.bottom+= Math.max(docElement.scrollTop, body.scrollTop);
            }
                                     
			// IE adds the HTML element's border, by default it is medium which is 2px
			// IE 6 and 7 quirks mode the border width is overwritable by the following css html { border: 0; }
			// IE 7 standards mode, the border is always 2px
			// This border/offset is typically represented by the clientLeft and clientTop properties
			// However, in IE6 and 7 quirks mode the clientLeft and clientTop properties are not updated when overwriting it via CSS
			// Therefore this method will be off by 2px in IE while in quirksmode
            box.left-= docElement.clientLeft;
            box.right-= docElement.clientLeft;
            box.top-= docElement.clientTop;
            box.bottom-= docElement.clientTop;
            
            box.width= box.right-box.left+1;
            box.height= box.bottom-box.top+1;
            return box;
        }
        
        var parent= node.parentNode;
        var offsetChild= node;
        var offsetParent= node.offsetParent;
        var mozilla= DC.Browser.Mozilla;
        var safariOtherThan2= DC.Browser.Safari && !DC.Browser.Safari2;
        var safari2= DC.Browser.Safari2;
        var getStyles= Element.getStyles;
        var dimensions= Element.getDimensions(node);
        
        var fixed= ('fixed'===Element.getStyles(node, 'position'));
        var styles;
        
        left+= node.offsetLeft;
        top+= node.offsetTop;
       
        //  Find the cumulative offsets
        while (!fixed && offsetParent)
        {
            left+= offsetParent.offsetLeft;
            top+= offsetParent.offsetTop;


			// Mozilla and Safari > 2 does not include the border on offset parents
			// However Mozilla adds the border for table or table cells
			if (mozilla && !((/^t(able|d|h)$/i).test(offsetParent.tagName)) || safariOtherThan2)
			{
			    styles= getStyles(offsetParent, ['borderLeftWidth', 'borderTopWidth']);
			    left+= parseInt(styles.borderLeftWidth||0, 10);
			    top+= parseInt(styles.borderTopWidth||0, 10);
            }
            
            if (!fixed)
                fixed= ('fixed'===getStyles(offsetParent, 'position'));
                
            if ('BODY'!==offsetParent.tagName)
                offsetChild= offsetParent;
            offsetParent= offsetParent.offsetParent;
        }
        
        //  Find the cumulative scroll offsets
        var stylesToGet= mozilla?['display', 'overflow', 'borderLeftWidth', 'borderTopWidth']:['display'];
        
        while (parent && parent.tagName && 'BODY'!==parent.tagName && 'HTML'!==parent.tagName)
        {
            styles= getStyles(parent, stylesToGet);
            
			//  Remove parent scroll UNLESS that parent is inline or a table to work around Opera inline/table scrollLeft/Top bug
			if (!((/^inline|table.*$/i).test(styles.display)))
			{
				// Subtract parent scroll offsets
				left-= parent.scrollLeft;
				top-= parent.scrollTop;
			}

			//  Mozilla does not add the border for a parent that has overflow != visible
			if (mozilla && "visible"!=styles.overflow)
			{
			    left+= parseInt(styles.borderLeftWidth||0, 10);
			    top+= parseInt(styles.borderTopWidth||0, 10);
            }
            
			// Get next parent
			parent = parent.parentNode;
        }
        
		//  Safari <= 2 doubles body offsets with a fixed position element/offsetParent or absolutely positioned offsetChild
		//  Mozilla doubles body offsets with a non-absolutely positioned offsetChild
		var position= getStyles(offsetChild, 'position');
		
		if ((safari2 && (fixed || position=="absolute")) ||
			(mozilla && position!="absolute"))
		{
		    left-= body.offsetLeft;
		    top-= body.offsetTop;
		}
		
		//  Add the document scroll offsets if position is fixed
		if (relativeToViewport===true && !fixed) {
		    left -= Math.max(docElement.scrollLeft, body.scrollLeft);
		    top -= Math.max(docElement.scrollTop, body.scrollTop);
		}
		
		return {
		    left: left,
		    top: top,
		    right: left + dimensions.width-1,
		    bottom: top + dimensions.height-1,
		    width: dimensions.width,
		    height: dimensions.height
		};
    }
    
});



//  alias Element.getStyle to Element.getStyles
Element.getStyle= Element.getStyles;
Element.assignId.uniqueId= 1;


//  Provide support for legacy browsers that don't implement the W3C selector API
if (!DC.Support.QuerySelector)
    Object.extend(Element, {
    
        query: function(node, selector)
        {
            if (1==arguments.length) {
                selector = node;
                node = document;
            }
            return (Sizzle(selector, node)[0] || null);
        },
        
        queryAll: function(node, selector)
        {
            if (1==arguments.length) {
                selector = node;
                node = document;
            }
            return (Sizzle(selector, node) || null);
        }
        
    });

// Firefox < 3.1 (aka 3.5) doesn't know Element.children, emulate it here.
if ('undefined'===typeof(document.documentElement.children))
{

/*jsl:declare HTMLElement*/

    HTMLElement.prototype.__defineGetter__("children", function() {
        var arr = [];
        var len= this.childNodes.length;
        var node;

        for (var i=0; i<len; ++i)
        {
            node= this.childNodes[i];

            if (Node.ELEMENT_NODE!==node.nodeType)
                continue;

            arr.push(node);
        }
        
        return arr;
    });
    
}

// Firefox doesn't know (as of FF3.5) Element.innerText , emulate it here.
if ('undefined'===typeof(document.documentElement.innerText))
{
	
/*jsl:declare HTMLElement*/

    HTMLElement.prototype.__defineGetter__("innerText", function () {
        return this.textContent;
    });

    HTMLElement.prototype.__defineSetter__("innerText", function (someText) {
        this.textContent = someText;
    });

}
