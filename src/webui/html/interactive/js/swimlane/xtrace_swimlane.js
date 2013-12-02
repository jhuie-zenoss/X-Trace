//lightweight is an optional argument that will try to draw the graph as fast as possible
function XTraceSwimLane(attachPoint, tasksdata, gcdata, /*optional*/ params) {	
	// Parameters
	var margin = { top: 20, right: 15, bottom: 15, left: 120 };		// Margins around the visualization
	var overlap = 0.1;												// Extra space inside the viz
	
	// Create the data representation
	var workload = new Workload(tasksdata, gcdata);
	var vizdata = new PerTaskLayout(workload);

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
	var overview_layout = PerThreadLayout().spacing(0);
	var main_layout = PerThreadLayout().spacing(10);
//	var main_layout = ReusableLaneLayout().spacing(10);

	// Create the visualization components
	var overview = SwimLaneOverview().brush(brush).on("refresh", refresh).on("redraw", draw).layout(overview_layout);
	var swimlane = SwimLane().brush(brush).on("refresh", refresh).layout(main_layout);
	
	/* When the viewing area is scaled with the brush */
	function onbrush() {
		if (d3.event.mode=="resize")
			brush.extent([brush.extent()[0], Math.max(brush.extent()[1], brush.extent()[0]+5)]);
		refresh();
	}
	
	/* Refreshes what's displayed after zooming in/out or panning around */
	function refresh() {
		// Refresh the viz components
		chart.datum(vizdata).call(swimlane.refresh);
//		chart.datum(vizdata).call(overview.refresh);
	}
	
	/* Redraws the whole viz, for example when the parameters change or screen is resized */
	function draw() {
		// Determine the new widths and heights
		var width = window.width() - margin.left - margin.right;
		var height = window.height() - margin.top - margin.bottom;
		var miniHeight = Math.min(vizdata.Lanes().length * 10, height/4);
		var mainHeight = height - miniHeight - 50;
		
		// Resize the chart
		chart.attr('width', width + margin.right + margin.left);
		chart.attr('height', height + margin.top + margin.bottom);

		// Update the scale of the brush
		brush_scale.range([0, width]);
		brush.extent(brush.extent());
		
		// Update the vizes
		overview.width(width).height(miniHeight).margin(margin.left).y(mainHeight+60);
		swimlane.width(width).height(mainHeight).margin(margin.left).y(margin.top);
		
		// Update the placement of the viz
		chart.datum(vizdata).call(swimlane);
//		chart.datum(vizdata).call(overview);
		
		// Refresh the contents
		refresh();
	}
	
	// Attach a handler to the window to redraw on resize
	$(window).resize(draw);
	
	draw(); // Finally, draw it
}