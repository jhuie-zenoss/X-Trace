function KernelNode(id, label, data) {
    this.id = id;
    this.label = label;
    this.data = data;
    
    this.field_equals = function(name, val) {
        for (x in this.data[name]) {
            if (x==val) return true;
        }
        return false;
    }
    
    this.field_one_of = function(name, values) {
        for (value in values) {
            if (this.field_equals(name, value)) {
                return true;
            }
        }
        return false;
    }
    
    return this;
}

KernelNode.fromJSON = function(json) {
    var id = json["X-Trace"][0].substr(18);
    var label = hash_report(json);
    return KernelNode(id, label, json);
}


function KernelTrace(id, nodes) {
    // Set shit up
    this.id = id;
    this.nodes = nodes;
    this.parents = {};
    this.children = {};
    this.labels = {};
    for (node in nodes) {
        this.nodes[node.id] = node;
        this.parents[node.id] = {};
        this.children[node.id] = {};
        if (!(node.label in this.labels)) this.labels[node.label] = {}
        this.labels[node.label][node.id] = true;        
    }        
    
    // Add some methods
    this.link = function(parent, child) {
        if (parent in this.nodes && child in this.nodes) {
            this.parents[child][parent] = true;
            this.children[parent][child] = true;
        }
    }
    
    this.remove = function(node) {
        if (!(node.id in this.nodes)) return
        node_id = node.id;
        node_parents = this.parents[node_id];
        node_children = this.children[node_id];
        for (parent_id in Object.keys(node_parents)) {
            if (parent_id in this.children) {
                delete this.children[parent_id][node_id];
                for (child_id in Object.keys(node_children)) {
                    this.children[parent_id][child_id] = true;                    
                }
            }
        }
        for (child_id in Object.keys(node_children)) {
            if (child_id in this.parents) {
                delete this.parents[child_id][node_id];
                for (parent_id in Object.keys(node_parents)) {
                    this.parents[child_id][parent_id] = true;
                }
            }
        }
        delete this.nodes[node_id];
        delete this.children[node_id];
        delete this.parents[node_id];
        delete this.labels[node.label][node_id];
        if (Object.keys(this.labels[node.label]).length==0) {
            delete this.labels[node.label];
        }
    }
    
    this.get_nodes = function() {
        
    }
    
    return this;
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
    hash = ("Agent:"+report["Agent"][0]).hashCode()+
           ("Label:"+report["Label"][0]).hashCode()+
           ("Class:"+report["Class"][0]).hashCode()
    return hash & hash;
}