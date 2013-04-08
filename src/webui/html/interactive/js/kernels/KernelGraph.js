function KernelNode(id, label, data) {
    this.id = id;
    this.label = label;
    this.data = data;
}

KernelNode.prototype.field_equals = function(name, val) {
    if (this.data.hasOwnProperty(name)) {
        for (var i = 0; i < this.data[name].length; i++) {
            if (this.data[name][i]==val) return true;
        }
    }
    return false;
}
    
KernelNode.prototype.field_one_of = function(name, values) {
    for (var i = 0; i < values.length; i++) {
        if (this.field_equals(name, values[i])) return true;
    }
    return false;
}

KernelNode.fromJSON = function(json) {
    var id = json["X-Trace"][0].substr(18);
    var label = hash_report(json);
    return new KernelNode(id, label, json);
}


function KernelGraph(id, nodelist) {
    // Initialize variables
    this.id = id;
    
    // Private, internal variables
    var nodes = {};
    var parents = {};
    var children = {};
    var labels = {};
    
    var node;
    for (var i = 0; i < nodelist.length; i++) {
        node = nodelist[i];
        
        // Create empty sets to store the parents and children of each node.
        nodes[node.id] = node;
        parents[node.id] = {};
        children[node.id] = {};
        if (!labels.hasOwnProperty(node.label)) labels[node.label] = {};

        // Also remember each node's label    
        labels[node.label][node.id] = true;        
    }        

    // This function links together two nodes
    this.link = function(parent, child) {
        if (nodes.hasOwnProperty(parent.id) && nodes.hasOwnProperty(child.id)) {
            parents[child.id][parent.id] = true;
            children[parent.id][child.id] = true;
        }
    }
    
    // This function completely removes a node from the trace.
    // Each of the node's children get re-linked to the node's parents and vice versa
    this.remove = function(node) {
        // Do nothing if the node doesn't exist
        if (!nodes.hasOwnProperty(node.id)) return;
        
        // Get the children and the parents of the node
        var pid, cid, ps = parents[node.id], cs = children[node.id];
        
        // For each parent, remove the node as a child
        // For each parent, add the node's children as the parent's children
        for (pid in ps) {
            if (children.hasOwnProperty(pid)) {
                delete children[pid][node.id];
                for (cid in cs) {
                    children[pid][cid] = true;                    
                }
            }
        }
        
        // For each child, remove the node as a parent
        // For each child, add the node's parents as the child's parents
        for (cid in cs) {
            if (parents.hasOwnProperty(cid)) {
                delete parents[cid][node.id];
                for (pid in ps) {
                    parents[cid][pid] = true;
                }
            }
        }
        
        // Finally, remove all the evidence that node ever existed
        delete nodes[node.id];
        delete children[node.id];
        delete parents[node.id];
        delete labels[node.label][node.id];
        
        // If there are no other nodes sharing this node's label, remove the label too
        if (Object.keys(labels[node.label]).length==0) {
            delete labels[node.label];
        }
    }
    
    this.get_node_ids = function() {
        return Object.keys(nodes);
    }
    
    this.get_nodes = function() {
        return this.get_node_ids().map(function(id) { return nodes[id]; });
    }
    
    this.get_node_data = function() {
        return this.get_nodes().map(function(node) { return node.data; });
    }

    this.get_parent_ids = function(nodeid) {
        if (!parents.hasOwnProperty(nodeid)) {
            return [];
        }
        return Object.keys(parents[nodeid]);
    }
    
    this.get_parents = function(node) {
        return this.get_parent_ids().map(function(id) { return nodes[id]; });
    }
    
    this.get_child_ids = function(nodeid) {
        if (!children.hasOwnProperty(nodeid)) {
            return [];
        }
        return Object.keys(children[nodeid]);
    }
    
    this.get_children = function(node) {
        return this.get_child_ids().map(function(id) { return nodes[id]; });
    }
    
    this.get_labels = function() {
        var ls = {};
        Object.keys(labels).forEach(function(label) {
            ls[label] = Object.keys(labels[label]);
        })
        return ls;
    }
    
    return this;
}

KernelGraph.fromJSON = function(json) {
    var nodes = json["reports"].map(function(report) { return KernelNode.fromJSON(report); });
    var trace = new KernelGraph(json["id"], nodes);
    nodes.forEach(function(node) {
        var edges = node.data["Edge"];
        for (var i = 0; i < edges.length; i++) {
            trace.link(edges[i], node.id);
        }
    });
    return trace;
}

// Javascript impl of java's string hashcode:
// http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
String.prototype.hashCode = function(){
    var hash = 0, i, char;
    if (this.length == 0) return hash;
    for (i = 0; i < this.length; i++) {
        char = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

function hash_report(report) {
    hash = 0;
    if (report["Agent"]) hash += ("Agent:"+report["Agent"][0]).hashCode();
    if (report["Label"]) hash += ("Label:"+report["Label"][0]).hashCode();
    if (report["Class"]) hash += ("Class:"+report["Class"][0]).hashCode();
    return hash & hash;
}