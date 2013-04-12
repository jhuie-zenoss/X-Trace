importScripts("../xtrace_utils.js", "KernelGraph.js", "Kernel.js", "NodeCountKernel.js", "WeisfeilerLehmanKernel.js");

onmessage = function(event) {
    var kernel = new WeisfeilerLehmanKernel();
    var graphs = event.data.map(function(report) { return yarnchild_kernelgraph_for_trace(report); });
    var i, j, a, b, score;
    for (i = 0; i < graphs.length; i++) {
        a = graphs[i];
        postMessage({"node": {"id": a.get_id()}});
        for (j = 0; j < i; j++) {
            b = graphs[j];
            score = kernel.calculate(a, b);
            postMessage({"edge": {"source": a.get_id(), "target": b.get_id(), "score": score}});
        }
    }
};