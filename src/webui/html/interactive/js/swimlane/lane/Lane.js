// An empty function that renders nothing
var NoRender = function() {
	 var render = function(){};
	 render.refresh = function(){};
	 return render;
}();

// Draws events as dots
function EventDot() {
	var radius = function(d) { return d.type=="event" ? 5 : 2; }; // by default, variable sized events. can be set to function or value
	var tooltip = makeEventTooltip($.fn.tipsy.autoBounds(Math.min(window.width(), window.height()) / 3, "s")); // TODO: pass in as arg and have empty function as default

	var event_visible = function(sx) {
		var min = sx.domain()[0], max = sx.domain()[1];
		return function(d) { return d.Timestamp() > min && d.Timestamp() < max; };		
	};
	
	function render(eventdata, laneid) {
		d3.select(this).selectAll("circle").data(eventdata, XEvent.getID).attr("class", function(d) { return d.type; }).classed(laneid, true);
	};
	
	render.refresh = function(eventdata, laneid, laneoffset, laneheight, sx) {
		var events = d3.select(this).selectAll("circle").filter("."+laneid).data(eventdata.filter(event_visible(sx)), XEvent.getID);
		events.enter().append('circle').attr("class", function(d) { return d.type; }).classed(laneid, true)
		.attr('cy', function(d) { return laneoffset + .5 * laneheight; })
		.attr('r', radius)
		.attr('id', function(d) { return d.ID(); })
		.call(tooltip);
		events.attr('cx', function(d) { return sx(d.Timestamp()); });
		events.exit().remove();
		
	};

	render.radius = function(_) { if (!arguments.length) return radius; radius = _; return render; };
	render.tooltip = function(_) { if (!arguments.length) return tooltip; tooltip = _; return render; };
	
	return render;
}

// Draws spans as rectangles
function SpanRect() {
	var span_visible = function(sx) {
		var min = sx.domain()[0], max = sx.domain()[1];
		return function(d) { return d.Start() < max && d.End() > min; };
	};
	
	function render(spandata, laneid) {
		d3.select(this).selectAll("rect").data(spandata, XSpan.getID).attr("class", "").classed("waiting", function(d){return d.waiting;}).classed(laneid, true);			
	};
	
	render.refresh = function(spandata, laneid, laneoffset, laneheight, sx) {
		var spans = d3.select(this).selectAll("rect").filter("."+laneid).data(spandata.filter(span_visible(sx)), XSpan.getID);
		spans.enter().append("rect").classed("waiting", function(d){return d.waiting;}).classed(laneid, true)
		.attr('y', function(d) { return laneoffset + .1 * laneheight + 0.5; })
		.attr('height', function(d) { return .8 * laneheight; });
		spans.attr('x', function(d) { return sx(d.Start()); })
		.attr('width', function(d) { return sx(d.End()) - sx(d.Start()); });
		spans.exit().remove();
	};

	return render;
}

function ThreadLane() {
	// Default height of lane.  This will be set by any reasonable user
	var height = 10;
	// Renderer for events
	var events = EventDot();
	// Renderer for spans
	var spans = SpanRect();
	// Background for this thread
	var background = ThreadBackground();

	function lane(threaddata) {
		for (var i = 0; i < threaddata.length; i++) {
			var thread = threaddata[i];
			events.call(d3.select(this).select(".events").node(), thread.Events(), thread.ID());
			spans.call(d3.select(this).select(".spans").node(), thread.Spans(), thread.ID());
		}
	};
	
	lane.refresh = function(threaddata, sx, sy, offsety) {
		for (var i = 0; i < threaddata.length; i++) {
			var thread = threaddata[i];
			events.refresh.call(d3.select(this).select(".events").node(), thread.Events(), thread.ID(), sy(offsety), sy(height), sx);
			spans.refresh.call(d3.select(this).select(".spans").node(), thread.Spans(), thread.ID(), sy(offsety), sy(height), sx);
			offsety += height;
		}
		
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
	
	return lane;
};

function ThreadBackground() {
	
	function background(threaddata, processid) {
		d3.select(this).selectAll("rect").data(threaddata, XThread.ID).attr("class", "").classed(processid, true);				
	};
	
	background.refresh = function(threaddata, processid, processoffset, laneheight, sx) {
		var backgrounds = d3.select(this).selectAll("rect").filter("."+laneid).data(spandata.filter(span_visible(sx)), XSpan.getID);
		
//			console.log("lanes are: " + sy.lanes());
//			var lanes = main.select(".lane-background").selectAll("rect").data(sy.lanes());
//			lanes.enter().append('rect').attr('fill', function(d) { return d.color; });
//			lanes.attr('x', 0).attr('y', function(d) { return d.offset + 0.5; }).attr('width', width).attr('height', sy.laneHeight() - 0.5);
//			lanes.exit().remove();



		// Draw the lane labels
//		var lanelabels = main.select(".lane-labels").selectAll("text").data(sy.lanes());
//		lanelabels.enter().append("text").attr('text-anchor', 'end').attr('fill', function(d) { return d.color.darker(1); })
//		.text(function(d) { return d.title; }).call(layout.tooltip());
//		lanelabels.attr('x', -5).attr('y', function(d) { return d.offset + sy.laneHeight() * 0.5; }).attr("dominant-baseline", "middle");
//		lanelabels.exit().remove();
	}
}

function ProcessLane() {
	// Amount of spacing added beneath the process
	var padding = 10;
	// Renderer for threads
	var thread = ThreadLane();
	
	var lane = function(processdata) {
		for (var i = 0; i < processdata.length; i++) {
			thread.call(this, processdata[i].Threads());
		}
	};
	
	// Refreshes the events and spans of the lane
	lane.refresh = function(processdata, sx, sy, offsety) {
		for (var i = 0; i < processdata.length; i++) {
			offsety = thread.refresh.call(this, processdata[i].Threads(), sx, sy, offsety);
			offsety += padding;
		}
		
		return offsety;
	};
	
	// Returns the vertical height of the lanes that would be drawn for the specified process data
	lane.heightOf = function(processdata) {
		return processdata.map(function(process) { 
			return thread.heightOf(process.Threads()); 
		}).reduce(function(prev, cur) {
			return prev + cur + padding;
		});
	};

	// Sets the amount of padding that will be drawn between processes
	lane.padding = function(_) { if (!arguments.length) return padding; padding = _; return lane; };
		
	return lane;
}
