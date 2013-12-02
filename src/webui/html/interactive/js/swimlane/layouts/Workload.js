/**
 * Lays out a workload, by default, into one lane per task.
 * Can be collapsed
 */
function TaskLanes() {
	// By default, 10px spacing between tasks
	var spacing = 10;
	// Default height of workload.  This will be set by any reasonable user
	var height = 200;
	// The sub-lanes for each task
	var task_lane_layouts = {};
	
	var lanes = function(selection) {
		var offset = 0;
		selection.each(function(thread) {
			
		});		
	};
	
	lanes.spacing = function(_) { if (!arguments.length) return spacing; spacing = _; return lanes; };
	lanes.height = function(_) { if (!arguments.length) return height; height = _; return lanes; };
	
	return lane;	
}