function WeisfeilerLehmanKernel(/*optional*/ depth, /*optional*/ kernel) {
    this.depth = (depth && depth > 0) ? depth : 20;
    this.kernel = kernel ? kernel : new NodeCountKernel();
    
    generator = new WLMultisetLabelGenerator();
    
    var relabel = function(graph) {
        // Create a new graph for the relabelling
        var next = graph.clone();
        
        // Relabel all the nodes in the graph with their neighbours
        next.get_nodes().forEach(function(node) {
            var neighbours = next.get_child_labels(node);
            node.label = this.generator.relabel(node.label, neighbours);
        });
        
        // Anybody who actually has no neighbours should be removed, to prevent over representation
        next.get_node_ids().forEach(function(id) {
            if (next.get_child_ids(id).length==0) next.remove(id);
        })
        return next;
    }
    
    this.calculate = function(a, b) {
        var score = this.kernel.calculate(a, b);
        for (var i = 1; i < this.depth; i++) {
            a = relabel(a);
            b = relabel(b);
            score += this.kernel.calculate(a, b);
        }
        return score;        
    }
    
    this.calculate_node_stability = function(a, b) {
        var scores_a = {};
        var scores_b = {};
        a.get_node_ids().forEach(function(id) { scores_a[id] = 0; });
        b.get_node_ids().forEach(function(id) { scores_b[id] = 0; });
        
        for (var i = 0; i < this.depth; i++) {
            var labels_a = a.get_labels();
            var labels_b = b.get_labels();
            for (var label in labels_a) {
                if (labels_b[label] && labels_b[label].length > 0) {
                    labels_a[label].forEach(function(id) {
                        scores_a[id]++;
                    });
                }
            }
            for (var label in labels_b) {
                if (labels_a[label] && labels_a[label].length > 0) {
                    labels_b[label].forEach(function(id) {
                        scores_b[id]++;
                    });
                }
            }
            a = relabel(a);
            b = relabel(b);
        }
        return [scores_a, scores_b];
    }
}

WeisfeilerLehmanKernel.prototype = new Kernel();

function WLMultisetLabelGenerator() {
    this.labels = {};
    this.seed = 0;
}

WLMultisetLabelGenerator.prototype.next = function() {
    return this.seed++;
}

WLMultisetLabelGenerator.prototype.relabel = function(label, /*optional*/neighbour_labels) {
    if (!neighbour_labels) neighbour_labels = [];
    
    // First, figure out the label, making sure neighbours are sorted
    var label = label+":"+neighbour_labels.sort().join(",");
    
    // Now relabel this label if it hasn't already been relabelled
    if (!this.labels.hasOwnProperty(label)) { 
        this.labels[label] = this.next();
    }
    
    return this.labels[label];
}