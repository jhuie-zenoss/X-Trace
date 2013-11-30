/* Contains classes for drawing groups of lanes that may comprise a higher-level concept such as a task */

// Draws the threads for processes, grouped by process
function GroupByProcess(swimlane) {
  // Amount of spacing added beneath the process
  var padding = 10;
  // At this level, we have one renderer per process, rather than one shared
  var renderer = function() {
    var renderers = {};
    return function(process, r) {
      if (r)
        renderers[process.ID()] = r;
      else if (!renderers[process.ID()])
        renderers[process.ID()] = RenderThread(swimlane);
      return renderers[process.ID()];
    };
  }();
  
  var lane = function(processdata) {
    for (var i = 0; i < processdata.length; i++) {
      var process = processdata[i];
      renderer(process).on("click", function() {
        renderer(process, RenderSpans(swimlane));
      });
      renderer(process).call(this, process.Threads(), process.ID());
    }
  };
  
  // Refreshes the events and spans of the lane
  lane.refresh = function(processdata, sx, sy, offsety) {
    for (var i = 0; i < processdata.length; i++) {
      var process = processdata[i];
      offsety = renderer(process).refresh.call(this, process.Threads(), process.ID(), sx, sy, offsety);
      offsety += padding;
    }
    
    return offsety;
  };
  
  // Returns the vertical height of the lanes that would be drawn for the specified process data
  lane.heightOf = function(processdata) {
    return processdata.map(function(process) { 
      return renderer(process).heightOf(process.Threads()); 
    }).reduce(function(prev, cur) {
      return prev + cur + padding;
    });
  };

  // Sets the amount of padding that will be drawn between processes
  lane.padding = function(_) { if (!arguments.length) return padding; padding = _; return lane; };
    
  return lane;
}