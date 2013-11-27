/**
 * Lays out a lane that corresponds to a single thread
 */
function ThreadLane() {
	// No between-thread spacing by default
	var spacing = 0;
	// Initially just a random colour
	var color = d3.rgb(200 + Math.random() * 20, 200 + Math.random() * 20, 200 + Math.random() * 20);
	// Default height of lane.  This will be set by any reasonable user
	var height = 10;
	
	var lane = function(selection, offset) {
		selection.each(function(thread) {
			
		});		
	};
	
	lane.

	lane.colour = function(_) { if (!arguments.length) return color; color = _; return lane; };
	lane.spacing = function(_) { if (!arguments.length) return spacing; spacing = _; return lane; };
	lane.height = function(_) { if (!arguments.length) return height; height = _; return lane; };
	
	return lane;	
}