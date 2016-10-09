function handleHttpResponse() {
	if (http.readyState == 4) {
		result = eval('(' + http.responseText + ')'); //JSON.parse(http.responseText);
		var reply;
		if (!result.success){
			document.getElementById("status_message").className = "error";
			reply = result.message;
		}
		else {
			document.getElementById("status_message").className = "normal";
			reply = "Message sent, but see www.textbelt.com for limitations with service.";
			ClearFields();
		}
		var re = /(<([^>]+)>)/ig;
		reply = reply.replace(re, "");
		document.getElementById("status_message").innerHTML = reply;
		//$("#popupDialog", $(this)).popup("open");
	}else{
		//document.getElementById("status_message").value = "HTTP request failed? Ready state = " + http.readyState;
		document.getElementById("status_message").className = "normal";
		document.getElementById("status_message").innerText = "Attempting to send SMS, please wait...";
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
	var data = "number=" + number + "&message=" + (message);

	try {
		http.open("POST", url, true);
		http.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
		//http.withCredentials = true;
		http.onreadystatechange = handleHttpResponse;
		http.send(data);
	} catch (e) {alert("Send SMS failed for some reason"); return true;}
	//} catch (e) {alert(e.description); return true;}
}

function getHTTPObject() {
  var xmlhttpObj;
  if (!xmlhttpObj && typeof XMLHttpRequest != 'undefined') {
    try {
      xmlhttpObj = new XMLHttpRequest();
    } catch (e) {
	    alert("no xmlhttp");
	    //xmlhttpObj = null;
      xmlhttpObj = false;
    }
  }
  return xmlhttpObj;
}

var http = getHTTPObject();
/*
function jsSetup(e){
	document.getElementById("Send").addEventListener("click", sendsms, false);
}
*/

//window.addEventListener("DOMContentLoaded", jsSetup, false);
//window.addEventListener("load", jsSetup, false);