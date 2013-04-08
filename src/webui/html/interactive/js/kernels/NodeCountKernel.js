function NodeCountKernel() {}

NodeCountKernel.prototype = new Kernel();

NodeCountKernel.prototype.calculate = function(a, b) {
    // Get the labels from the graphs
    var la = a.get_labels(), lb = b.get_labels();
    
    // Merge the labels from each graph
    var labels = {};
    for (var label in la) {
        labels[label] = true;
    }
    for (var label in lb) {
        labels[label] = true;
    }
    
    // Create the feature vectors; in this case each feature is the count of nodes in the graph with that label
    var va=[], vb=[], label;
    for (label in labels) {
        if (la.hasOwnProperty(label)) {
            va.push(la[label].length);
        } else {
            va.push(0);
        }
        if (lb.hasOwnProperty(label)) {
            vb.push(lb[label].length);
        } else {
            vb.push(0);
        }
    }
    ret = dotProduct(normalize(va), normalize(vb));
    console.log(va, vb, ret);
    return ret;
}

function dotProduct(a, b) {
    var score = 0;
    for (var i = 0; i < a.length; i++) {
        score += a[i]*b[i];
    }
    return score;
}

function normalize(v) {
    var sum = v.reduce(function(prev, cur){ return prev+cur; }, 0);
    return sum > 0 ? v.map(function(e) { return e/sum; }) : v;
}