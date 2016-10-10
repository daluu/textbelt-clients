jQuery.support.cors = true;

$( "#sendbtn" ).click(function() {
    //console.log("triggered");
	destination = $("#Destination").val();
	number = $("#tel").val();
	message = $("#message").val();
	
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
	var data = "number=" + number + "&message=" + message;
    //console.log(data);
	var request = $.post(url,data
      ).done(function(data) {
      	//console.log(data);
		//result = JSON.parse(data); //looks like already parsed to JSON for us by jQuery
        result = data;
		var reply;
		if (!result.success){
			reply = result.message;
		}
		else {
			reply = "Message sent, but see www.textbelt.com for limitations with service.";
			$("#Destination").val("USA");
			$("#tel").val("");
			$("#message").val("");
		}
		var re = /(<([^>]+)>)/ig;
		reply = reply.replace(re, "");
		$("#status_msg").html("Status: " + reply);
        //can't seem to trigger this...
		//$("#popupDialog").dialog({modal: true, height: 200, width: 300 });
	});
});

