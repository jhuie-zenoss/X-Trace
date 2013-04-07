function NodeCountKernel() {}

NodeCountKernel.prototype = new Kernel();

NodeCountKernel.prototype.calculate = function() {
    console.log("nodecountkernel calculate");
}