/*
 * Functions to construct Graph and Node objects from X-Trace JSON
 * reports.  Uses the graph representation from graph.js
 */

var createGraphFromReports = function(reports) {
    // A lookup map for the nodes
    var nodes = {};
    
    // First create a node for each report
    for (var i = 0; i < reports.length; i++) {
        var report = reports[i];
        var id = report["X-Trace"][0].substr(18);
        nodes[id] = new Node(id);
        if (report["Operation"] && report["Operation"]=="merge") {
            nodes[id].visible = false;
        }
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
}