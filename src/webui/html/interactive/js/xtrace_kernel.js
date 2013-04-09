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
    var kernel = new WeisfeilerLehmanKernel();
    var edges = [];
    for (var i = 0; i < graphs.length; i++) {
        for (var j = 0; j < i; j++) {
            edges.push({"source": i, "target": j, "score": kernel.calculate(graphs[i], graphs[j]), "weight": 0});
        }
    }

    // Calculate the min, max, and mean scores
    var minEdge = edges.reduce(function(previousValue, currentValue) { 
        return currentValue.score < previousValue.score ? currentValue : previousValue; 
    }, {score: Infinity});

    var maxEdge = edges.reduce(function(previousValue, currentValue) {
        return currentValue.score > previousValue.score ? currentValue : previousValue;
    }, {score: 0});

    var meanScore = edges.reduce(function(previousValue, currentValue){
        return previousValue+currentValue.score;
    }, 0) / edges.length;

    // Calculate the edge weights as being normalized scores
    if (minEdge.score!=maxEdge.score) {
        edges.forEach(function(edge) {
            edge.weight = 1 - Math.pow((edge.score - minEdge.score) / (maxEdge.score - minEdge.score), 2);
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
                  .linkDistance(function(edge) { return 1 + edge.weight*w/2; })
                  .linkStrength(function(edge) { return 1-edge.weight;})
                  .gravity(0.03)
                  .linkStrength(0.05)
                  .charge(-10);

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

var node_count_kernel = function(a, b) {
    var ga = yarnchild_kernelgraph_for_trace(a);
    var gb = yarnchild_kernelgraph_for_trace(b);
    
    return new NodeCountKernel().calculate(ga, gb);
}