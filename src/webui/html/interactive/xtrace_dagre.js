
function drawXTraceGraph(attachPoint, reports) {
    // Create the graph representation
    var graph = createGraphFromReports(reports);

    // Twiddle the attach point a little bit
    var rootSVG = d3.select(attachPoint).append("svg");
    var graphSVG = rootSVG.append("svg").attr("width", "100%").attr("height", "100%").attr("class", "graph-attach");
    var minimapSVG = rootSVG.append("svg").attr("class", "minimap-attach");

    // Create the chart instances
    var DAG = DirectedAcyclicGraph();
    var DAGMinimap = DirectedAcyclicGraphMinimap(DAG).width("20%").height("20%").x("80%").y("80%");
    
    // Variables for the pan-zoom state
    var w = window.innerWidth,
        h = window.innerHeight,
        scale = 1,
        tx = 0,
        ty = 0;
    
    // Sets the pan-zoom state of the graph and minimap according to the pan-zoom variables
    var refreshViewport = function() {
        graphSVG.select(".graph").attr("transform","translate("+(tx*scale)+","+(ty*scale)+") scale("+scale+")");
        minimapSVG.select('.viewfinder').attr("x", -tx).attr("y", -ty).attr("width", w).attr("height", h);
        graphZoom.translate([tx*scale, ty*scale]).scale(scale);
        minimapZoom.translate([0,0]).scale(1);
        graphSVG.selectAll(".node text").attr("opacity", 3*scale-0.3);
    }
    
    // Resets the viewport by zooming all the way out
    var resetViewport = function() {
        var bbox = graphSVG.select(".graph").node().getBBox();
        w = bbox.width+50;
        h = bbox.height+50;
        scale = Math.min(window.innerWidth/w, window.innerHeight/h);
        tx = (window.innerWidth - w*scale)/(2*scale) - bbox.x + 25;
        ty = (window.innerHeight - h*scale)/(2*scale) - bbox.y + 25;
        refreshViewport();
    }
    
    // Callback when graph is pan-zoomed
    var onGraphPanzoom = function() {
        scale = d3.event.scale;
        tx = d3.event.translate[0] / scale;
        ty = d3.event.translate[1] / scale;
        w = window.innerWidth / scale;
        h = window.innerHeight / scale;
        refreshViewport();
    }
    
    // Callback when minimap is pan-zoomed
    var onMinimapPanzoom = function() {
        var mouse = d3.mouse(minimapSVG.select(".minimap").node());
        tx = w/2-mouse[0];
        ty = h/2-mouse[1];
        refreshViewport();
    }

    // Create and call the graph pan-zoom behaviour
    var graphZoom = d3.behavior.zoom().translate([0, 0]).scale(1.0).scaleExtent([0.05, 2.0]).on("zoom", onGraphPanzoom);
    rootSVG.call(graphZoom).on("dblclick.zoom", null); // turn off double click zooming

    // Create and call the minimap pan-zoom behaviour
    minimapSVG.on("click", onMinimapPanzoom); // this turns on click-to-move on the minimap
    var minimapZoom = d3.behavior.zoom().translate([0, 0]).scale(1.0).scaleExtent([1.0, 1.0]).on("zoom", onMinimapPanzoom);
    minimapSVG.call(minimapZoom).on("dblclick.zoom", null); // turn off double click zooming

    // A function to attach tipsy tooltips to the graph nodes
    function drawTooltips() {
        graphSVG.selectAll(".node").each(function(d) {
            $(this).tipsy({
                gravity: $.fn.tipsy.autoWE,
                html: true,
                fade: true,
                delayIn: 1000,
                title: function() {
                    return createTooltipHTMLFromReport(d.report);
                }
            });
        });
    }
    
    // A function that attaches mouse-click events to nodes to enable node selection
    function setupSelectionEvents(){
        var nodes = graphSVG.selectAll(".node");
        var edges = graphSVG.selectAll(".edge");
        var lastSelected = null;
        
        nodes.on("click", function(d) { 
            var node = d3.select(this);
            var selected = !node.classed("selected");
            
            if (d3.event.ctrlKey && d3.event.shiftKey) {
                if (selected) {
                    lastSelected = lastSelected || d;
                    selectPath(d, lastSelected);    
                } else {
                    node.classed("selected", selected);
                    lastSelected = lastSelected==d ? null : lastSelected;
                }
            } else if (d3.event.ctrlKey) {
                node.classed("selected", selected);
                if (selected) {
                    lastSelected = d;
                } else if (lastSelected==d) {
                    lastSelected = null;
                }
            } else if (d3.event.shiftKey) {
                nodes.classed("selected", false);
                lastSelected = lastSelected || d;
                selectPath(d, lastSelected);
            } else {
                if (graphSVG.selectAll(".node.selected")[0].length==1) {
                    nodes.classed("selected", false);
                    node.classed("selected", selected);
                    lastSelected = selected ? d : null;
                } else {
                    nodes.classed("selected", false);
                    node.classed("selected", true);
                    lastSelected = d
                }
            }
            
            refreshEdges();
        });
        
        nodes.on("mouseover", function(d) {
            d3.select(this).classed("hovered", true);
            graphSVG.classed("hovering", true);
            highlightPath(d);
        }).on("mouseout", function(d){
            d3.select(this).classed("hovered", false)
            graphSVG.classed("hovering", false);
            edges.classed("hoverpath", false);
            nodes.classed("hoverpath", false);
        });
        
        function getNodesBetween(a, b) {
            var between = {};
            var nodesBetween = [];
            var get = function(p) {
                if (between[p.id] == null) {
                    if (p==b) {
                        nodesBetween.push(p);
                        between[p.id] = true;
                    } else if (p.getParents().map(get).indexOf(true)!=-1) {
                        nodesBetween.push(p);
                        between[p.id] = true;
                    } else {
                        between[p.id] = false;
                    }
                }
                return between[p.id];
            }
            get(a)
            return nodesBetween;
        }
        
        function selectPath(a, b) {
            var path = getNodesBetween(a, b).concat(getNodesBetween(b, a));
            graphSVG.selectAll(".node").data(path, DAG.nodeid()).classed("selected", true);
        }
        
        function refreshEdges() {
            // Class up the selected edges
            var selected = graphSVG.selectAll(".node.selected");
            var selectionIDs = {};
            selected.each(function(d) { selectionIDs[d.id] = true; });
            edges.classed("selected", function(d) {
                return selectionIDs[d.source.id]==true && selectionIDs[d.target.id]==true; 
            });
        }
        
        function highlightPath(center) {
            var visitedParents = {};
            var visitedChildren = {};
            var selectedEdges = {};
            function selectParents(node) {
                if (!visitedParents[node.id]) {
                    visitedParents[node.id]=true;
                    node.getVisibleParents().forEach(function(p) {
                        selectedEdges[p.id+node.id]=true;
                        selectParents(p);
                    });
                }
            }
            function selectChildren(node) {
                if (!visitedChildren[node.id]) {
                    visitedChildren[node.id]=true;
                    node.getVisibleChildren().forEach(function(p) {
                        selectedEdges[node.id+p.id]=true;
                        selectChildren(p);
                    });
                }
            }
            selectParents(center);
            selectChildren(center);
            edges.classed("hoverpath", function(d) {
                return selectedEdges[d.source.id+d.target.id]==true;
            });
            nodes.classed("hoverpath", function(d) {
                return visitedParents[d.id] || visitedChildren[d.id];
            })
        }
    }
    
    // The main draw function
    function draw() {
        $(".tipsy").remove();               // Hide any tooltips
        graphSVG.datum(graph).call(DAG);    // Draw a DAG at the graph attach
        minimapSVG.datum(graphSVG.node()).call(DAGMinimap)  // Draw a Minimap at the minimap attach
        drawTooltips()                      // Draw the tooltips
        setupSelectionEvents()              // Set up the node selection events
    }
    
    // Call the draw function
    draw();

    // Start with the graph all the way zoomed out
    resetViewport();
    
    d3.select("body").on("keyup", function(d) {
        if (d3.event.keyCode==46) {
            graphSVG.selectAll(".node.selected").each(function(d) { d.visible = false; });
            draw();
        }
    });
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