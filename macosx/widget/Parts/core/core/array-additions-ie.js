/*jsl:import array-additions.js*/

Array.from= function(obj, startIndex)
{
    var len= obj.length;
    var result= [];
    
    for (var i=(startIndex||0); i<len; ++i) {
        result.push(obj[i]);
    }
    return result;
}

// Mozilla 1.8 & Safari 420+ has support for indexOf, lastIndexOf, forEach, filter, map, some, every
// http://developer-test.mozilla.org/docs/Core_JavaScript_1.5_Reference:Objects:Array:lastIndexOf
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(obj, fromIndex) {
		if ('undefined'===typeof(fromIndex)) {
			fromIndex = 0;
		} else if (fromIndex < 0) {
			fromIndex = Math.max(0, this.length + fromIndex);
		}
		for (var i = fromIndex; i < this.length; i++) {
			if (this[i] === obj)
				return i;
		}
		return -1;
	};
}

// http://developer-test.mozilla.org/docs/Core_JavaScript_1.5_Reference:Objects:Array:lastIndexOf
if (!Array.prototype.lastIndexOf) {
	Array.prototype.lastIndexOf = function(obj, fromIndex) {
		if ('undefined'===typeof(fromIndex)) {
			fromIndex = this.length - 1;
		} else if (fromIndex < 0) {
			fromIndex = Math.max(0, this.length + fromIndex);
		}
		for (var i = fromIndex; i >= 0; i--) {
			if (this[i] === obj)
				return i;
		}
		return -1;
	};
}

// http://developer-test.mozilla.org/docs/Core_JavaScript_1.5_Reference:Objects:Array:forEach
if (!Array.prototype.forEach) {
	Array.prototype.forEach = function(f, obj) {
		var l = this.length;	// must be fixed during loop... see docs
		for (var i = 0; i < l; i++) {
			f.call(obj, this[i], i, this);
		}
	};
}
    
// http://developer-test.mozilla.org/docs/Core_JavaScript_1.5_Reference:Objects:Array:filter
if (!Array.prototype.filter) {
	Array.prototype.filter = function(f, obj) {
		var l = this.length;	// must be fixed during loop... see docs
		var res = [];
		for (var i = 0; i < l; i++) {
			if (f.call(obj, this[i], i, this)) {
				res.push(this[i]);
			}
		}
		return res;
	};
}
    
// http://developer-test.mozilla.org/docs/Core_JavaScript_1.5_Reference:Objects:Array:map
if (!Array.prototype.map) {
	Array.prototype.map = function(f, obj) {
		var l = this.length;	// must be fixed during loop... see docs
		var res = [];
		for (var i = 0; i < l; i++) {
			res.push(f.call(obj, this[i], i, this));
		}
		return res;
	};
}
    
// http://developer-test.mozilla.org/docs/Core_JavaScript_1.5_Reference:Objects:Array:some
if (!Array.prototype.some) {
	Array.prototype.some = function(f, obj) {
		var l = this.length;	// must be fixed during loop... see docs
		for (var i = 0; i < l; i++) {
			if (f.call(obj, this[i], i, this)) {
				return true;
			}
		}
		return false;
	};
}
    
// http://developer-test.mozilla.org/docs/Core_JavaScript_1.5_Reference:Objects:Array:every
if (!Array.prototype.every) {
	Array.prototype.every = function(f, obj) {
		var l = this.length;	// must be fixed during loop... see docs
		for (var i = 0; i < l; i++) {
			if (!f.call(obj, this[i], i, this)) {
				return false;
			}
		}
		return true;
	};
}

