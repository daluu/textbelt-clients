/** Make title case version of string.
    @returns original string with the first character capitalised.
 **/
String.prototype.titleCase= function()
{
    return this.charAt(0).toUpperCase() + this.substr(1);
}

/** Trim the whitespace off either end of a string.
 */
String.prototype.trim= function()
{
    var str= this.replace(/^\s+/, '');
	for (var i = str.length - 1; i > 0; --i)
		if (/\S/.test(str.charAt(i)))
		{
			str = str.substring(0, i + 1);
			break;
		}
	return str;
}

String.prototype.beginsWith= function(s)
{
    return s===this.substring(0, s.length);
}

/** Safari 2 doesn't define the localeCompare. This probably will be slow.
 **/
if (!String.prototype.localeCompare)
    String.prototype.localeCompare = function(other)
    {
        if (this < other)
            return -1;
        else if (this > other)
            return 1;
        else
            return 0;
    }

String.prototype.expand = function(obj, defaultValue)
{
    function lookupKey(str, key)
    {
        var value= obj[key];
        if (null===value || 'undefined'===typeof(value))
            return defaultValue;
        return value;
    }

    return this.replace(/\$\{(\w+)\}/g, lookupKey);
}

