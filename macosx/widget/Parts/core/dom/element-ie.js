/*jsl:import element.js*/

//  IE does things different, of course.
if (DC.Browser.IE)
{
    Element.setStyle= function(element, prop, value)
    {
        if ('opacity'!=prop)
        {
            element.style[prop]= value;
            return;
        }

        //  Handle wacky IE filter stuff
        var filter = element.style.filter;
        var style = element.style;

        if (value == 1 || value === '')
        {
            style.filter = filter.replace(/alpha\([^\)]*\)/gi,'');
            return;
        }
        
        if (value < 0.00001)
            value = 0;
        style.filter = filter.replace(/alpha\([^\)]*\)/gi, '') +
                       'alpha(opacity=' + (value * 100) + ')';
    }
    
    Element.setStyles= function(element, styles)
    {
        var elementStyle= element.style;
        
        for (var p in styles)
        {
            if ('opacity'==p)
                Element.setStyle(element, p, styles[p]);
            else
                elementStyle[p]= styles[p];
        }
    }

    Element.getStyles= function(element, propsToGet)
    {
        var currentStyle= element.currentStyle;
        
        function getDimension(dimension) {
            var extra = 0;
            if ('width'===dimension) {
                extra += parseInt(currentStyle.borderLeftWidth, 10)||0 + 
                         parseInt(currentStyle.borderRightWidth, 10)||0 +
                         parseInt(currentStyle.paddingLeft, 10)||0 +
                         parseInt(currentStyle.paddingRight, 10)||0;
                return Math.max(0, element.offsetWidth - extra)+'px';
            } else {
                extra += parseInt(currentStyle.borderTopWidth, 10)||0 + 
                         parseInt(currentStyle.borderBottomWidth, 10)||0 +
                         parseInt(currentStyle.paddingTop, 10)||0 +
                         parseInt(currentStyle.paddingBottom, 10)||0;
                return Math.max(0, element.offsetHeight - extra)+'px';
            }
        }
        
        var styles = {};
        var opacity;
        
        if ('string'===typeof(propsToGet))
        {
            if ('opacity'===propsToGet)
            {
                opacity = currentStyle.filter.match(/opacity=(\d+)/i);
                return (null===opacity ? 1 : parseInt(opacity[1], 10)/100);
            }
            
            if (propsToGet=='height' || propsToGet=='width')
                return getDimension(propsToGet);
            else if (p=='backgroundPosition')
                return currentStyle.backgroundPositionX+' '+
                       currentStyle.backgroundPositionY;
            else
                return currentStyle[propsToGet];
        }
        
        propsToGet= propsToGet||Element.PROPERTIES;

        var p;
        var len= propsToGet.length;
        
        for (var i=0; i<len; ++i)
        {
            p= propsToGet[i];
            if ('opacity'===p) {
                opacity = currentStyle.filter.match(/opacity=(\d+)/i);
                styles[p] = (null===opacity ? 1 : parseInt(opacity[1], 10)/100);
            } 
            else if (p==='height' || p==='width') {
                styles[p] = getDimension(p);
            } 
            else if (p==='backgroundPosition') {
                styles[p] = currentStyle.backgroundPositionX+' '+
                            currentStyle.backgroundPositionY;
            }
            else {
                styles[p] = currentStyle[p];
            }
        }
    
        return styles;
    };
    Element.getStyle= Element.getStyles;

    Element.clone= function(element)
    {
        var node= element.cloneNode(false);
        
        if ('TR'!=element.tagName)
        {
            node.innerHTML= element.innerHTML;
            return node;
        }

        // special handling for TRs
        var cellIndex;
        var originalCell;
        var newCell;

        for (cellIndex=0; cellIndex<element.children.length; ++cellIndex)
        {
            originalCell= element.children[cellIndex];
            newCell= originalCell.cloneNode(false);
            newCell.id= '';
            newCell.innerHTML= originalCell.innerHTML;
            node.appendChild(newCell);
        }
        return node;
    };
}
