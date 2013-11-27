/**
 * Lays out lanes for a process, but giving one lane per thread
 */
function Process_LanePerThread() {
	// No between-thread spacing by default
	var spacing = 0;
	// Initially just a random colour
	var color = d3.rgb(200 + Math.random() * 20, 200 + Math.random() * 20, 200 + Math.random() * 20);
	// Default height of lane.  This will be set by any reasonable user
	var height = 10;
	
	var threadlane = ThreadLane().color(color);
	
	var lane = function(process) {
		var threads = process.Threads();
		for (var i = 0; i < threads.length; i++) {
			threadlane.call(this, threads[i]);
		}
	};
	
	lane.refresh = function(process, offset) {
		var chart = d3.select(this);
		var threads = process.Threads();
		for (var i = 0; i < threads.length; i++) {
			threadlane.call(this, threads[i], offset);
			offset = offset + threadlane.height();
		}
		// draw the inter-thread edges here
		// draw the GC for the process here
	};
	
	lane.Events = function(data) { return data.Events(); };

	lane.colour = function(_) { if (!arguments.length) return color; color = _; return lane; };
	lane.spacing = function(_) { if (!arguments.length) return spacing; spacing = _; return lane; };
	lane.height = function(_) { if (!arguments.length) return height; height = _; return lane; };
	
	return lane;	
}