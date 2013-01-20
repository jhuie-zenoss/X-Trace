function DirectedAcyclicGraph() {
    
    /*
     * Main rendering function
     */
    function graph(selection) {
        selection.each(function(data) {   
            // Select the g element that we draw to, or add it if it doesn't exist
            var svg = d3.select(this).selectAll("svg").data([data]);
            svg.enter().append("svg").append("g").attr("class", "graph");
            
            // Get the edges and nodes from the data.  Can have user-defined accessors
            var edges = getedges.call(this, data);
            var nodes = getnodes.call(this, data);
            
            // Get the nodes and edges
            var existing_edges = svg.select(".graph").selectAll(".edge").data(edges, edgeid);
            var existing_nodes = svg.select(".graph").selectAll(".node").data(nodes, nodeid);
            
            var removed_edges = existing_edges.exit();
            var removed_nodes = existing_nodes.exit();
            
            var new_edges = existing_edges.enter().insert("path", ":first-child").attr("class", "edge");
            var new_nodes = existing_nodes.enter().append("g").attr("class", "node");
            
            var ge = d3.select(this);
            new_edges.on("click", function(d) { 
                        if (d.isExpanded()) { 
                            d.contract(); 
                        } else { 
                            d.expand(); 
                        }
                        refreshGraph(ge, data);
                    });
            new_nodes.on("mouseover", function(d){ 
                d3.select(this).select("rect").style("fill", "aliceblue"); 
            }).on("mouseout", function(d){ 
                d3.select(this).select("rect").style("fill", ""); 
            }).on("click", function(d){
               for (var key in d.report) {
                   console.log(key + ": ", d.report[key]);
               }
            });
            
            // Draw new nodes and remove anything that on longer exists
            new_nodes.each(drawnode);
            removed_edges.transition().duration(200).attr("opacity", 1e-6).remove();
            removed_nodes.transition().duration(200).attr("opacity", 1e-6).remove();
            
            // Do the layout
            layout.call(svg.select(".graph").node(), nodes, edges);
            
            // Draw the new edges and then animate them into position
            new_edges.each(drawedge);

            existing_edges.transition().delay(100).attrTween("d", edgeTween);
            existing_nodes.transition().delay(100).attr("transform", transform);
            
            new_edges.attr("d", splineGenerator).attr("opacity", 1e-6)
                     .transition().delay(random(200, 400)).duration(800).attr("opacity", 1);
            new_nodes.attr("transform", transform).attr("opacity", 1e-6)
                     .transition().delay(random(50, 350)).duration(700).attr("opacity", 1);
        });
        
    }


    /*
     * Settable variables and functions
     */
    var edgeid = function(d) { return d.source.id + d.target.id; }
    var nodeid = function(d) { return d.id; }
    var nodename = function(d) { return d.report["Agent"] ? d.report["Agent"][0] : ""; }
    var getnodes = function(d) { return d.getNodes(); }
    var getedges = function(d) { return d.getLinks(); }
    var bbox = function(d) {
        var nodePadding = 10;
        var bbox = d3.select(this).select("text").node().getBBox();
        bbox.width += 2*nodePadding; bbox.height += 2*nodePadding;
        return bbox;
    }
    var drawnode = function(d) {
        // Attach the DOM elements
        var rect = d3.select(this).append("rect");
        var text = d3.select(this).append("text").attr("text-anchor", "middle").attr("x", 0);
        text.append("tspan").attr("x", 0).attr("dy", "1em").text(nodeid);
        text.append("tspan").attr("x", 0).attr("dy", "1.1em").text(nodename);
        
        // Size and position the DOM elements
        var node_bbox = bbox.call(this, d);
        var text_bbox = text.node().getBBox();
        rect.attr("x", -node_bbox.width/2).attr("y", -node_bbox.height/2)
        rect.attr("width", node_bbox.width).attr("height", node_bbox.height);
        text.attr("x", -text_bbox.width/2).attr("y", -text_bbox.height/2);
    }    
    var drawedge = function(d) {
        // Just style the edge for now
        d3.select(this).attr("stroke", "#333");
    }
    var layout = function(nodes_d, edges_d) {
        // Dagre requires the width, height, and bbox of each node to be attached to that node's data
        d3.select(this).selectAll(".node").each(function(d) {
            d.bbox = bbox.call(this, d);
            d.width = d.bbox.width;
            d.height = d.bbox.height;
        });
        
        // Call dagre layout.  Store layout data such that calls to x(), y() and points() will return them
        dagre.layout().nodeSep(50).edgeSep(10).rankSep(30).nodes(nodes_d).edges(edges_d).run();    
        
        // Also we want to make sure that the control points for all the edges overlap the nodes nicely
        d3.select(this).selectAll(".edge").each(function(d) {
            var p = d.dagre.points;
            p.push(dagre.util.intersectRect(d.target.dagre, p.length > 0 ? p[p.length - 1] : d.source.dagre));
            p.splice(0, 0, dagre.util.intersectRect(d.source.dagre, p[0]));
            p[0].y -= 5; p[p.length-1].y += 5; 
        });
    }
    var transform = function(d) {
        // Function to return the 'transform' value of nodes after layout
        return "translate(" + d.dagre.x + "," + d.dagre.y +")";
    }
    var points = function(d) {
        // Get the points of an edge after layout
        return d.dagre.points; 
    }
    
    
    /*
     * A couple of private non-settable functions
     */
    function splineGenerator(d) {
        return d3.svg.line().x(function(d) { return d.x }).y(function(d) { return d.y }).interpolate("basis")(points.call(this, d));
    }
    
    function edgeTween(d) {
        var d1 = splineGenerator.call(this, d);
        var path0 = this, path1 = path0.cloneNode();                           
        var n0 = path0.getTotalLength(), n1 = (path1.setAttribute("d", d1), path1).getTotalLength();

        // Uniform sampling of distance based on specified precision.
        var distances = [0], i = 0, dt = 4 / Math.max(n0, n1);
        while ((i += dt) < 1) distances.push(i);
        distances.push(1);

        // Compute point-interpolators at each distance.
        var points = distances.map(function(t) {
            var p0 = path0.getPointAtLength(t * n0),
                p1 = path1.getPointAtLength(t * n1);
            return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
        });

        return function(t) {
            return t < 1 ? "M" + points.map(function(p) { return p(t); }).join("L") : d1;
        };
    }
    
    function random(min, max) {
        return function() { return min + (Math.random() * (max-min)); }
    }
    
    
    /*
     * Getters and setters for settable variables and function
     */
    graph.edgeid = function(_) { if (!arguments.length) return edgeid; edgeid = _; return graph; }
    graph.nodeid = function(_) { if (!arguments.length) return nodeid; nodeid = _; return graph; }
    graph.nodename = function(_) { if (!arguments.length) return nodename; nodename = _; return graph; }
    graph.nodes = function(_) { if (!arguments.length) return getnodes; getnodes = _; return graph; }
    graph.edges = function(_) { if (!arguments.length) return getedges; getedges = _; return graph; }
    graph.bbox = function(_) { if (!arguments.length) return bbox; bbox = _; return graph; }
    graph.drawnode = function(_) { if (!arguments.length) return drawnode; drawnode = _; return graph; }
    graph.drawedge = function(_) { if (!arguments.length) return drawedge; drawedge = _; return graph; }
    graph.layout = function(_) { if (!arguments.length) return layout; layout = _; return graph; }
    graph.transform = function(_) { if (!arguments.length) return transform; transform = _; return graph; }
    graph.points = function(_) { if (!arguments.length) return points; points = _; return graph; }
    
    return graph;
}