var flatten = function(array) {
    var empty = [];
    return empty.concat.apply(empty, array);
}

var extractLinks = function(tail) {
    if (tail.extracted) {
        console.log("Extracting links from ", tail, "already been extracted");
        return [];
    } else if (tail.parents.length==0) {
        console.log("Extracting links from ", tail, "no parents");
        return [];        
    } else {
        tail.extracted = true;
        
        var links = [];
        var sharedRoot
        if (tail.parents.length > 1 && (sharedRoot=getSharedRoot(tail))) {
            console.log("Extracting links from ", tail, "shared root");
            // There is a shared root.  Continue from the shared root
            links = extractLinks(sharedRoot);
            
            // Now get the sublinks
            var sublinks = [];
            tail.parents.forEach(function(parent) {
                if (parent!=sharedRoot) {
                    sublinks = sublinks.concat(extractLinks(parent));
                    sublinks.push(new ExpandableLink(parent, tail));
                }                
            });
            
            // Put the shared link
            links.push(new ExpandableLink(sharedRoot, tail, sublinks));            
        } else {
            console.log("Extracting links from ", tail, "no shared root");
            // No shared root or just one parent.  Simply get the links
            tail.parents.forEach(function(parent) {
                links = links.concat(extractLinks(parent));
                links.push(new ExpandableLink(parent, tail));
            });
        }
        
        console.log("extracted", links);
        return links;
    }
}

var getSharedRoot = function(sharedTail) {
    // Find the parent with the lowest sequence number
    var earliestParent = sharedTail;
    sharedTail.parents.map(function(parent) { if (parent.n < earliestParent.n) { earliestParent = parent; }});
    
    // See whether the earliest parent is a root of all the parent nodes
    var checkRootConvergence = function(root, node) {
        if (node == root) {
            return true;
        } else if (node.n < root.n) {
            return false;
        } else {
            for (var i = 0; i < node.parents.length; i++) {
                if (!checkRootConvergence(root, node.parents[i])) {
                    return false;
                }
            }
            return true;
        }
    }
    
    // Also make sure that the sharedTail is a tail of all of the earliestParent's children    
    var checkTailConvergence = function(tail, node) {
        if (node == tail) {
            return true;
        } else if (node.n > tail.n) {
            return false;
        } else {
            for (var i = 0; i < node.children.length; i++) {
                if (!checkTailConvergence(tail, node.children[i])) {
                    return false;
                }
            }
            return true;
        }
    }
    
    if (earliestParent!=sharedTail && checkRootConvergence(earliestParent, sharedTail) && checkTailConvergence(sharedTail, earliestParent)) {
        return earliestParent;
    }
}



var ExpandableLink = function(source, target, links) {
    this.expanded = false;
    this.source = source;
    this.target = target;
    this.links = links || [];
}

ExpandableLink.prototype.isExpandable = function() {
    return this.links.length > 0;
}

ExpandableLink.prototype.isExpanded = function() {
    return this.isExpandable() && this.expanded;
}

ExpandableLink.prototype.expand = function() {
    if (this.isExpandable()) {
        this.expanded = true;
    }
}

ExpandableLink.prototype.contract = function() {
    this.expanded = false;
}

ExpandableLink.prototype.getLinks = function() {
    var links = [];
    if (this.isExpanded()) {
        links = flatten(this.links.map(function(link) { return link.getLinks(); }));
    }
    links.push(this);
    return links;
}

ExpandableLink.prototype.clearLayout = function() {
    this.source.clearLayout();
    this.target.clearLayout();
    delete this.dagre;
    this.links.forEach(function(link) { link.clearLayout(); });
}



var ExpandableGraph = function(graph) {
    /**
     *  Represents an expandable graph
     *  graph - the full, source graph representation
     */
    this.graph = graph;
    var links = [];
    graph.getTails().forEach(function(tail) {
        links = links.concat(extractLinks(tail));
    });
    this.links = links;
    console.log("links: ", this.links);
}

ExpandableGraph.prototype.layout = function() {
    /** Lays out the graph. */
    // First, clear the old layout
    //this.links.forEach(function(link) { link.clearLayout(); });
    
    // Then, get all the links
    var links = this.getLinks();
    
    // Extract the nodes from the links
    var nodes = this.getNodes();
    
    // Do the layout with dagre
    dagre.layout()
         .nodeSep(50)
         .edgeSep(10)
         .rankSep(30)
         .nodes(nodes)
         .edges(links)
         .run();
}

ExpandableGraph.prototype.getNodes = function() {
    // Extract the nodes from the links
    var nodemap = {};
    this.getLinks().forEach(function(link) { nodemap[link.source.id] = link.source; nodemap[link.target.id] = link.target; });
    return Object.keys(nodemap).map(function(id) { return nodemap[id]; });
}

ExpandableGraph.prototype.getLinks = function() {
    return flatten(this.links.map(function(link) { return link.getLinks(); }));
}




var Graph = function(reports) {
    // Variables to hold graph nodes and such
    this.nodes = {};
    this.nodelist = [];
    
    // Extract the nodes from the reports
    for (var i = 0; i < reports.length; i++) {
        this.addNode(new Node(this, i, reports[i]));
    }
    
    // Make sure everyone points to tail and root
    for (var i = 1; i < this.nodelist.length; i++) {
        if (this.nodelist[i].parents==[]) {
            this.nodelist[i].parents = [ this.nodelist[0] ];
        }
    }
    
    for (var i = 0; i < this.nodelist.length-1; i++) {
        if (this.nodelist[i].children==[]) {
            this.nodelist[i].children = [ this.nodelist[this.nodelist.length-1] ];
        }
    }
}

Graph.prototype.addNode = function(node) {
    this.nodes[node.id] = node;
    this.nodelist.push(node);
}

Graph.prototype.getNode = function(id) {
    return this.nodes[id];
}

Graph.prototype.getRoots = function() {
    /* Find all nodes that have no parents */
    var roots = [];
    this.nodelist.forEach(function (node) {
        if (node.parents.length==0) {
            roots.push(node);
        }
    });
    return roots;
}

Graph.prototype.getTails = function() {
    /* Find all nodes that have no children */
    var tails = [];
    this.nodelist.forEach(function (node) {
        if (node.children.length==0) {
            tails.push(node);
        }
    });
    return tails;
}




var Node = function(graph, n, report) {
    // Save the arguments
    this.n = n;
    this.report = report;
    
    // Extract id from the report
    this.id = report["X-Trace"][0].substr(18);
    
    // Default values
    this.children = [];
    this.parents = [];

    // Extract the edges and save the parents to this node, as well as adding this node to the parent's children list
    var child = this;
    var parentids = {};
    // remove duplicates
    report["Edge"].forEach(function(parentid) {
        parentids[parentid] = true;
    });
    // create edges
    Object.keys(parentids).forEach(function(parentid) {
        var parent = graph.getNode(parentid);
        if (parent) {
            child.addParent(parent);
            parent.addChild(child);
        } 
    });
}

Node.prototype.addChild = function(child) {
    this.children.push(child);
}

Node.prototype.addParent = function(parent) {
    this.parents.push(parent);
}

Node.prototype.clearLayout = function() {
    delete this.dagre;
}

var displayGraph = function(svg, egraph) {    
    // Append the graph and containers if it hasn't been added yet
    var firstTimeGraph = svg.selectAll(".graph").data([{}]).enter().append("g").attr("class", "graph")
    firstTimeGraph.append("g").attr("class", "edges");
    firstTimeGraph.append("g").attr("class", "nodes");
    
    var graph = svg.select(".graph");
    
    var nodedata = egraph.getNodes();
    var linkdata = egraph.getLinks();

    console.log(nodedata);
    console.log(linkdata);
    window.nodedata = nodedata;
    window.linkdata = linkdata;
    window.egraph = egraph;

    var nodePadding = 10;
    
    // Save the current position of the root node
    var root = egraph.graph.getRoots()[0];
    var root_position = { x: svg.attr("width")/2, y: 50 };
    if (root.dagre) 
        root_position = { x: root.dagre.x, y: root.dagre.y };

    // Get the edges
    var edges = graph.select(".edges").selectAll(".edge").data(linkdata, function(e) { return e.source.id + e.target.id; });
    
    // Add new edges
    var newedges = edges.enter().append("path").attr("class", "edge")
                                .attr("opacity", 1e-6)
                                .on("click", function(d) { 
                                    if (d.isExpanded()) { 
                                        d.contract(); 
                                    } else { 
                                        d.expand(); 
                                    }
                                    refreshGraph(svg, egraph);
                                });

    // Fade out and remove hidden edges
    edges.exit().transition().duration(500).attr("opacity", 1e-6).remove();
    
    // Get the nodes
    var nodes = graph.select(".nodes").selectAll(".node").data(nodedata, function(d) { return d.id; });
    
    // Add new nodes
    var newnodes = nodes.enter().append("g").attr("class", "node")
                                            .attr("id", function(d) { return "node-" + d.id })
                                            .attr("opacity", 1e-6)
                                            .on("mouseover", function(d){
                                                d3.select(this).select("rect").style("fill", "aliceblue");
                                             })
                                            .on("mouseout", function(d){
                                                d3.select(this).select("rect").style("fill", "");
                                             })
                                            .on("click", function(d){
                                                for (var key in d.report) {
                                                    console.log(key + ": ", d.report[key]);
                                                }
                                             });
    var newrects = newnodes.append("rect")
    var newtexts = newnodes.append("text").attr("text-anchor", "middle")
                                          .attr("x", 0);
    newtexts.append("tspan").attr("x", 0).attr("dy", "1em").text(function(d) { return d.id; });
    newtexts.append("tspan").attr("x", 0)
                            .attr("dy", "1.1em")
                            .text(function(d) { return d.report["Agent"] ? d.report["Agent"][0] : ""; });
    
    // Calculate bounding box of texts                
    newtexts.each(function(d) {
                      var bbox = this.getBBox();
                      d.bbox = bbox;
                      d.width = bbox.width + 2 * nodePadding;
                      d.height = bbox.height + 2 * nodePadding;
                  });
    
    // Set the position and height of the rectangles
    nodes.selectAll("rect").attr("x", function(d) { return -(d.bbox.width / 2 + nodePadding); })
                           .attr("y", function(d) { return -(d.bbox.height / 2 + nodePadding); })
                           .attr("width", function(d) { return d.width; })
                           .attr("height", function(d) { return d.height; });
    nodes.selectAll("text").attr("x", function(d) { return -d.bbox.width / 2; })
                           .attr("y", function(d) { return -d.bbox.height / 2; });
    
    // Fade out and remove hidden nodes
    nodes.exit().transition().duration(500).attr("opacity", 1e-6).remove();

    
    // Now, layout the graph
    egraph.layout();
    
    console.log(root_position, root);
    
    // Now we offset everything according to the root's position
    var offset = { x: root_position.x - root.dagre.x, y: root_position.y - root.dagre.y };
    nodes.each(function(d) {
        d.dagre.x += offset.x; d.dagre.y += offset.y; 
    });
    edges.each(function(d) {
        d.dagre.x += offset.x; d.dagre.y += offset.y;
        d.dagre.points.forEach(function(point) { point.x += offset.x; point.y += offset.y; });
    });
    
    // Fix the spline points for the edges
    edges.each(function(e) {
        var points = e.dagre.points;
        points.push(dagre.util.intersectRect(e.target.dagre, points.length > 0 ? points[points.length - 1] : e.source.dagre));
        points.splice(0, 0, dagre.util.intersectRect(e.source.dagre, points[0]));
        points[0].y -= 5; points[points.length-1].y += 5; // Make the lines overlap the boxes a bit so that they look nice        
    });
    
    // Now set new positions.  Existing nodes slide into place, new nodes fade in
    nodes.transition().delay(100).attr("transform", function(d) { return "translate(" + d.dagre.x + "," + d.dagre.y +")"; });
    newnodes.attr("transform", function(d) { return "translate(" + d.dagre.x + "," + d.dagre.y +")"; });
    newnodes.transition().delay(function() { return Math.random() * 300 + 50; }).duration(700).attr("opacity", 1);

    var line = d3.svg.line().x(function(d) { return d.x })
                            .y(function(d) { return d.y })
                            .interpolate("basis");
    
    // A custom tween to smoothly animate from curve to curve
    edges.transition().delay(100).attrTween("d", function(e) {
                                          var d1 = line(e.dagre.points);
                                          
                                          var path0 = this,
                                              path1 = path0.cloneNode();                           
                                              
                                          var n0 = path0.getTotalLength(),
                                              n1 = (path1.setAttribute("d", d1), path1).getTotalLength();
                                          

                                          // Uniform sampling of distance based on specified precision.
                                          var distances = [0], i = 0, dt = 4 / Math.max(n0, n1);
                                          while ((i += dt) < 1) distances.push(i);
                                          distances.push(1);

                                          // Compute point-interpolators at each distance.
                                          var points = distances.map(function(t) {
                                              var p0 = path0.getPointAtLength(t * n0),
                                                  p1 = path1.getPointAtLength(t * n1);
                                              return d3.interpolate([p0.x, p0.y], [p1.x, p1.y]);
                                          });

                                          return function(t) {
                                              return t < 1 ? "M" + points.map(function(p) { return p(t); }).join("L") : d1;
                                          };
                                       });
    edges.attr("stroke", function(d) { 
                             if (d.isExpanded()) {
                                 return "red";
                             } else if (d.isExpandable()) {
                                 return "green"
                             } else {
                                 return "#333";
                             }
                         });
    
    // New edges transition in slightly later
    newedges.attr("d", function(e) {
        var points = e.dagre.points;
        points.push(dagre.util.intersectRect(e.target.dagre, points.length > 0 ? points[points.length - 1] : e.source.dagre));
        points.splice(0, 0, dagre.util.intersectRect(e.source.dagre, points[0]));
        return line(points);
    });
    newedges.transition().delay(function() { return Math.random() * 200 + 200; }).duration(800).attr("opacity", 1);
}

var displayMinimap = function(svg, egraph){
    // Get the graph data
    var nodedata = egraph.getNodes(), linkdata = egraph.getLinks();   

    
    // Add the minimap if this is the first time
    var w = svg.attr("width")/5, h = svg.attr("height")/5;
    var firstTimeMinimap = svg.selectAll(".minimap").data([{}]).enter().append("svg").attr("class", "minimap")
                              .attr("width", w)
                              .attr("height", h)
                              .attr("x", w*4-5)
                              .attr("y", h*4-5);
    firstTimeMinimap.append("rect").attr("class", "border")
                              .attr("width", w)
                              .attr("height", h)
                              .attr("fill", "#ddd")
                              .attr("fill-opacity", 0.5);
    firstTimeMinimap.append("g").attr("class", "contents").append("rect").attr("class", "viewfinder")
                    .attr("stroke", "black")
                    .attr("fill", "black")
                    .attr("opacity", 0.3)
                    .attr("width", svg.attr("width"))
                    .attr("height", svg.attr("height"));
    
    // Set resize behaviour for the minimap
    window.addEventListener("resize", function() {       
        var w = svg.attr("width")/5, h = svg.attr("height")/5;
        svg.select(".minimap").attr("width", w)
                              .attr("height", h)
                              .attr("x", w*4-5)
                              .attr("y", h*4-5);
        svg.select(".border").attr("width", w)
                             .attr("height", h)
    });
    
    var minimap = svg.select(".minimap");
    var contents = minimap.select(".contents");

    // Get the edges and nodes
    var edges = contents.selectAll(".edge").data(linkdata, function(e) { return e.source.id + e.target.id; });
    var nodes = contents.selectAll(".node").data(nodedata, function(d) { return d.id; });

    // Add new edges and new nodes
    var nodePadding = 10;
    var newedges = edges.enter().append("path").attr("class", "edge");
    var newnodes = nodes.enter().append("g").attr("class", "node").append("rect")
                        .attr("x", function(d) { return -(d.bbox.width / 2 + nodePadding); })
                        .attr("y", function(d) { return -(d.bbox.height / 2 + nodePadding); })
                        .attr("width", function(d) { return d.width; })
                        .attr("height", function(d) { return d.height; });
    
    // Remove old edges and nodes
    edges.exit().remove();
    nodes.exit().remove();
    
    // Set positions of nodes
    contents.selectAll(".node").attr("transform", function(d) { return "translate(" + d.dagre.x + "," + d.dagre.y +")"; });

    // Set positions of edges
    var line = d3.svg.line().x(function(d) { return d.x }).y(function(d) { return d.y }).interpolate("basis");
    contents.selectAll(".edge").attr("d", function(e) { return line(e.dagre.points); });

    // Calculate the extent of the graph
    var minx = 999999, maxx = 0, miny = 999999, maxy = 0;             
    nodedata.forEach(function(node) {
        minx = Math.min(minx, node.dagre.x - node.dagre.width / 2);
        maxx = Math.max(maxx, node.dagre.x + node.dagre.width / 2);
        miny = Math.min(miny, node.dagre.y - node.dagre.height / 2);
        maxy = Math.max(maxy, node.dagre.y + node.dagre.height / 2);
    });
    minx -= 30; maxx += 30; miny -= 30; maxy += 30; // add a border of 30px
    
    var x = minx, y = miny, scale = Math.min(minimap.attr("width")/(maxx - minx), minimap.attr("height")/(maxy - miny));
    // Set the content's zoom level so that it can see the entire graph
    contents.attr("transform","translate(" + (minimap.attr("width") - (maxx + minx)*scale)/2 + "," +  (minimap.attr("height") - (maxy + miny)*scale)/2 + ") scale(" +  scale + ")");
    
}

var processReports = function(reports) {
    var replacement_parents = {};
    for (var i = 0; i < reports.length; i++) {
        var report = reports[i];
        if (report["Operation"] && report["Operation"]=="merge") {
            
        } else {
            processed_reports.push(report);
        }        
    }
}


var drawGraph = function(reports) {
    // Preprocess reports
    //reports = processReports(reports);
    
    // Get the size of the window
    var w = window.innerWidth, h = window.innerHeight;
    
    // Create the graphs from the reports
    var graph = new Graph(reports);
    var egraph = new ExpandableGraph(graph);
    
    console.log(egraph);
    
    // Now start laying things out.
    var svg = d3.select("body").append("svg").attr("width", window.innerWidth).attr("height", window.innerHeight);
    displayGraph(svg, egraph);
    displayMinimap(svg, egraph);
    
    var graph = svg.select(".graph");
    var minimap = svg.select(".minimap");
    
    window.addEventListener("resize", function() {            // Set resize behaviour for the graph
        console.log("window resized)"); 
        svg.attr("width", window.innerWidth)
           .attr("height", window.innerHeight);
        
    });
    
    // Set the pan-zoom behaviour
    var panzoom = d3.behavior.zoom().translate ([0, 0])
                                    .scale (1.0).scaleExtent([0.05, 2.0])
                                    .on("zoom", function() {
                                        graph.attr("transform","translate(" + d3.event.translate[0] + "," +  d3.event.translate[1] + ") scale(" +  d3.event.scale + ")");
                                        var x1 = -d3.event.translate[0]/d3.event.scale;
                                        var x2 = x1 + window.innerWidth/d3.event.scale;
                                        var y1 = -d3.event.translate[1]/d3.event.scale;
                                        var y2 = y1 + window.innerHeight/d3.event.scale;
                                        minimap.selectAll(".viewfinder").attr("x", x1)
                                                                        .attr("y", y1)
                                                                        .attr("width", x2-x1)
                                                                        .attr("height", y2-y1);
                                        var nodes = graph.select(".nodes");
                                        // Set the position and height of the rectangles      
                                        var nodePadding = 10;       
                                        nodes.selectAll("text").each(function(d) {
                                            var bbox = this.getBBox();
                                            d.bbox = bbox;
                                            d.width = bbox.width + 2 * nodePadding;
                                            d.height = bbox.height + 2 * nodePadding;
                                        });
                                        nodes.selectAll("rect").attr("x", function(d) { return -(d.bbox.width / 2 + nodePadding); })
                                                               .attr("y", function(d) { return -(d.bbox.height / 2 + nodePadding); })
                                                               .attr("width", function(d) { return d.width; })
                                                               .attr("height", function(d) { return d.height; });
                                        nodes.selectAll("text").attr("x", function(d) { return -d.bbox.width / 2; })
                                                               .attr("y", function(d) { return -d.bbox.height / 2; });
                                    });
    svg.call(panzoom);
}

var refreshGraph = function(svg, egraph) {
    displayGraph(svg, egraph);
    displayMinimap(svg, egraph);
}