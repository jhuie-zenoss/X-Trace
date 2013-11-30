/* Renders a lane per thread */
function RenderThread(swimlane) {
	// Default height of lane.  This will be set by any reasonable user
	var height = 10;
	// Renderer for events
	var events = EventDot(swimlane);
	// Renderer for spans
	var spans = SpanRect(swimlane);
	// Background for this thread
	var background = ThreadBackground(swimlane);
	var labels = ThreadLabels(swimlane).fill(background.fill().darker(1));

	function lane(threaddata, groupid) {
		background.call(d3.select(this).select(".lane-background").node(), threaddata, groupid);
		labels.call(d3.select(this).select(".lane-labels").node(), threaddata, groupid);
		for (var i = 0; i < threaddata.length; i++) {
			var thread = threaddata[i];
			events.call(d3.select(this).select(".events").node(), thread.Events(), thread.ID());
			spans.call(d3.select(this).select(".spans").node(), thread.Spans(), thread.ID());
		}
	};
	
	lane.refresh = function(threaddata, groupid, sx, sy, offsety) {
    background.refresh.call(d3.select(this).select(".lane-background").node(), threaddata, groupid, sy(offsety), sy(height), sx);
    labels.refresh.call(d3.select(this).select(".lane-labels").node(), threaddata, groupid, sy(offsety), sy(height));
		for (var i = 0; i < threaddata.length; i++) {
			var thread = threaddata[i];
			events.refresh.call(d3.select(this).select(".events").node(), thread.Events(), thread.ID(), sy(offsety), sy(height), sx);
			spans.refresh.call(d3.select(this).select(".spans").node(), thread.Spans(), thread.ID(), sy(offsety), sy(height), sx);
			offsety += height;
		}
		background.on("click", cbs["click"]);
		
		return offsety;
	};
	
	// Returns the vertical height of the lanes that would be drawn for the specified thread data
	lane.heightOf = function(threaddata) {
		return height * threaddata.length;
	};
		
	lane.height = function(_) { if (!arguments.length) return height; height = _; return lane; };
	lane.events = function(_) { if (!arguments.length) return events; events = _; return lane; };
	lane.spans = function(_) { if (!arguments.length) return spans; spans = _; return lane; };
	lane.background = function(_) { if (!arguments.length) return background; background = _; return lane; };
  
  cbs = {"click": function(){}};
  lane.on = function(evt, cb) { if (cb) cbs[evt] = cb; else return cbs[evt]; return lane; };
	
	return lane;
};

/* Renders as few lanes as possible to display the threads.  Not necessarily one thread per lane, and not necessarily same lane for the spans of a thread */
function RenderSpans(swimlane) {
  // Default height of lane.  This will be set by any reasonable user
  var height = 10;
  // Renderer for events
  var events = EventDot(swimlane);
  // Renderer for spans
  var spans = SpanRect(swimlane);
  // Background for this thread
  var background = ThreadBackground(swimlane);
  
  // Cache for grouped spans
  var cache = {};

  function lane(threaddata, groupid) {
    var groupings = lane.group.call(this, groupid, threaddata);
    background.call(d3.select(this).select(".lane-background").node(), groupings, groupid);
//    labels.call(d3.select(this).select(".lane-labels").node(), threaddata, groupid);
    for (var i = 0; i < groupings.length; i++) {
      var group = groupings[i];
      events.call(d3.select(this).select(".events").node(), group.Events(), group.ID());
      spans.call(d3.select(this).select(".spans").node(), group.Spans(), group.ID());
    }
  };
  
  lane.refresh = function(threaddata, groupid, sx, sy, offsety) {
    var groupings = lane.group.call(this, groupid, threaddata);
    background.refresh.call(d3.select(this).select(".lane-background").node(), groupings, groupid, sy(offsety), sy(height), sx);
    for (var i = 0; i < groupings.length; i++) {
      var group = groupings[i];
      events.refresh.call(d3.select(this).select(".events").node(), group.Events(), group.ID(), sy(offsety), sy(height), sx);
      spans.refresh.call(d3.select(this).select(".spans").node(), group.Spans(), group.ID(), sy(offsety), sy(height), sx);
      offsety += height;
    }
    
    return offsety;
  };
  
  // Returns the vertical height of the lanes that would be drawn for the specified thread data
  lane.heightOf = function(threaddata) {
    return height * lane.numLanes.call(this, threaddata);
  };
  
  // Returns the number of lanes required to draw the specified threads
  lane.numLanes = function(threaddata) {
    var spans = [].concat.apply([], threaddata.map(function(thread) { return thread.Spans(); }));
    var starts = spans.map(function(span) { return span.Start(); }).sort().reverse();
    var ends = spans.map(function(span) { return span.End(); }).sort().reverse();
    var concurrency = 0, count = 0, nextstart = starts.pop(), nextend = ends.pop();
    while (nextstart != null && nextend != null) {
      if (nextstart < nextend) {
        count++; nextstart = starts.pop();
      } else {
        count--; nextend = ends.pop();
      }
      if (count > concurrency)
        concurrency = count;
    }
    return concurrency;
  };
  
  // Groups the specified thread data
  lane.group = function(groupid, threaddata) {
    if (!cache[groupid]) {
      var concurrency = lane.numLanes.call(this, threaddata);
      cache[groupid] = SpanGroup(groupid, concurrency, threaddata);
    }
    return cache[groupid];    
  };
    
  lane.height = function(_) { if (!arguments.length) return height; height = _; return lane; };
  lane.events = function(_) { if (!arguments.length) return events; events = _; return lane; };
  lane.spans = function(_) { if (!arguments.length) return spans; spans = _; return lane; };
  lane.background = function(_) { if (!arguments.length) return background; background = _; return lane; };
  
  cbs = {"click": function(){}};
  lane.on = function(evt, cb) { if (cb) cbs[evt] = cb; else return cbs[evt]; return lane; };
  
  return lane;
};

function SpanGroup(groupid, numgroups, threaddata) {
  var groups = [];
  
  var makegroup = function() {
    var group = [];
    var id = groupid+"_group"+groups.length;
    group.ID = function() { return id; };
    group.End = function() { return group.length==0 ? 0 : group[group.length-1].End(); }
    group.Events = function() { return [].concat.apply([], group.map(function(span) { return span.Events(); })); };
    group.Spans = function() { return group; };
    return group;
  };
  
  for (var i = 0; i < numgroups; i++)
    groups.push(makegroup(i));

  var affinity = {};
  for (var i = 0; i < threaddata.length; i++)
    affinity[threaddata[i].ID()] = i % numgroups;
  
  var spans = [].concat.apply([], threaddata.map(function(thread) { return thread.Spans(); }));
  spans.sort(function(a, b) { return a.Start() - b.Start(); });
  
  for (var i = 0; i < spans.length; i++) {
    var span = spans[i], spanaffinity = affinity[span.thread.ID()];
    for (var j = 0; j < numgroups; j++) {
      var k = (j + spanaffinity) % numgroups;
      if (groups[k].End() <= span.Start()) {
        groups[k].push(span);
        break;
      }
    }
  }
  
  return groups;
};