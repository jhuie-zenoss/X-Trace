/* Contains classes for drawing groups of lanes that may comprise a higher-level concept such as a task */

// Draws the threads for processes, grouped by process
function GroupByProcess(swimlane) {
  // Amount of spacing added beneath the process
  var padding = 10;
  // At this level, we have one renderer per process, rather than one shared
  var renderer = function() {
    var cache = {};
    var get = function(id) {
      if (!cache[id]) cache[id] = thread_renderer();
      cache[id].set = function(r) { cache[id] = r; };
      return cache[id];
    };
    return get;
  }();
    
  var thread_renderer = function() {
    var r = RenderThread(swimlane);
    r.button().on("contract", function(d) {
      console.log("a");
      r.set(compacted_renderer());
      console.log("redrawing");
      swimlane.on("redraw").call(this);
      console.log("exiting");
      r.exit(d);
    }); 
    return r;
  };
  
  var compacted_renderer = function() {
    var r = RenderSpans(swimlane);
    r.button().on("contract", function(d) {
      console.log("b");
      r.set(thread_renderer());
      swimlane.on("redraw").call(this);
      r.exit(d);
    }); 
    return r;
  };
  
  var group = function(processdata) {
    for (var i = 0; i < processdata.length; i++) {
      var process = processdata[i];
      renderer(process.ID()).call(this, process.Threads(), process.ID());
    }
  };
  
  // Refreshes the events and spans of the lane
  group.refresh = function(processdata, sx, sy, offsety) {
    for (var i = 0; i < processdata.length; i++) {
      var process = processdata[i];
      offsety = renderer(process.ID()).refresh.call(this, process.Threads(), process.ID(), sx, sy, offsety);
      offsety += padding;
    }
    
    return offsety;
  };
  
  // Returns the vertical height of the lanes that would be drawn for the specified process data
  group.heightOf = function(processdata) {
    return processdata.map(function(process) { 
      return renderer(process.ID()).heightOf(process.Threads()); 
    }).reduce(function(prev, cur) {
      return prev + cur + padding;
    });
  };

  // Sets the amount of padding that will be drawn between processes
  group.padding = function(_) { if (!arguments.length) return padding; padding = _; return group; };
    
  return group;
}