/* One swimlane per thread */
function PerThreadLayout() {
	var spacing = 10;
	
	// Default to a thread tooltip
	var tooltip = makeThreadTooltip($.fn.tipsy.autoWE);
	
	var layout = function(data, height) {
		var cache = {};
		
		var processes = data.Processes();
		var numprocs = processes.length;
		
		var processspacing = Math.min(spacing, height / (numprocs - 1)); 
		var threadheight = (height - (numprocs - 1) * processspacing) / data.Threads().length;
		
		var lanes = [];
		
		var offset = 0;
		for (var i = 0; i < processes.length; i++) {
			// Cache the process's offset
			var process = processes[i];
			cache[process.ID()] = offset;
			
			// Generate a colour for the lanes of this process
			var color = d3.rgb(200 + Math.random() * 20, 200 + Math.random() * 20, 200 + Math.random() * 20);
			
			for (var j = 0, threads = process.Threads(); j < threads.length; j++) {
				// Cache the thread's offset
				var thread = threads[j];
				cache[thread.ID()] = offset;
				lanes.push({
					"i": lanes.length,
					"offset": offset,
					"thread": thread,
					"color": color,
					"title": thread.ShortName()
				});
				
				offset += threadheight;
			}
			offset += processspacing;
		}
		
		function offsetOf(obj) {
			if (cache.hasOwnProperty(obj.ID()))
				return cache[obj.ID()];
			var offset = 0;
			
			if (obj instanceof XEvent)
				offset = offsetOf(obj.span);
			else if (obj instanceof XSpan)
				offset = offsetOf(obj.thread);
			else if (obj instanceof XMachine)
				offset = offsetOf(obj.Processes()[0]);
			else if (obj instanceof GCEvent)
				offset = offsetOf(obj.process);
			
			cache[obj.ID()] = offset;
			return offset;
		}
		
		offsetOf.laneHeight = function() { return threadheight; };
		offsetOf.lanes = function() { return lanes; };
		
		return offsetOf;
		
	};
	
	layout.spacing = function(_) { if (!arguments.length) return spacing; spacing = _; return layout; };
	layout.tooltip = function(_) { if (!arguments.length) return tooltip; tooltip = _; return layout; };
	return layout;
};
