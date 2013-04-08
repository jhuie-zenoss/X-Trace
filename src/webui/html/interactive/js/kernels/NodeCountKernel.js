function NodeCountKernel() {}

NodeCountKernel.prototype = new Kernel();

NodeCountKernel.prototype.calculate = function(a, b) {
    var la = a.get_labels();
    var lb = b.get_labels();
    var score = 0;
    for (var label in la) {
        console.log(label);
        if (label in lb) {
            console.log(la[label]);
            console.log(lb[label]);
            score += la[label].length * lb[label].length;
        }
    }
    return score;
}