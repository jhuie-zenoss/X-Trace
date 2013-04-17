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

var getParameters = function() {
    if (window.location.href.indexOf("?")==-1) return {};
    var param_strs = window.location.href.substr(window.location.href.indexOf("?")+1).split("&");
    var params = {};
    param_strs.forEach(function(str) {
        splits = str.split("=");
        if (splits.length==2) {
            params[splits[0]] = splits[1];
        }
    });
    return params
}

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

var createGraphFromReports = function(reports, params) {
    var nodes = {};
    
    // First create a node for each report
    for (var i = 0; i < reports.length; i++) {
        var report = reports[i];
        if (!report.hasOwnProperty("X-Trace")) {
            console.error("Bad report found with no ID:", report);
        }
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


//Javascript impl of java's string hashcode:
//http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
String.prototype.hashCode = function(){
 var hash = 0, i, char;
 if (this.length == 0) return hash;
 for (i = 0; i < this.length; i++) {
     char = this.charCodeAt(i);
     hash = ((hash<<5)-hash)+char;
     hash = hash & hash; // Convert to 32bit integer
 }
 return hash;
};

function hash_report(report) {
 hash = 0;
 if (report["Agent"]) hash += ("Agent:"+report["Agent"][0]).hashCode();
 if (report["Label"]) hash += ("Label:"+report["Label"][0]).hashCode();
 if (report["Class"]) hash += ("Class:"+report["Class"][0]).hashCode();
 return hash & hash;
}

var get_yarnchild_reports = function(trace) {
    // First, get the process IDs for the yarnchild nodes
    var yarnchild_process_ids = {};
    for (var i = 0; i < trace.reports.length; i++) {
        var report = trace.reports[i];
        if (report.hasOwnProperty("Agent") && (report["Agent"][0]=="YarnChild" || report["Agent"][0]=="Hadoop Job")) {
            yarnchild_process_ids[report["ProcessID"][0]] = true;
        }
    }
    
    // Now figure out which reports have to be removed
    var retained = [];
    var removed = [];
    for (var i = 0; i < trace.reports.length; i++) {
        var report = trace.reports[i];
        if (!yarnchild_process_ids.hasOwnProperty(report["ProcessID"][0])) {
            removed.push(report);
        } else {
            retained.push(report);
        }
    }
    
    // Create the map of parents to remap
    var parents_remap = {};
    for (var i = 0; i < removed.length; i++) {
        var report = removed[i];
        var id = report["X-Trace"][0].substr(18);
        parents_remap[id] = report["Edge"];
    }
    
    var remap_parents = function(id) {
        if (!parents_remap.hasOwnProperty(id)) {
            return [id];
        }
        var parents = parents_remap[id];
        var newparents = {};
        for (var i = 0; i < parents.length; i++) {
            remap_parents(parents[i]).forEach(function(parentid) {
                newparents[parentid] = true;
            })
        }
        parents_remap[id] = Object.keys(newparents);
        return parents_remap[id];
    }
    
    // Condense the map
    for (var id in parents_remap) {
        remap_parents(id);
    }
    
    var get_new_parents = function(parents) {
        var new_parents = {};
        parents.forEach(function(id) {
            if (!parents_remap.hasOwnProperty(id)) {
                new_parents[id] = true;
            } else {
                parents_remap[id].forEach(function(newparentid) {
                    new_parents[newparentid] = true;
                })
            }
        })
        return Object.keys(new_parents);
    }
    
    // Finally, remap the parents of the retained reports
    for (var i = 0; i < retained.length; i++) {
        var report = retained[i];
        var parents = report["Edge"];
        report["Edge"] = get_new_parents(report["Edge"]);
    }
    trace.reports = retained;
    
    return trace;
}

var kernelgraph_for_trace = function(trace) {
    return KernelGraph.fromJSON(trace);
}

var yarnchild_kernelgraph_for_trace = function(trace) {
    // Create the full graph
    var graph = kernelgraph_for_trace(trace);
    
    
    // Find the process IDs for yarnchild processes
    var yarnchild_process_ids = {};
    graph.get_nodes().forEach(function(node) {
        if (node.data["Agent"] &&
                node.data["Agent"][0]=="YarnChild") {
            yarnchild_process_ids[node.data["ProcessID"][0]]=true;
        }
    });
    
    // Remove any nodes that aren't yarnchild processes
    graph.get_nodes().forEach(function(node) {
        if (!node.data["ProcessID"] || !yarnchild_process_ids.hasOwnProperty(node.data["ProcessID"][0])) {
            graph.remove(node);
        }
    });
    
    return graph;
}

