//lightweight is an optional argument that will try to draw the graph as fast as possible
function XTraceSwimLane(attachPoint, tasksdata, gcdata, /*optional*/ params) {	
	// Create the data representation
	var data = new Workload(tasksdata, gcdata);

	// Assign a lane number to the threads
	var threads = data.Threads();
	for (var i = 0; i < threads.length; i++) {
		threads[i].lanenumber = i;
		if (threads[i].process.lanenumber==null)
			threads[i].process.lanenumber = i;
	}

	// Generate colours for each process
	var processes = data.Processes();
	for (var i = 0; i < processes.length; i++) {
		processes[i].color = d3.rgb(200 + Math.random() * 20, 200 + Math.random() * 20, 200 + Math.random() * 20);
	}

	// Specify the margins, width and height of each component
	var margin = {top: 20, right: 15, bottom: 15, left: 120};
	var width = $(window).width() - margin.left - margin.right;
	var height = $(window).height() - margin.top - margin.bottom;
	var miniHeight = threads.length * 12 + 50;
	var mainHeight = height - miniHeight - 50;

	// Create the root SVG element and set its width and height
	var chart = d3.select(attachPoint).append('svg:svg').attr('class', 'chart');
	chart.attr('width', width + margin.right + margin.left)
	chart.attr('height', height + margin.top + margin.bottom)
	
	// Create the scales
	var datalen = data.max - data.min;
	var rangemin = data.min - datalen / 10.0;
	var rangemax = data.max + datalen / 10.0;
	var x1 = d3.scale.linear().range([0, width]);
	var norm = d3.scale.linear().domain([rangemin - data.min, rangemax - data.min]).range([0, width]);
	var x = d3.scale.linear().domain([rangemin, rangemax]).range([0, width]);

	// Set up the brush controls
	var initialExtent = [data.min - x.invert(5) + x.invert(0), data.max + x.invert(5) - x.invert(0)];
	var brush = d3.svg.brush().x(x).on("brush", refresh).extent(initialExtent);
	
	// This function is used whenever we zoom/unzoom, to refresh what's displayed
	function refresh() {
		var minExtent = brush.extent()[0];
		var maxExtent = brush.extent()[1];

		if (maxExtent - minExtent < 0.00001)
			maxExtent = minExtent+0.00001;

		x1.domain([minExtent, maxExtent]);
		norm.domain([minExtent - data.min, maxExtent - data.min]);

		d3.select(".chart").datum(data).call(overview.refresh);
		d3.select(".chart").datum(data).call(swimlane.refresh);
	}
	
	var overview = SwimLaneOverview().on("refresh", refresh).brush(brush).width(width).height(miniHeight).x(margin.left).y(mainHeight+60);
	var swimlane = SwimLane().on("refresh", refresh).brush(brush).width(width).height(mainHeight).x(margin.left).y(margin.top).sx(x1).saxis(norm);

	d3.select(".chart").datum(data).call(swimlane);
	d3.select(".chart").datum(data).call(overview);
	
	refresh();

}