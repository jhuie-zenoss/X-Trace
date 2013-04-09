// http://stackoverflow.com/questions/523266/how-can-i-get-a-specific-parameter-from-location-search
var getParameter = function(name) {
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( window.location.href );
    if( results == null )
        return "";
    else
        return results[1];
};

var getReports = function(ids_str, callback, errback) {
    // Batches report requests
    if (ids_str==null) {
        errback("No IDs specified");
    }

    var i = 0;
    var batch_size = 20;
    ids = ids_str.split(",");
    
    var results = [];
    var batch_callback = function(json) {
        results = results.concat(json);
        i++;
        if (ids.length == 0) {
            callback(results);
        } else {
            next_request_ids = ids.splice(0, batch_size);
            console.info("Retrieving batch "+i+":", next_request_ids);
            getAllReports(next_request_ids.join(), batch_callback, errback);
        }
    }
    
    batch_callback([]);
}

var getAllReports = function(ids, callback, errback) {
    var report_url = "reports/" + ids;
    
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
}

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
        if (report["Edge"]) {
            report["Edge"].forEach(function(parentid) {
                if (nodes[parentid] && nodes[id]) {
                    nodes[parentid].addChild(nodes[id]);
                    nodes[id].addParent(nodes[parentid]);
                }
            });
        }
    }
    
    // Create the graph and add the nodes
    var graph = new Graph();
    for (var id in nodes) {
        graph.addNode(nodes[id]);
    }
    
    return graph;
}

var createJSONFromVisibleGraph = function(graph) {
    var nodes = graph.getVisibleNodes();
    var reports = [];
    
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var parents = node.getVisibleParents();
        var report = $.extend({}, node.report);
        report["Edge"] = [];
        for (var j = 0; j < parents.length; j++) {
            report["Edge"].push(parents[j].id);
        }
        reports.push(report);
    }
    
    return {"reports": reports};
}