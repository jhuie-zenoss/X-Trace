//lightweight is an optional argument that will try to draw the graph as fast as possible
function XTraceSwimLane(attachPoint, tasksdata, gcdata, /*optional*/ params) {	
	// Parameters
	var margin = { top: 20, right: 15, bottom: 15, left: 120 };		// Margins around the visualization
	var overlap = 0.1;												// Extra space inside the viz
	
	// Create the data representation
	var workload = new Workload(tasksdata, gcdata);

	// Preprocess: assign colours to each process
	var processes = workload.Processes();
	for (var i = 0; i < processes.length; i++)
		processes[i].color = d3.rgb(200 + Math.random() * 20, 200 + Math.random() * 20, 200 + Math.random() * 20);

	// Preprocess: determine extent of the data
	var datalen = workload.max - workload.min;
	var rangemin = workload.min - datalen * overlap;
	var rangemax = workload.max + datalen * overlap;
	var initialmin = workload.min - datalen * overlap * 0.5;
	var initialmax = workload.max + datalen * overlap * 0.5;

	// Create the root SVG element and set its width and height
	var chart = d3.select(attachPoint).append('svg:svg').attr('class', 'chart');
	
	// Set up the brush controls
	var brush_scale = d3.scale.linear().domain([rangemin, rangemax]);
	var brush = d3.svg.brush().x(brush_scale).on("brush", onbrush).extent([initialmin, initialmax]);
	
	// Set up the lane generator that determines how elements are placed on screen
	var overview_lanegenerator = lane_per_thread_scale().spacing(0);
	var main_lanegenerator = lane_per_thread_scale().spacing(10);

	// Create the visualization components
	var overview = SwimLaneOverview().brush(brush).on("refresh", refresh).lanegenerator(overview_lanegenerator);
	var swimlane = SwimLane().brush(brush).on("refresh", refresh).lanegenerator(main_lanegenerator);
	
	/* When the viewing area is scaled with the brush */
	function onbrush() {
		if (d3.event.mode=="resize")
			brush.extent([brush.extent()[0], Math.max(brush.extent()[1], brush.extent()[0]+5)]);
		refresh();
	}
	
	/* Refreshes what's displayed after zooming in/out or panning around */
	function refresh() {
		// Refresh the viz components
		chart.datum(workload).call(swimlane.refresh);
		chart.datum(workload).call(overview.refresh);
	}
	
	/* Redraws the whole viz, for example when the parameters change or screen is resized */
	function draw() {
		// Determine the new widths and heights
		var width = window.width() - margin.left - margin.right;
		var height = window.height() - margin.top - margin.bottom;
		var miniHeight = Math.min(workload.Threads().length * 12 + 50, 150);
		var mainHeight = height - miniHeight - 50;
		
		// Resize the chart
		chart.attr('width', width + margin.right + margin.left);
		chart.attr('height', height + margin.top + margin.bottom);

		// Update the scale of the brush
		brush_scale.range([0, width]);
		brush.extent(brush.extent());
		
		// Update the vizes
		overview.width(width).height(miniHeight).x(margin.left).y(mainHeight+60);
		swimlane.width(width).height(mainHeight).x(margin.left).y(margin.top);
		
		// Update the placement of the viz
		chart.datum(workload).call(swimlane);
		chart.datum(workload).call(overview);
		
		// Refresh the contents
		refresh();
	}
	
	// Attach a handler to the window to redraw on resize
	$(window).resize(draw);
	
	draw(); // Finally, draw it
}

/* Define a few scales for the vertical placement of events and such */
function lane_per_thread_scale() {
	var spacing = 10;
	
	var scale = function(data, height) {
		var cache = {};
		
		var processes = data.Processes();
		var numprocs = processes.length;
		
		var processspacing = Math.min(spacing, height / (numprocs - 1)); 
		var threadheight = (height - (numprocs - 1) * processspacing) / data.Threads().length;
		
		var offset = 0;
		for (var i = 0; i < processes.length; i++) {
			cache[processes[i].ID()] = offset;
			var threads = processes[i].Threads();
			for (var j = 0; j < threads.length; j++) {
				cache[threads[j].ID()] = offset;
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
		
		return offsetOf;
		
	};
	
	scale.spacing = function(_) { if (!arguments.length) return spacing; spacing = _; return scale; };
	return scale;
}