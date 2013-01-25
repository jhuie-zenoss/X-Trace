var getReports = function(callback, errback) {
	try {
		var current_id = extractTraceID();
	} catch(e) {
		errback("Unable to extrace a traceID from URL", e);
	}
	if (current_id=="example") {
	    d3.json("static.json", callback);
	} else {
	    getReportsForTrace(current_id, callback, errback);
	}
};

var extractTraceID = function() {
	var searchstring = window.location.search;
	var id = searchstring.substr(searchstring.indexOf("id=")+3);
	return id;
};

var getReportsForTrace = function(traceID, callback, errback) {
	var report_url = "reports/" + traceID;
	
	var xhr = new XMLHttpRequest();
	
	xhr.open("GET", report_url, true);
	
	xhr.onreadystatechange = function() {
		if (xhr.readyState==4) {
			if (xhr.status = 200) {
				var json = JSON.parse(xhr.responseText);
				callback(json);
			} else {
				errback(xhr.status, xhr);
			}
		}
	};
	
	xhr.send(null);
};

jQuery.fn.outerHTML = function() {
    return jQuery('<div />').append(this.eq(0).clone()).html();
};