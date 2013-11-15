//lightweight is an optional argument that will try to draw the graph as fast as possible
function XTraceSwimLane(attachPoint, tasksdata, gcdata, /*optional*/ params) {	
	// Parameters
	var margin = { top: 20, right: 15, bottom: 15, left: 120 };		// Margins around the visualization
	var overlap = 0.1;												// Extra space inside the viz
	
	// Create the data representation
	var data = new Workload(tasksdata, gcdata);
	
	// Preprocess: assign a lane number to the threads
	var threads = data.Threads();
	for (var i = 0; i < threads.length; i++) {
		threads[i].lanenumber = i;
		if (threads[i].process.lanenumber==null)
			threads[i].process.lanenumber = i;
	}

	// Preprocess: assign colours to each process
	var processes = data.Processes();
	for (var i = 0; i < processes.length; i++)
		processes[i].color = d3.rgb(200 + Math.random() * 20, 200 + Math.random() * 20, 200 + Math.random() * 20);

	// Preprocess: determine extent of the data
	var datalen = data.max - data.min;
	var rangemin = data.min - datalen * overlap;
	var rangemax = data.max + datalen * overlap;
	var initialmin = data.min - datalen * overlap * 0.5;
	var initialmax = data.max + datalen * overlap * 0.5;

	// Create the root SVG element and set its width and height
	var chart = d3.select(attachPoint).append('svg:svg').attr('class', 'chart');
	
	// Set up the brush controls
	var brush_scale = d3.scale.linear().domain([rangemin, rangemax]);
	var brush = d3.svg.brush().x(brush_scale).on("brush", refresh).extent([initialmin, initialmax]);

	// Create the visualization components
	var overview = SwimLaneOverview().brush(brush).on("refresh", refresh);
	var swimlane = SwimLane().brush(brush).on("refresh", refresh);
	
	/* Refreshes what's displayed after zooming in/out or panning around */
	function refresh() {
		// Determine the new extent to draw
		var minExtent = brush.extent()[0];
		var maxExtent = Math.max(brush.extent()[1], brush.extent()[0]+0.00001);
		brush.extent([minExtent, maxExtent]);

		// Refresh the viz components
		chart.datum(data).call(swimlane.refresh);
		chart.datum(data).call(overview.refresh);
	}
	
	/* Redraws the whole viz, for example when the parameters change or screen is resized */
	function draw() {
		// Determine the new widths and heights
		var width = window.width() - margin.left - margin.right;
		var height = window.height() - margin.top - margin.bottom;
		var miniHeight = Math.min(threads.length * 12 + 50, 150);
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
		chart.datum(data).call(swimlane);
		chart.datum(data).call(overview);
		
		// Refresh the contents
		refresh();
	}
	
	// Attach a handler to the window to redraw on resize
	$(window).resize(draw);
	
	draw(); // Finally, draw it
}