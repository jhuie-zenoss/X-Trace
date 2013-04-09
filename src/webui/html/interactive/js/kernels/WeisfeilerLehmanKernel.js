function WeisfeilerLehmanKernel(depth, /*optional*/ kernel) {
    this.depth = depth;
    this.kernel = kernel ? kernel : new NodeCountKernel();
    this.generator = new WLMultisetLabelGenerator();
}

WeisfeilerLehmanKernel.prototype = new Kernel();

WeisfeilerLehmanKernel.prototype.calculate = function(a, b) {
    var la = a.get_labels();
    var lb = b.get_labels();
    var score = 0;
    for (var label in la) {
        if (lb.hasOwnProperty(label)) {
            score += la[label].length * lb[label].length;
        }
    }
    return score;
}

WeisfeilerLehmanKernel.prototype.relabel = function(graph) {
    
}


function WLMultisetLabelGenerator() {
    this.labels = {};
    this.seed = 0;
}

WLMultisetLabelGenerator.prototype.next = function() {
    return self.seed++;
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