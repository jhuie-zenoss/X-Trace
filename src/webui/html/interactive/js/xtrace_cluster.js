function XTraceClusterViz(attach, data) {

    var w=1000, h=1000, edges = [], nodes = [], nodemap = {};
    
    // Twiddle the attach point a little bit
    var svg = d3.select(attach).append("svg").attr("class", "compare-graph")
                                             .attr("viewBox", "0 0 " + w + " " + h )
                                             .attr("preserveAspectRatio", "xMidYMid meet");
    svg.node().oncontextmenu = function(d) { return false; };
    
    // Set up the tooltip and context menu
    var tooltip = CompareTooltip();
    var ctxmenu = CompareGraphContextMenu();
    ctxmenu.on("open", tooltip.hide)
           .on("view", function(d) {
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
                window.open("cluster.html?id="+Object.keys(ids).join(","),'_blank');
            }).on("compare", function(ds) {
                var trace_ids = [];
                var process_ids = {};
                ds.forEach(function(d) {
                    var reports = d.get_node_data();
                    reports.forEach(function(report) {
                        if (report["ProcessID"]) {
                            process_ids[report["ProcessID"][0]] = true;
                        }
                    });
                    trace_ids.push(d.get_id());
                });
                window.open("compare.html?id="+trace_ids.join(",")+"&processid="+Object.keys(process_ids).join(",")+"&lightweight=true", "_blank");
            });
    
    // The callback function whenever the force ticks; use to update positions of elements
    function update_positions() {
        svg.selectAll(".edge").attr("x1", function(d) { return d.source.x ? d.source.x : 0; })
                              .attr("y1", function(d) { return d.source.y ? d.source.y : 0; })
                              .attr("x2", function(d) { return d.target.x ? d.target.x : 0; })
                              .attr("y2", function(d) { return d.target.y ? d.target.y : 0; })
        svg.selectAll(".node").attr("cx", function(d) { return d.x ? d.x : 0; })
                              .attr("cy", function(d) { return d.y ? d.y : 0; })
        svg.selectAll(".edgelabel").attr("transform", function(d) { 
            var x = (d.source.x + d.target.x) / 2;
            var y = (d.source.y + d.target.y) / 2;
            return "translate(" + (x ? x : 0) + "," + (y ? y : 0) + ")"; 
        });        
    }

    // Create the force layout
    var force = d3.layout.force().size([w, h]).gravity(0.03).linkStrength(0.05).charge(-10).alpha(0.5)
                  .linkDistance(function(edge) { return 1 + edge.weight*w/2; })
                  .linkStrength(function(edge) { return 1 - edge.weight; })
                  .on("tick", update_positions);

    // Callback for when a node is clicked
    function node_click(d, e) {
        if (!d3.event.ctrlKey) svg.selectAll(".node").classed("selected", false);
        d3.select(this).classed("selected", !d3.select(this).classed("selected"));
        svg.selectAll(".node").each(function(d) { d.selected = d3.select(this).classed("selected"); });
        draw();
    }
    
    function draw() {
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

        // Now actually draw the nodes and edges
        svg.selectAll(".edge").data(edges).enter().insert("line", ":first-child").classed("edge", true);
        svg.selectAll(".node").data(nodes).enter().append("circle").classed("node", true).attr("r", 10);
        svg.selectAll(".node").call(tooltip).call(force.drag);//.on("click", node_click);
        svg.selectAll(".edgelabel").data(edges).enter().append("g").attr("class", "edgelabel")
                                                       .append("text").attr("dx", 1)
                                                       .attr("dy", ".35em")
                                                       .attr("text-anchor", "middle")
                                                       .text(function(d) { return d.score; });
        
        // Reattach new menus
        ctxmenu.call(svg.node(), svg.selectAll(".node"));

        // Update the selected stuff
        svg.selectAll(".edge").classed("visible", function(d) {
            return d.source.selected && d.target.selected;
        });
        svg.selectAll(".edgelabel").classed("visible", function(d) {
            return d.source.selected && d.target.selected;
        });
        
        // Restart the force
        force.stop().nodes(nodes).links(edges).alpha(0.5).start();
    }

    // Set up the worker and start calculating the distances
    console.log("Kicking off worker");
    var worker = new Worker("js/kernels/KernelWorker.js");
    worker.onmessage = function(event) {
        if (event.data.hasOwnProperty("node")) {
            var node = event.data.node;
            console.log("Worker adding node", node.id);
            nodes.push(nodemap[node.id]);
        } else if (event.data.hasOwnProperty("edge")) {
            var edge = event.data.edge;
            console.log("Worker adding edge between", edge.source, edge.target);
            edge.source = nodemap[edge.source];
            edge.target = nodemap[edge.target];
            edges.push(edge);
        }
        draw();
    }
    worker.postMessage(data);
    
    console.log("Extracting Yarnchild Graphs");
    data.forEach(function(report) { nodemap[report.id] = yarnchild_kernelgraph_for_trace(report); });
    console.log("Done, awaiting worker results");
}
