function XTraceCompareGraph(attach, reports) {
    
    var w=1000, h=1000;
    
    // Twiddle the attach point a little bit
    var svg = d3.select(attach).append("svg").attr("class", "compare-graph-attach")
                                             .attr("viewBox", "0 0 " + w + " " + h )
                                             .attr("preserveAspectRatio", "xMidYMid meet");
    svg.node().oncontextmenu = function(d) { return false; };
    
    // Extract the graphs we care about
    var graphs = reports.map(function(report) { return yarnchild_kernelgraph_for_trace(report); });
    
    // Calculate pairwise distances
    var kernel = new NodeCountKernel();
    var edges = [];
    for (var i = 0; i < graphs.length; i++) {
        for (var j = 0; j < i; j++) {
            edges.push({"source": i, "target": j, "score": kernel.calculate(graphs[i], graphs[j])});
        }
    }

    // Calculate the min, max, and mean
    var min = edges.reduce(function(previousValue, currentValue) { 
        return currentValue.weight < previousValue ? currentValue.weight : previousValue; 
    }, Infinity);

    var max = edges.reduce(function(previousValue, currentValue) {
        return currentValue.weight > previousValue ? currentValue.weight : previousValue;
    }, 0);
    
    var mean = edges.reduce(function(previousValue, currentValue){
        return previousValue+currentValue.weight;
    }, 0) / edges.length;
    
    // Normalize edge weights
    if (min!=max) {
        edges.forEach(function(edge) {
            edge.weight = 1 - (edge.weight - min) / (max - min);
            console.log("edge weight is now", edge.weight);
        })
    }
    
    // Create the force layout
    var force = d3.layout.force().nodes(graphs).links(edges)
                  .on("tick", function() {
                     svg.selectAll("line").data(edges)
                       .attr("x1", function(d) { return d.source.x; })
                       .attr("y1", function(d) { return d.source.y; })
                       .attr("x2", function(d) { return d.target.x; })
                       .attr("y2", function(d) { return d.target.y; });
                     svg.selectAll("circle").data(graphs)
                       .attr("cx", function(d) { return d.x; })
                       .attr("cy", function(d) { return d.y; });
                   })
                  .size([w, h])
                  .linkDistance(function(edge) { return 20 + edge.weight*w/2; })
                  .gravity(0.03)
                  .linkStrength(0.05)

    force.start();

    // Now actually draw the nodes and edges
    svg.selectAll("line").data(edges).enter().append("line").attr("width", 1)
                                                            .attr('stroke', "#BBB");
    
    svg.selectAll("circle").data(graphs).enter().append("circle").attr("fill", "#666")
                                                                 .attr("r", 5)
                                                                 .attr("cx", function() { return Math.random()*w; })
                                                                 .attr("cy", function() { return Math.random()*h; })
                                                                 .call(force.drag);
}

var kernelgraph_for_trace = function(trace) {
    return KernelGraph.fromJSON(trace);
}

var yarnchild_kernelgraph_for_trace = function(trace) {
    // Create the full graph
    var graph = kernelgraph_for_trace(trace);
    
    console.log(graph.get_nodes().length);
    
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
        if (!yarnchild_process_ids.hasOwnProperty(node.data["ProcessID"][0])) {
            graph.remove(node);
        }
    });
    console.log(graph.get_nodes().length);
    
    return graph;
}

var node_count_kernel = function(a, b) {
    var ga = yarnchild_kernelgraph_for_trace(a);
    var gb = yarnchild_kernelgraph_for_trace(b);
    
    return new NodeCountKernel().calculate(ga, gb);
}