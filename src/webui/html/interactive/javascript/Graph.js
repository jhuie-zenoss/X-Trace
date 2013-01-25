/*
 * This file contains the prototypes for Graph and Node
 */

var Node = function(id) {
    // Save the arguments
    this.id = id;
    
    // Default values for internal variables
    this.visible              = true;
    this.child_nodes          = {}; // The immediate child nodes in the graph, regardless of visibility
    this.parent_nodes         = {}; // The immediate parent nodes in the graph, regardless of visibility
}

Node.prototype.addChild = function(child) {
    this.child_nodes[child.id] = child;
}

Node.prototype.addParent = function(parent) {
    this.parent_nodes[parent.id] = parent;
}

Node.prototype.getParents = function() {
    return values(this.parent_nodes);
}

Node.prototype.getChildren = function() {
    return values(this.child_nodes);
}

Node.prototype.getVisibleParents = function() {   
    var visible_parents = {};
    for (var parent_id in this.parent_nodes) {
        var parent = this.parent_nodes[parent_id];
        if (parent.visible) {
            visible_parents[parent_id] = parent;
        } else {
            var grandparents = parent.getVisibleParents();
            for (var i = 0; i < grandparents.length; i++) {
                visible_parents[grandparents[i].id] = grandparents[i];
            }
        }
    }
    return values(visible_parents);
}

Node.prototype.getVisibleChildren = function() {
    var visible_children = {};
    for (var child_id in this.child_nodes) {
        var child = this.child_nodes[child_id];
        if (child.visible) {
            visible_children[child_id] = child;
        } else {
            var grandchildren = child.getVisibleChildren();
            for (var i = 0; i < grandchildren.length; i++) {
                visible_children[grandchildren[i].id] = grandchildren[i];
            }
        }
    }
    return values(visible_children);
}

var Graph = function() {
    // Default values for internal variables
    this.nodes = []
}

Graph.prototype.addNode = function(node) {
    this.nodes.push(node);
}

Graph.prototype.getNodes = function() {
    return this.nodes;
}

Graph.prototype.getVisibleNodes = function() {
    return this.nodes.filter(function(node) { return node.visible; });
}

Graph.prototype.getVisibleLinks = function() {
    var links = this.getVisibleNodes().map(function(node) { 
        return node.getVisibleParents().map(function(parent) {
            return { "source": parent, "target": node };
        }); 
    });
    return flatten(links);
}

/*
 * The functions below are just simple utility functions
 */

var values = function(obj) {
    return Object.keys(obj).map(function(key) { return obj[key]; });
}

var flatten = function(arrays) {
    var flattened = [];
    return flattened.concat.apply(flattened, arrays);
}