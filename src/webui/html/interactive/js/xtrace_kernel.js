function XTraceCompareGraph(attach, data) {
    
    var w=1000, h=1000;
    
    // Create the tooltip
    var tooltip = CompareTooltip();
    var ctxmenu = CompareGraphContextMenu();
    
    // Twiddle the attach point a little bit
    var svg = d3.select(attach).append("svg").attr("class", "compare-graph")
                                             .attr("viewBox", "0 0 " + w + " " + h )
                                             .attr("preserveAspectRatio", "xMidYMid meet");
    svg.node().oncontextmenu = function(d) { return false; };

    // Extract the graphs we care about
    var graphs = data.map(function(report) { return yarnchild_kernelgraph_for_trace(report); });

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
                  .charge(-10)
                  .alpha(0.5);

    force.start();
    
    function onNodeClick(d, e) {
        if (!d3.event.ctrlKey) {
            d3.selectAll(".node").classed("selected", false);
        }
        d3.select(this).classed("selected", !d3.select(this).classed("selected"));
    }

    // Now actually draw the nodes and edges
    svg.selectAll(".edge").data(edges).enter().append("line").classed("edge", true);
    
    svg.selectAll(".node").data(graphs).enter().append("circle").classed("node", true)
                           .attr("r", 10)
                           .attr("cx", function() { return Math.random()*w; })
                           .attr("cy", function() { return Math.random()*h; });
    svg.selectAll(".node").call(tooltip)
                          .call(force.drag)
                          .on("click", onNodeClick);
    
    ctxmenu.call(svg, svg.selectAll(".node"));
    ctxmenu.on("open", function() {
        tooltip.hide();
    }).on("view", function(d) {
        var reports = d.get_node_data();
        var process_ids = {};
        reports.forEach(function(report) {
            if (report["ProcessID"]) {
                process_ids[report["ProcessID"][0]] = true;
            }
        });
        window.open("graph.html?id="+d.get_id()+"&processid="+Object.keys(process_ids).join(",")+"&lightweight=true", "_blank");
    }).on("hide", function(ds) {
        ids = {};
        graphs.map(function(d) {
            ids[d.get_id()] = true;
        })
        ds.map(function(d) {
            delete ids[d.get_id()];
        })
        window.open("compare.html?id="+Object.keys(ids).join(","),'_blank');
    });
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