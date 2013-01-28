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


var createGraphFromReports = function(reports) {
    var nodes = {};
    
    // First create a node for each report
    for (var i = 0; i < reports.length; i++) {
        var report = reports[i];
        var id = report["X-Trace"][0].substr(18);
        nodes[id] = new Node(id);
        if (report["Operation"] && report["Operation"]=="merge") {
            nodes[id].visible = false;
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

var createTooltipHTMLFromReport = function(report) {

    var reserved = ["X-Trace", "Agent", "Class", "Timestamp", "Host", "Label"];
    
    function appendRow(key, value, tooltip) {
        var keyrow = $("<div>").attr("class", "key").append(key);
        var valrow = $("<div>").attr("class", "value").append(value);
        var clearrow = $("<div>").attr("class", "clear");
        tooltip.append($("<div>").append(keyrow).append(valrow).append(clearrow));
    }
    
    var tooltip = $("<div>").attr("class", "xtrace-tooltip");
    var seen = {"Operation": true, "Edge": true, "version": true};
    
    // Do the reserved first
    for (var i = 0; i < reserved.length; i++) {
        var key = reserved[i];
        if (key in report) {
            appendRow(key, report[key].join(", "), tooltip);
            seen[key] = true;
        }
    }
    
    // Do the remainder
    for (var key in report) {
        if (!seen[key]) {
            appendRow(key, report[key].join(", "), tooltip);
        }
    }
    
    return tooltip.outerHTML();
}