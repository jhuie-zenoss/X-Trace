function WeisfeilerLehmanKernel(/*optional*/ depth, /*optional*/ kernel) {
    this.depth = (depth && depth > 0) ? depth : 20;
    this.kernel = kernel ? kernel : new NodeCountKernel();
    
    var generator = new WLMultisetLabelGenerator();
    
    var relabel = function(graph, reverse) {
        // Create a new graph for the relabelling
        var next = graph.clone();
        
        // Relabel the nodes in the new graph, based on their neighbours in the old graph
        graph.get_nodes().forEach(function(node) {
            var neighbours = reverse ? graph.get_parent_labels(node) : graph.get_child_labels(node);
            next.relabel(node.id, generator.relabel(node.label, neighbours));
        });
        
        // Any node in the old graph that has no neighbours should be removed from the new graph
        graph.get_nodes().forEach(function(node) {
            var neighbours = reverse ? graph.get_parent_ids(node.id) : graph.get_child_ids(node.id);
            if (neighbours.length==0) next.remove(node.id);
        });

        return next;
    }
    
    this.calculate = function(a, b) {
        return (this.calculate_forwards(a, b) + this.calculate_backwards(a, b)) / 2;
    }
    
    this.calculate_forwards = function(a, b) {
        return this.do_calculate(a, b, false);        
    }
    
    this.calculate_backwards = function(a, b) {
        return this.do_calculate(a, b, true);
    }
    
    this.do_calculate = function(a, b, reverse) {
        var score = this.kernel.calculate(a, b);
        for (var i = 1; i < this.depth; i++) {
            a = relabel(a, reverse);
            b = relabel(b, reverse);
            score += this.kernel.calculate(a, b);
        }
        return score;        
    }
    
    this.calculate_node_stability = function(a, b) {
        var all_labels = {};
        var scores_a = {};
        var scores_b = {};
        var count_a = {};
        var count_b = {};
        a.get_node_ids().forEach(function(id) { scores_a[id] = 0; count_a[id] = 0; all_labels[id] = []; });
        b.get_node_ids().forEach(function(id) { scores_b[id] = 0; count_b[id] = 0; all_labels[id] = []; });
        
        for (var i = 0; i < this.depth; i++) {
            
            a.get_nodes().concat(b.get_nodes()).forEach(function(node) {
                all_labels[node.id].push(node.label);
            });
            
            var labels_a = a.get_labels();
            var labels_b = b.get_labels();
            console.log("Round "+i, labels_a, labels_b);
            for (var label in labels_a) {
                if (labels_b[label] && labels_b[label].length > 0) {
                    labels_a[label].forEach(function(id) {
                        scores_a[id]++;
                    });
                } else {
                }
            }
            for (var label in labels_b) {
                if (labels_a[label] && labels_a[label].length > 0) {
                    labels_b[label].forEach(function(id) {
                        scores_b[id]++;
                    });
                }
            }
            a.get_node_ids().forEach(function(id) { count_a[id]++; });
            b.get_node_ids().forEach(function(id) { count_b[id]++; });
            a = relabel(a);
            b = relabel(b);
        }
        for (var id in scores_a) {
            scores_a[id] = scores_a[id] / count_a[id];
        }
        for (var id in scores_b) {
            scores_b[id] = scores_b[id] / count_b[id];
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
    var canonical_label = label+":"+neighbour_labels.sort().join(",");
    
    // Now relabel this label if it hasn't already been relabelled
    if (!this.labels.hasOwnProperty(canonical_label)) { 
        this.labels[canonical_label] = this.next();
    }
    
    return this.labels[canonical_label];
}