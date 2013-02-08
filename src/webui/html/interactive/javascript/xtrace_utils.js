var getReports = function(callback, errback) {
	try {
		var current_id = extractTraceID();
	} catch(e) {
		errback("Unable to extrace a traceID from URL", e);
	}
	var len = current_id.length;
	if (len > 5 && current_id.substring(len-5, len)==".json") {
	    console.log("Loading JSON", current_id)
	    d3.json(current_id, callback);
	} else {
	    console.log("Retrieving reports for ID", current_id);
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

var createGraphFromReports = function(reports) {
    var nodes = {};
    
    // First create a node for each report
    for (var i = 0; i < reports.length; i++) {
        var report = reports[i];
        var id = report["X-Trace"][0].substr(18);
        nodes[id] = new Node(id);
        if (report["Operation"] && report["Operation"]=="merge") {
            nodes[id].never_visible = true;
        }
        nodes[id].report = report;
    }
    
    // Second link the nodes together
    for (var i = 0; i < reports.length; i++) {
        var report = reports[i];
        var id = report["X-Trace"][0].substr(18);
        report["Edge"].forEach(function(parentid) {
            if (nodes[parentid] && nodes[id]) {
                nodes[parentid].addChild(nodes[id]);
                nodes[id].addParent(nodes[parentid]);
            }
        });
    }
    
    // Create the graph and add the nodes
    var graph = new Graph();
    for (var id in nodes) {
        graph.addNode(nodes[id]);
    }
    
    return graph;
}
