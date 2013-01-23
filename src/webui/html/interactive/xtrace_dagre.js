

/*
 * Draws the interactive graph on the provided SVG element using the provided reports
 */
var drawGraph = function(attachPoint, reports) {
    // Create the graph representation
    var graph = createGraphFromReports(reports);
    
    // Twiddle the attach point a little bit
    var rootSVG = d3.select(attachPoint).append("svg");
    var graphSVG = rootSVG.append("svg").attr("width", "100%").attr("height", "100%");
    var minimapSVG = rootSVG.append("svg");
    
    // Create a vanilla DAG
    var nodedata = [];
    var edgedata = [];
    var dag = DirectedAcyclicGraph().nodes(function(d) {
        nodedata = d.getVisibleNodes();
        return nodedata;
    }).edges(function(d) {
        edgedata = d.getVisibleLinks();
        return edgedata;
    });
    
    // Create the minimap and specify the draw function
    var minimap = Minimap().width("20%").height("20%").x("80%").y("80%").draw(function(d) {
        var edges = d3.select(this).selectAll(".edge").data(edgedata, dag.edgeid());
        edges.enter().append("path").attr("class", "edge");
        edges.exit().remove();
        
        var nodes = d3.select(this).selectAll(".node").data(nodedata, dag.nodeid());
        nodes.enter().append("g").attr("class", "node")
                     .append("rect").attr("x", function(d) { return -(d.bbox.width/2); })
                                    .attr("y", function(d) { return -(d.bbox.height/2); })
                                    .attr("width", function(d) { return d.width; })
                                    .attr("height", function(d) { return d.height; });
        nodes.exit().remove();
        
        // Set positions of nodes and edges
        nodes.attr("transform", dag.nodeTranslate);
        edges.attr("d", dag.splineGenerator);
     });
    
    // Draw them
    var draw = function() {
        graphSVG.datum(graph).call(dag);
        minimapSVG.datum(graphSVG.node()).call(minimap);
                
        // Add tooltips
        graphSVG.selectAll(".node").each(function(d) {
           $(this).tipsy({
               gravity: $.fn.tipsy.autoWE, 
               html: true, 
               delayIn: 500,
               delayOut: 500,
               title: function() {
                   return createTooltipHTML(d.report);
               }
           });
            
        });
        $(".graph .node").tipsy({ 
            gravity: $.fn.tipsy.autoWE, 
            html: true, 
            title: function() {
              return 'Hi there! My color is blaaahh'; 
            }
        });
    }
    draw();
    
    // Set the pan-zoom behaviour
    var scale = 1;
    var tx = 0;
    var ty = 0;
    var w = window.innerWidth;
    var h = window.innerHeight;
    
    var refreshViewport = function() {
        graphSVG.select('.graph').attr("transform","translate("+(tx*scale)+","+(ty*scale)+") scale("+scale+")");
        minimapSVG.select('.viewfinder').attr("x", -tx).attr("y", -ty).attr("width", w).attr("height", h);
        mainZoom.translate([tx*scale, ty*scale]).scale(scale);
        minimapZoom.translate([0,0]).scale(1);
    }
    
    var zoomCB = function() {
        if (d3.event.scale!=scale) {
            scale = d3.event.scale;
            graphSVG.selectAll(".node").each(dag.refreshnode());
        }
        tx = d3.event.translate[0] / scale;
        ty = d3.event.translate[1] / scale;
        w = window.innerWidth / scale;
        h = window.innerHeight / scale;
        refreshViewport();
    }
    
    var minimapZoomCB = function() {
        var mouse = d3.mouse(minimapSVG.select('.minimap').node());
        tx = w/2-mouse[0];
        ty = h/2-mouse[1];
        refreshViewport();
    }

    var mainZoom = d3.behavior.zoom().translate([0, 0]).scale(1.0).scaleExtent([0.05, 2.0]).on("zoom", zoomCB);
    rootSVG.call(mainZoom);

    minimapSVG.on("click", minimapZoomCB);
    var minimapZoom = d3.behavior.zoom().translate([0, 0]).scale(1.0).scaleExtent([1.0, 1.0]).on("zoom", minimapZoomCB);
    minimapSVG.call(minimapZoom);
}

var createTooltipHTML = function(report) {
    var tooltip = $("<div>").attr("class", "xtrace-tooltip");
    
    var reserved = ["X-Trace", "Agent", "Class", "Timestamp", "Host", "Label"];
    var seen = {"Operation": true, "Edge": true, "version": true};
    
    function appendRow(key) {
        if (key in report && !seen[key]) {
            var value = report[key].join(", ");
            var keyrow = $("<div>").attr("class", "key").append(key);
            var valrow = $("<div>").attr("class", "value").append(value);
            var clearrow = $("<div>").attr("class", "clear");
            tooltip.append($("<div>").append(keyrow).append(valrow).append(clearrow));
            seen[key] = true;
        }
    }
    
    // Do the reserved first
    for (var i = 0; i < reserved.length; i++) {
        appendRow(key);
    }
    
    // Do the remainder
    for (var key in report) {
        appendRow(key);
    }
    
    return tooltip.outerHTML();
}

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
