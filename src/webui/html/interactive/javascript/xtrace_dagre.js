
function drawXTraceGraph(attachPoint, reports) {
    
    // Twiddle the attach point a little bit
    var rootSVG = d3.select(attachPoint).append("svg");
    var graphSVG = rootSVG.append("svg").attr("width", "100%").attr("height", "100%").attr("class", "graph-attach");
    graphSVG.node().oncontextmenu = function(d) { return false; };
    var minimapSVG = rootSVG.append("svg").attr("class", "minimap-attach");
    var listSVG = rootSVG.append("svg").attr("class", "history-attach");
    
    // Create the graph and history representations
    var graph = createGraphFromReports(reports);
    var history = DirectedAcyclicGraphHistory();
    
    // Create the chart instances
    var DAG = DirectedAcyclicGraph();
    var DAGMinimap = DirectedAcyclicGraphMinimap(DAG).width("19.5%").height("19.5%").x("80%").y("80%");
    var DAGHistory = List().width("15%").height("99%").x("0.5%").y("0.5%");
    var DAGTooltip = Tooltip().title(createTooltipHTMLFromReport);
    var DAGContextMenu = DirectedAcyclicGraphContextMenu(graph, graphSVG);

    // Attach the panzoom behavior
    var refreshViewport = function() {
        var t = zoom.translate();
        var scale = zoom.scale();
        graphSVG.select(".graph").attr("transform","translate("+t[0]+","+t[1]+") scale("+scale+")");
        minimapSVG.select('.viewfinder').attr("x", -t[0]/scale).attr("y", -t[1]/scale).attr("width", attachPoint.offsetWidth/scale).attr("height", attachPoint.offsetHeight/scale);
        graphSVG.selectAll(".node text").attr("opacity", 3*scale-0.3);    
    }
    var zoom = MinimapZoom().scaleExtent([0.001, 2.0]).on("zoom", refreshViewport);
    zoom.call(this, rootSVG, minimapSVG);
    
    // A function that resets the viewport by zooming all the way out
    var resetViewport = function() {
      var bbox = graphSVG.node().getBBox();
      bbox.width += 50; bbox.height += 50;
      scale = Math.min(attachPoint.offsetWidth/bbox.width, attachPoint.offsetHeight/bbox.height);
      w = attachPoint.offsetWidth/scale;
      h = attachPoint.offsetHeight/scale;
      tx = ((w - bbox.width)/2 - bbox.x + 25)*scale;
      ty = ((h - bbox.height)/2 - bbox.y + 25)*scale;
      zoom.translate([tx, ty]).scale(scale);
      refreshViewport();
    }
    
    // Attaches a context menu to any selected graph nodess
    function attachContextMenus() {
        DAGContextMenu.call(graphSVG.node(), graphSVG.selectAll(".node"));
        DAGContextMenu.on("open", function() {
            DAGTooltip.hide();
        }).on("hidenodes", function(nodes, selectionname) {
            var item = history.addSelection(nodes, selectionname);
            graphSVG.classed("hovering", false);
            listSVG.datum(history).call(DAGHistory);
            
            // Find the point to animate the hidden nodes to
            var bbox = DAGHistory.bbox().call(DAGHistory.select.call(listSVG.node(), item), item);
            var transform = zoom.getTransform(bbox);
            DAG.removenode(function(d) {
                d3.select(this).classed("visible", false).transition().duration(800).attr("transform", transform).remove();
            });
            
            draw();
        }).on("hovernodes", function(nodes) {
            graphSVG.selectAll(".node").classed("preview", function(d) {
                return nodes.indexOf(d)!=-1;
            })
            var previewed = {};
            graphSVG.selectAll(".node.preview").data().forEach(function(d) { previewed[d.id]=true; });
            graphSVG.selectAll(".edge").classed("preview", function(d) {
                return previewed[d.source.id] && previewed[d.target.id]; 
            });
        });
    }
    
    // Detaches any bound context menus
    function detachContextMenus() {
        $(".graph .node").unbind("contextmenu");    
    }
    
    // A function that attaches mouse-click events to nodes to enable node selection
    function setupEvents(){
        var nodes = graphSVG.selectAll(".node");
        var edges = graphSVG.selectAll(".edge");
        var items = listSVG.selectAll(".item");
    
        // Set up node selection events
        var select = Selectable().getrange(function(a, b) {
            var path = getNodesBetween(a, b).concat(getNodesBetween(b, a));
            return nodes.data(path, DAG.nodeid());
        }).on("select", function() {
            var selected = {};
            graphSVG.selectAll(".node.selected").data().forEach(function(d) { selected[d.id]=true; });
            edges.classed("selected", function(d) {
                return selected[d.source.id] && selected[d.target.id]; 
            });
            attachContextMenus();
            DAGTooltip.hide();
        });
        select(nodes);
    
        
        
        nodes.on("mouseover", function(d) {
            graphSVG.classed("hovering", true);
            highlightPath(d);
        }).on("mouseout", function(d){
            graphSVG.classed("hovering", false);
            edges.classed("hovered", false).classed("immediate", false);
            nodes.classed("hovered", false).classed("immediate", false);
        });
        
        // When a list item is clicked, it will be removed from the history and added to the graph
        // So we override the DAG node transition behaviour so that the new nodes animate from the click position
        items.on("click", function(d, i) {
            // Remove the item from the history and redraw the history
            history.remove(d);
            listSVG.datum(history).call(DAGHistory);
            
            // Now update the location that the new elements of the graph will enter from
            var transform = zoom.getTransform(DAGHistory.bbox().call(this, d));
            DAG.newnodetransition(function(d) {
                d3.select(this).attr("transform", transform).transition().duration(800).attr("transform", DAG.nodeTranslate);
            })
            
            // Redraw the graph and such
            draw();
        })
        
        function highlightPath(center) {        
            var path = getEntirePath(center);
            
            var pathnodes = {};
            var pathlinks = {};
            
            path.forEach(function(p) {
               pathnodes[p.source.id] = true;
               pathnodes[p.target.id] = true;
               pathlinks[p.source.id+p.target.id] = true;
            });
            
            edges.classed("hovered", function(d) {
                return pathlinks[d.source.id+d.target.id];            
            })
            nodes.classed("hovered", function(d) {
                return pathnodes[d.id];
            });
            
            var immediatenodes = {};
            var immediatelinks = {};
            immediatenodes[center.id] = true;
            center.getVisibleParents().forEach(function(p) {
                immediatenodes[p.id] = true;
                immediatelinks[p.id+center.id] = true;
            })
            center.getVisibleChildren().forEach(function(p) {
                immediatenodes[p.id] = true;
                immediatelinks[center.id+p.id] = true;
            })
            
            edges.classed("immediate", function(d) {
                return immediatelinks[d.source.id+d.target.id];
            })
            nodes.classed("immediate", function(d) {
                return immediatenodes[d.id];
            })
        }
    }
    
    // The main draw function
    function draw() {
        DAGTooltip.hide();                  // Hide any tooltips
        graphSVG.datum(graph).call(DAG);    // Draw a DAG at the graph attach
        minimapSVG.datum(graphSVG.node()).call(DAGMinimap);  // Draw a Minimap at the minimap attach
        graphSVG.selectAll(".node").call(DAGTooltip);        // Attach tooltips
        setupEvents();                      // Set up the node selection events
        refreshViewport();                  // Update the viewport settings
        attachContextMenus();
    }
    
    //Call the draw function
    draw();
    
    // Start with the graph all the way zoomed out
    resetViewport();
}