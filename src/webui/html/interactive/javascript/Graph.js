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
    this.nodelist = []
    this.nodes = {};
}

Graph.prototype.addNode = function(node) {
    this.nodelist.push(node);
    this.nodes[node.id] = node;
}

Graph.prototype.getNode = function(id) {
    return this.nodes[id];
}

Graph.prototype.getNodes = function() {
    return this.nodelist;
}

Graph.prototype.getVisibleNodes = function() {
    return this.nodelist.filter(function(node) { return node.visible; });
}

Graph.prototype.getVisibleLinks = function() {
    var visible_parent_map = {};
    var start = window.performance.now();
    
    var explore_node = function(node) {
        if (visible_parent_map[node.id]) {
            return;
        }
        visible_parent_map[node.id] = {};
        var parents = node.parent_nodes;
        for (var pid in parents) {
            var parent = parents[pid];
            if (parent.visible) {
                visible_parent_map[node.id][pid] = true;
            } else {
                explore_node(parent);
                var grandparents = visible_parent_map[pid];
                for (var gpid in grandparents) {
                    visible_parent_map[node.id][gpid] = true;
                }
            }
        }
    }
    
    for (var i = 0; i < this.nodelist.length; i++) {
        explore_node(this.nodelist[i]);
    }
    
    var nodes = this.nodes;
    var ret = [];
    var visible_nodes = this.getVisibleNodes();
    for (var i = 0; i < visible_nodes.length; i++) {
        var node = visible_nodes[i];
        var parentids = visible_parent_map[node.id];
        Object.keys(parentids).forEach(function(pid) {
            ret.push({source: nodes[pid], target: node});
        })
    }
    
    console.log("getVisibleLinks:", window.performance.now()-start);

    return ret;
}

/*
 * The functions below are just simple utility functions
 */

function getNodesBetween(a, b) {
    // Returns a list containing all the nodes between a and b, including a and b
    var start = window.performance.now();
    var between = {};
    var nodesBetween = [a, b];
    var get = function(p) {
        if (between[p.id] == null) {
            if (p==b) {
                nodesBetween.push(p);
                between[p.id] = true;
            } else if (p.getParents().map(get).indexOf(true)!=-1) {
                nodesBetween.push(p);
                between[p.id] = true;
            } else {
                between[p.id] = false;
            }
        }
        return between[p.id];
    }
    get(a)
    console.log("getNodesBetween: ", (window.performance.now()-start));
    return nodesBetween;
}

function getEntirePath(center) {
    // Returns a list containing all edges leading into or from the center node
    var start = window.performance.now();    

    var visible_parent_map = {};
    var visible_child_map = {};
    var nodes = {};
    
    var explore_parents = function(node) {
        if (visible_parent_map[node.id]) {
            return;
        }
        visible_parent_map[node.id] = {};
        nodes[node.id] = node;
        var parents = node.parent_nodes;
        for (var pid in parents) {
            var parent = parents[pid];
            if (parent.visible) {
                visible_parent_map[node.id][pid] = true;
                explore_parents(parent);
            } else {
                explore_parents(parent);
                var grandparents = visible_parent_map[pid];
                for (var gpid in grandparents) {
                    visible_parent_map[node.id][gpid] = true;
                }
            }
        }
    }
    
    var explore_children = function(node) {
        if (visible_child_map[node.id]) {
            return;
        }
        visible_child_map[node.id] = {};
        nodes[node.id] = node;
        var children = node.child_nodes;
        for (var cid in children) {
            var child = children[cid];
            if (child.visible) {
                visible_child_map[node.id][cid] = true;
                explore_children(child);
            } else {
                explore_children(child);
                var grandchildren = visible_child_map[cid];
                for (var gcid in grandchildren) {
                    visible_child_map[node.id][gcid] = true;
                }
            }
        }
    }
    
    explore_parents(center);
    explore_children(center);
    
    var path = [];

    for (var targetid in visible_parent_map) {
        var target = nodes[targetid];
        var sourceids = visible_parent_map[targetid];
        for (var sourceid in sourceids) {
            var source = nodes[sourceid];
            path.push({source: source, target: target});
        }
    }
    
    for (var sourceid in visible_child_map) {
        var source = nodes[sourceid];
        var targetids = visible_child_map[sourceid];
        for (var targetid in targetids) {
            var target = nodes[targetid];
            path.push({source: source, target: target});
        }
    }

  console.log("getEntirePath: ", (window.performance.now()-start));
    
    return path;
}

function values(obj) {
    return Object.keys(obj).map(function(key) { return obj[key]; });
}

function flatten(arrays) {
    var flattened = [];
    return flattened.concat.apply(flattened, arrays);
}