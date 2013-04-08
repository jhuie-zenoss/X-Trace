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
        if (!(node.data["ProcessID"][0] in yarnchild_process_ids)) {
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