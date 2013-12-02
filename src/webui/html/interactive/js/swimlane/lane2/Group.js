var Group = function(){};
Group.prototype.Lanes = function() { return []; };

Group.prototype.Events = function() { return [].concat.apply([], this.Lanes().map(function(lane) { return lane.Events(); })); };
Group.prototype.Spans = function() { return [].concat.apply([], this.Lanes().map(function(lane) { return lane.Spans(); })); };
Group.prototype.Threads = function() { return [].concat.apply([], this.Lanes().map(function(lane) { return lane.Threads(); })); };
Group.prototype.Processes = function() { return [].concat.apply([], this.Lanes().map(function(lane) { return lane.Processes(); })); };
Group.prototype.Tasks = function() { return [].concat.apply([], this.Lanes().map(function(lane) { return lane.Tasks(); })); };
Group.prototype.Edges = function() { return []; };

Group.prototype.Height = function(_) { var s=this.Spacing(); return this.Lanes().map(function(l) { return l.Height(); }).reduce(function(a,b) { return a+b+s; }); };
Group.prototype.Offset = function(_) { 
  if (!arguments.length) 
    return this.offset ? this.offset : 0; 
  this.offset = _;
  var spacing = this.Spacing();
  this.Lanes().forEach(function(lane) { lane.Offset(_); _+=lane.Height()+spacing; });
  return this; 
};
Group.prototype.Spacing = function(_) {
  if (!arguments.length)
    return this.spacing ? this.spacing : 0;
  this.spacing = _;
  this.Offset(this.Offset());
  return this;
};

var ProcessGroup = function(layout, process) {
  // Save the arguments
  this.layout = layout;
  this.process = process;
  
  // Create the lanes
  var group = this;
  this.lanes = process.Threads().map(function(thread) { return new ThreadLane(group, thread); });

  // Generate a background colour for this group
  var fill = d3.rgb(200+Math.random()*20, 200+Math.random()*20, 200+Math.random()*20);
  this.lanes.forEach(function(lane) { lane.Fill(fill); });
  
  // Set initial spacing and offset for lanes
  this.Spacing(1).Offset(0);
};
ProcessGroup.prototype = new Group();
ProcessGroup.prototype.Lanes = function() { return this.lanes; };
ProcessGroup.prototype.Edges = function() { return this.process.Edges().filter(function(edge) { return edge.parent.span.thread.process==edge.child.span.thread.process && edge.parent.span.thread!=edge.child.span.thread; }); };