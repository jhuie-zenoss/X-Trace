function DirectedAcyclicGraph() {
    /*
     * Main rendering function
     */
    function graph(selection) {
        selection.each(function(data) {   
            // Select the g element that we draw to, or add it if it doesn't exist
            var svg = d3.select(this).selectAll("svg").data([data]);
            svg.enter().append("svg").append("g").attr("class", "graph");
            
            // Size the chart
            svg.attr("width", width.call(this, data));
            svg.attr("height", height.call(this, data));            
            
            // Get the edges and nodes from the data.  Can have user-defined accessors
            var edges = getedges.call(this, data);
            var nodes = getnodes.call(this, data);
            
            // Get the nodes and edges
            var existing_edges = svg.select(".graph").selectAll(".edge").data(edges, edgeid);
            var existing_nodes = svg.select(".graph").selectAll(".node").data(nodes, nodeid);
            
            var removed_edges = existing_edges.exit();
            var removed_nodes = existing_nodes.exit();
            
            var new_edges = existing_edges.enter().insert("path", ":first-child").attr("class", "edge").attr("stroke", "#333");
            var new_nodes = existing_nodes.enter().append("g").attr("class", "node");
            
            // Draw new nodes and remove anything that on longer exists
            new_nodes.each(drawnode);
            removed_edges.transition().duration(200).attr("opacity", 1e-6).remove();
            removed_nodes.transition().duration(200).attr("opacity", 1e-6).remove();
            
            // Do the layout
            layout.call(svg.select(".graph").node(), nodes, edges);
            
            // Animate into new positions
            existing_edges.transition().delay(100).attrTween("d", graph.edgeTween);
            existing_nodes.transition().delay(100).attr("transform", graph.nodeTranslate);
            
            new_edges.attr("d", graph.splineGenerator).attr("opacity", 1e-6)
                     .transition().delay(random(200, 400)).duration(800).attr("opacity", 1);
            new_nodes.attr("transform", graph.nodeTranslate).attr("opacity", 1e-6)
                     .transition().delay(random(50, 350)).duration(700).attr("opacity", 1);
        });
        
    }


    /*
     * Settable variables and functions
     */
    var width = d3.functor("100%");
    var height = d3.functor("100%");
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
        
        // Update the size and position
        refreshnode.call(this, d);
    }    
    var refreshnode = function(d) {
        // Just update the position as this can be finnicky
        var node_bbox = bbox.call(this, d);
        var rect = d3.select(this).select('rect'), text = d3.select(this).select('text');
        var text_bbox = text.node().getBBox();
        rect.attr("x", -node_bbox.width/2).attr("y", -node_bbox.height/2)
        rect.attr("width", node_bbox.width).attr("height", node_bbox.height);
        text.attr("x", -text_bbox.width/2).attr("y", -text_bbox.height/2);
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
    var nodepos = function(d) {
        // Returns the {x, y} location of a node after layout
        return d.dagre;
    }
    var edgepos = function(d) {
        // Returns a list of {x, y} control points of an edge after layout
        return d.dagre.points; 
    }
    
    
    /*
     * A couple of private non-settable functions
     */
    graph.splineGenerator = function(d) {
        return d3.svg.line().x(function(d) { return d.x }).y(function(d) { return d.y }).interpolate("basis")(edgepos.call(this, d));
    }
    
    graph.edgeTween = function(d) {
        var d1 = graph.splineGenerator.call(this, d);
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
    
    graph.nodeTranslate = function(d) {
        var pos = nodepos.call(this, d);
        return "translate(" + pos.x + "," + pos.y + ")";
    }
    
    function random(min, max) {
        return function() { return min + (Math.random() * (max-min)); }
    }
    
    
    /*
     * Getters and setters for settable variables and function
     */
    graph.width = function(_) { if (!arguments.length) return width; width = d3.functor(_); return graph; }
    graph.height = function(_) { if (!arguments.length) return height; height = d3.functor(_); return graph; }
    graph.edgeid = function(_) { if (!arguments.length) return edgeid; edgeid = _; return graph; }
    graph.nodeid = function(_) { if (!arguments.length) return nodeid; nodeid = _; return graph; }
    graph.nodename = function(_) { if (!arguments.length) return nodename; nodename = _; return graph; }
    graph.nodes = function(_) { if (!arguments.length) return getnodes; getnodes = d3.functor(_); return graph; }
    graph.edges = function(_) { if (!arguments.length) return getedges; getedges = d3.functor(_); return graph; }
    graph.bbox = function(_) { if (!arguments.length) return bbox; bbox = d3.functor(_); return graph; }
    graph.drawnode = function(_) { if (!arguments.length) return drawnode; drawnode = _; return graph; }
    graph.refreshnode = function(_) { if (!arguments.length) return refreshnode; refreshnode = _; return graph; }
    graph.layout = function(_) { if (!arguments.length) return layout; layout = _; return graph; }
    graph.nodepos = function(_) { if (!arguments.length) return nodepos; nodepos = _; return graph; }
    graph.edgepos = function(_) { if (!arguments.length) return edgepos; edgepos = _; return graph; }
    
    return graph;
}