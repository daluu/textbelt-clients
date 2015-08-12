var http = new XMLHttpRequest();

function handleHttpResponse() {
	if (http.readyState == 4) {
		result = JSON.parse(http.responseText);
		var reply;
		var errFlag;
		if (!result.success){
			errFlag = true;
			reply = result.message;
		}
		else {
			errFlag = false;
			reply = "Message sent, but see www.textbelt.com for limitations with service.";
			ClearFields();
		}
		var msg = new Windows.UI.Popups.MessageDialog(reply, errFlag ? "Error:" : "Status:");
		msg.showAsync();
	}
}

function ClearFields(){
	document.getElementById("Destination").value = "USA";
	document.getElementById("Number").value = "";
	document.getElementById("Message").value = "";
}

function sendsms() {
	destination = document.getElementById("Destination").value;
	number = document.getElementById("Number").value;
	message = document.getElementById("Message").value;
	
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
		http.open("POST", url, true);
		http.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
		//http.withCredentials = true;
		http.onreadystatechange = handleHttpResponse;
		http.send(data);
	} catch (e) {
		var msg = new Windows.UI.Popups.MessageDialog(e.description, "Error:");
	    msg.showAsync();
	}
}