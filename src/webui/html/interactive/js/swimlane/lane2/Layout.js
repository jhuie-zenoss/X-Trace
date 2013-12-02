var Layout = function() {};

Layout.prototype.Workload = function() { return this.workload; };
Layout.prototype.Groups = function() { return []; };
Layout.prototype.Lanes = function() { return [].concat.apply([], this.Groups().map(function(group) { return group.Lanes(); })); };

Layout.prototype.Events = function() { return [].concat.apply([], this.Groups().map(function(group) { return group.Events(); })); };
Layout.prototype.Spans = function() { return [].concat.apply([], this.Groups().map(function(group) { return group.Spans(); })); };
Layout.prototype.Threads = function() { return [].concat.apply([], this.Groups().map(function(group) { return group.Threads(); })); };
Layout.prototype.Processes = function() { return [].concat.apply([], this.Groups().map(function(group) { return group.Processes(); })); };
Layout.prototype.Tasks = function() { return [].concat.apply([], this.Groups().map(function(group) { return group.Tasks(); })); };
Layout.prototype.Edges = function() { return []; };

Layout.prototype.Height = function() { var spacing = this.Spacing(); return this.Groups().map(function(g) { return g.Height(); }).reduce(function(a,b) { return a+b+spacing; }); };
Layout.prototype.Spacing = function(_) {
  if (!arguments.length)
    return this.spacing ? this.spacing : 0;
  this.spacing = _;
  var offset = 0;
  this.Groups().forEach(function(group) { group.Offset(offset); offset+=group.Height()+_; });
  return this;
};

var PerTaskLayout = function(workload) {
  // Save the arguments
  this.workload = workload;
  
  // Create the groups
  var layout = this;
  this.groups = workload.Processes().map(function(process) { return new ProcessGroup(layout, process); });
  
  // Set the process spacing initially to, say, 5
  this.Spacing(5);
};
PerTaskLayout.prototype = new Layout();
PerTaskLayout.prototype.Groups = function() { return this.groups; };
PerTaskLayout.prototype.Height = function() { var s=this.Spacing(); return this.Groups().map(function(g) { return g.Height(); }).reduce(function(a,b) { return a+b+s; }); };
PerTaskLayout.prototype.Edges = function(extent) { return this.workload.Edges().filter(function(edge) { return edge.parent.span.thread.process!=edge.child.span.thread.process; }); };


//var minExtent = sx.domain()[0];
//var maxExtent = sx.domain()[1];
//
//// Figure out which data should be drawn
//var spandata = data.Spans().filter(function (d) { return d.Start() < maxExtent && d.End() > minExtent; });
//var eventdata = data.Events().filter(function(d) { return d.Timestamp() > minExtent && d.Timestamp() < maxExtent; });
//var edgedata = data.Edges().filter(function(d) { return d.parent.Timestamp() < maxExtent && d.child.Timestamp() > minExtent; });
//var gcdata = data.GCEvents().filter(function(d) { return d.start < maxExtent && d.end > minExtent; });
//var hdddata = data.HDDEvents().filter(function(d) { return d.start < maxExtent && d.end > minExtent; });