var TextBelter = {
	http: null,

	handleHttpResponse: function() { 
		if (TextBelter.http.readyState == 4) {
			result = JSON.parse(TextBelter.http.responseText);
			if (!result.success){
				alert(result.message);
			}
			else {
				alert("Message sent, but see www.textbelt.com for limitations with service.");
				TextBelter.TextBelter_ClearFields();
			}
		}
	},

	sendMessage: function() {
		var number = document.getElementById("TextBelter-PN").value;
		var destination = document.getElementById("TextBelter-MainMenu").label;
		var message = document.getElementById("TextBelter-MB").value;		
		var url = "http://www.textbelt.com/";
		switch(destination) {
    	case "International":
        	url += "intl";
        	break;
    	case "Canada":
        	url += "canada";
        	break;
    	case "USA":
    	default:
    		url += "text";
		}
		var data = "number=" + number + "&message=" + encodeURIComponent(message);
		try {
			TextBelter.http.open("POST", url, true);
			TextBelter.http.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
			//TextBelter.http.withCredentials = true;
			TextBelter.http.onreadystatechange = this.handleHttpResponse;
			TextBelter.http.send(data);			
		} catch (e) {
			//alert(e.message);
			return true;
		}
	},

	getHTTPObject: function() {
	  var xmlhttp;
	  if (!xmlhttp && typeof XMLHttpRequest != 'undefined') {
	    try {
	      xmlhttp = new XMLHttpRequest();
	    } catch (e) {
	      xmlhttp = false;
	    }
	  }
	  return xmlhttp;
	},

	//////////////////////////

	TextBelter_ClearFields: function(){
		document.getElementById("TextBelter-PN").value = "";
		document.getElementById("TextBelter-MB").value = "";
	},

	TextBelter_MessageFocus: function(event)
	{
		document.getElementById("TextBelter-MB").focus()
	},

	TextBelter_SendMessage: function(event)
	{	
		this.placeNumberInHistory();
		this.sendMessage();
	},

	TextBelter_SetLocale: function(smsLocale){
		document.getElementById("TextBelter-MainMenu").setAttribute("label", smsLocale.label);
		smsCarrier.setAttribute("checked", "true");
		document.getElementById("TextBelter-MainMenu").setAttribute("tooltiptext", smsLocale.label);
	},

	TextBelter_LoadLocales: function() {
		document.getElementById("menuItemUsa").addEventListener("command", function(){TextBelter.TextBelter_SetLocale(this)});
		document.getElementById("menuItemCanada").addEventListener("command", function(){TextBelter.TextBelter_SetLocale(this)});
		document.getElementById("menuItemIntl").addEventListener("command", function(){TextBelter.TextBelter_SetLocale(this)});

	},

	placeNumberInHistory: function()
	{
		try{
		var value = document.getElementById("TextBelter-PN").value;

		var fhistory = Components.classes["@mozilla.org/satchel/form-history;1"].
		           getService(Components.interfaces.nsIFormHistory);
		fhistory.addEntry("WC_History", value);
		} catch (e) {return true}
	},

	TextBelter_clearHistory: function(){
		var formHistory = Components.classes["@mozilla.org/satchel/form-history;1"].getService(Components.interfaces.nsIFormHistory);
		formHistory.removeAllEntries();
	},
};

//TextBelter.TextBelter_LoadLocales();
TextBelter.http = TextBelter.getHTTPObject();

