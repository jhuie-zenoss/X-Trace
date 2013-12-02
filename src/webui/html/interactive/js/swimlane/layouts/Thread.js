function setLaneDefaults(lane) {
	// Initially just a random colour
	var color = d3.rgb(200 + Math.random() * 20, 200 + Math.random() * 20, 200 + Math.random() * 20);
	// Default height of lane.  This will be set by any reasonable user
	var height = 10;
	
	lane.color = function(_) { if (!arguments.length) return color; color = _; return lane; };
	lane.height = function(_) { if (!arguments.length) return height; height = _; return lane; };
}

/**
 * Lays out a thread in a lane
 */
function ThreadLane() {
	
	var lane = function(thread) {
		d3.select(this).select(".events").selectAll("circle").data(thread.Events()).attr("className", "singlethread");
		d3.select(this).select(".spans").selectAll("rect").data(thread.Spans()).attr("className", "singlethread");	
		// here we also filter out data so that only stuff that's visible is displayed
	};
	
	lane.refresh = function(thread, offset) {
		var chart = d3.select(this);
		var events = chart.select(".events").selectAll("circle.singlethread").data(thread.Events());
		// draw the events, remove ones that don't exist, update to new positions, transition etc.
		// also do lines, spans, and waiting
		// if anything should be drawn, selectAll and do data([]) and then remove
		// draw the thread-internal edges, which we could do curvy since they're all along a single line
		// draw wait spans, draw file IO
	};

	setLaneDefaults(lane); 
	
	return lane;	
}

/**
 * Lays out some spans in a lane, that may not all belong to the same thread
 */
function SpansLane() {
	
	var lane = function(spans) {
		var eventdata = [].concat.apply([], spans.map(function(span) { return span.Events(); }));
		d3.select(this).select(".events").selectAll("circle").data(eventdata).attr("className", "singlethread");
		d3.select(this).select(".spans").selectAll("rect").data(spans).attr("className", "singlethread");	
		// here we also filter out data so that only stuff that's visible is displayed
	};
	
	lane.refresh = function(spans, offset) {
		var chart = d3.select(this);
		var eventdata = [].concat.apply([], spans.map(function(span) { return span.Events(); }));
		var events = chart.select(".events").selectAll("circle.singlethread").data(eventdata);
		// draw the events, remove ones that don't exist, update to new positions, transition etc.
		// also do edges for inside the spans, draw the spans themselves
		// if anything should be drawn, selectAll and do data([]) and then remove
		// draw wait spans, draw file IO
	};

	setLaneDefaults(lane); 
	
	return lane;	
	
}

/**
 * Lays out a single process in a lane.  Will only draw events that have inter-process communications,
 * and will draw spans representing the union of all spans
 */
function ProcessLane() {
	
}

/**
 * Lays out all of a machine's processes in a lane.
 */
function MachineLane() {
	
}

/**
 * Lays out the entire task in a lane as a single block 
 */
function TaskLane() {
	
}