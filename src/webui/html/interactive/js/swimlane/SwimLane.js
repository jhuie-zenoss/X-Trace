function SwimLane() {

	/* Default values for placement of the swimlane.  User should pass these */
	var x = 0;
	var y = 0;
	var width = 500;
	var height = 100;
	
	/* Scales for scaling the data */
	var sx = d3.scale.linear();
	var sy = d3.scale.linear();
	var saxis = d3.scale.linear();

	/* event callbacks */
	var callbacks = {
		"refresh": function(){}
	};

	var brush = d3.svg.brush(); // this should be overridden by a passed-in brush
	
	var axis = d3.svg.axis().orient("bottom").ticks(10).tickSize(6, 0, 0);

	// Tooltips
	var EventTooltip = makeEventTooltip($.fn.tipsy.autoNS);
	var GCTooltip = makeGCTooltip($.fn.tipsy.autoNS);
	var HDDTooltip = makeHDDTooltip($.fn.tipsy.autoNS);

	/* Main rendering function */
	function swimlane(selection) {
		selection.each(function(data) {   
			var threads = data.Threads();
			
			sy = d3.scale.linear().domain([0, threads.length+1]).range([0, height]);

			// Create the clip def
			var defs = d3.select(this).selectAll(".clipdef").data([data]);
			defs.enter().append("defs").attr("class", "clipdef").append("clipPath").attr("id", "clip").append("rect");
			defs.select("rect").attr("width", width).attr("height", height);
			defs.exit().remove();

			// Add all of the containers for the viz
			var main = d3.select(this).selectAll(".main").data([data]);
			var newmain = main.enter().append('g').attr("class", "main");
			newmain.append("g").attr("class", "lane-background");
			newmain.append("g").attr("class", "lane-lines");
			newmain.append("g").attr("class", "lane-labels");
			newmain.append("g").attr("class", "axis");
			newmain.append("g").attr("class", "spans");
			newmain.append("g").attr("class", "timeindicator").append("line");
			newmain.append("g").attr("class", "edges");
			newmain.append("g").attr("class", "gc");
			newmain.append("g").attr("class", "hdd");
			newmain.append("g").attr("class", "events");
			main.attr("transform", "translate("+x+","+y+")").attr("width", width).attr("height", height);
			main.exit().remove();

			// Draw the thread backgrounds
			var lanes = main.select(".lane-background").selectAll("rect").data(threads);
			lanes.enter().append('rect').attr('fill', function(d) { return d.process.color.brighter(0.3); });
			lanes.attr('x', 0).attr('y', function(d) { return sy(d.lanenumber); }).attr('width', width).attr('height', function(d) { return sy(1); });
			lanes.exit().remove();

			// Draw the lines between threads
			var lanelines = main.select(".lane-lines").selectAll("line").data(threads);
			lanelines.enter().append('line');
			lanelines.attr('x1', 0).attr('y1', function(d) { return d3.round(sy(d.lanenumber)) + 0.5; }).attr('x2', width).attr('y2', function(d) { return d3.round(sy(d.lanenumber)) + 0.5; });
			lanelines.exit().remove();

			// Draw the lane labels
			var lanelabels = main.select(".lane-labels").selectAll("text").data(threads);
			lanelabels.enter().append("text").attr('text-anchor', 'end').attr('fill', function(d) { return d.process.color.darker(1); }).text(function(d) { return d.Name(); });
			lanelabels.attr('x', -5).attr('y', function(d) { return sy(d.lanenumber+0.5); }).attr("dominant-baseline", "middle");
			lanelabels.exit().remove();
			
			// Draw the time axis
			main.select(".axis").attr("transform", "translate(0,"+height+")").call(axis.scale(saxis));

			// Update the clip paths of the visualization elements
			main.select(".spans").attr("clip-path", "url(#clip)");
			main.select(".timeindicator").attr("clip-path", "url(#clip)");
			main.select(".edges").attr("clip-path", "url(#clip)");
			main.select(".gc").attr("clip-path", "url(#clip)");
			main.select(".hdd").attr("clip-path", "url(#clip)");
			main.select(".events").attr("clip-path", "url(#clip)");
			
			// Add a mouse marker if drawing for the first time
			newmain.select(".timeindicator line").attr('y1', 0).attr('y2', height);
			newmain.on("mousemove", function(e) {
				var mousex = d3.mouse(this)[0];
				d3.select(this).select(".timeindicator line").attr('x1', mousex).attr('x2', mousex);				
			});

			// Attach the zoom behaviour.  A little bit hairy for now
			var moving = false,
			lastx = null;
			main.on("mousedown", function() { moving = true; lastx = null; });
			main.on("mouseup", function() { moving = false; lastx = null; });

			var zoom = d3.behavior.zoom();
			zoom.on("zoom", function() {
				var datalen = data.max - data.min;
				var rangemin = data.min - datalen / 10.0;
				var rangemax = data.max + datalen / 10.0;
				
				var mousex = sx.invert(d3.mouse(this)[0]);
				var brushExtent = brush.extent();

				// do the zoom in or out, clamping if necessary
				var newx0 = mousex +  ((brushExtent[0] - mousex) / d3.event.scale);
				var newx1 = mousex + ((brushExtent[1] - mousex) / d3.event.scale);
				newx0 = Math.max(newx0, rangemin);
				newx1 = Math.min(newx1, rangemax);

				// Apply any translate
				if (moving) {
					if (lastx!=null) {
						var deltax = sx.invert(lastx) - sx.invert(d3.event.translate[0]);
						if ((newx0 > rangemin || deltax > 0) && (newx1 < rangemax || deltax < 0)) {
							newx0 = newx0 + deltax;
							newx1 = newx1 + deltax;
						}
					}
					lastx = d3.event.translate[0];
				}

				// apply the extent and refresh
				brush.extent([newx0, newx1]);
				callbacks["refresh"].call(this);
				zoom.scale(1);
			});
			zoom.call(main);
			
		});

	};
	
	swimlane.refresh = function(selection) {
        selection.each(function(data) {
        	var main = d3.select(this).select(".main");
        	
        	// Hide open tooltips
    		EventTooltip.hide();
    		GCTooltip.hide();
    		HDDTooltip.hide();
    		
    		var minExtent = sx.domain()[0];
    		var maxExtent = sx.domain()[1];
    		
    		// Figure out which data should be drawn
    		var spandata = data.Spans().filter(function (d) { return d.Start() < maxExtent && d.End() > minExtent; });
    		var eventdata = data.Events().filter(function(d) { return d.Timestamp() > minExtent && d.Timestamp() < maxExtent; });
    		var edgedata = data.Edges().filter(function(d) { return d.parent.Timestamp() < maxExtent && d.child.Timestamp() > minExtent; });
    		var gcdata = data.GCEvents().filter(function(d) { return d.start < maxExtent && d.end > minExtent; });
    		var hdddata = data.HDDEvents().filter(function(d) { return d.start < maxExtent && d.end > minExtent; });
    		
    		// Update the span rects
    		var spans = main.select(".spans").selectAll("rect").data(spandata, function(d){return d.ID();});
    		spans.enter().append("rect").classed("waiting", function(d){return d.waiting;})
    		.attr('y', function(d) { return sy(d.thread.lanenumber) + .1 * sy(1) + 0.5; })
    		.attr('height', function(d) { return .8 * sy(1); })
    		.attr("fill", function(d) { return d.thread.process.color; });
    		spans.attr('x', function(d) { return sx(d.Start()); })
    		.attr('width', function(d) { return sx(d.End()) - sx(d.Start()); });
    		spans.exit().remove();

    		// Update the event dots
    		var events = main.select(".events").selectAll("circle").data(eventdata, function(d){return d.ID();});
    		events.enter().append('circle').attr("class", function(d) { return d.type; })
    		.attr('cy', function(d) { return sy(d.span.thread.lanenumber) + .5 * sy(1); })
    		.attr('r', function(d) { return d.type=="event" ? 5 : 2; })
    		.attr('id', function(d) { return d.ID(); })
    		.call(EventTooltip);
    		events.attr('cx', function(d) { return sx(d.Timestamp()); });
    		events.exit().remove();

    		// update the causality edges
    		var edges = main.select(".edges").selectAll("line").data(edgedata, function(d) {return d.id;});
    		edges.enter().append("line")
    		.attr('y1', function(d) { return sy(d.parent.span.thread.lanenumber) + .5 * sy(1); })
    		.attr('y2', function(d) { return sy(d.child.span.thread.lanenumber) + .5 * sy(1); })
    		.attr('class', function(d) {
    			if (d.parent.span.thread.process!=d.child.span.thread.process)
    				return "interprocess";
    			else if (d.parent.span.thread!=d.child.span.thread)
    				return "interthread";
    			else
    				return "internal";
    		});
    		edges.attr('x1', function(d) { return sx(d.parent.Timestamp()); })
    		.attr('x2', function(d) { return sx(d.child.Timestamp()); });
    		edges.exit().remove();
    		
    		// Update the GC blocks
    		var gc = main.select(".gc").selectAll("rect").data(gcdata, function(d) { return d.ID(); });
    		gc.enter().append("rect")
    		.attr('y', function(d) { return sy(d.process.lanenumber); })
    		.attr('height', function(d) { return sy(d.process.Threads().length); })
    		.call(GCTooltip);
    		gc.attr('x', function(d) { return sx(d.start); })
    		.attr('width', function(d) { return sx(d.end) - sx(d.start); });
    		gc.exit().remove();

    		// Update the HDD blocks
    		var hdd = main.select(".hdd").selectAll("rect").data(hdddata, function(d) { return d.ID(); });
    		hdd.enter().append('rect').attr('class', function(d) { return d.type; })
    		.attr('y', function(d) { return sy(d.span.thread.lanenumber + 0.25); })
    		.attr('height', function(d) { return sy(0.5); })
    		.call(HDDTooltip);
    		hdd.attr('x', function(d) { return sx(d.start); })
    		.attr('width', function(d) { return sx(d.end) - sx(d.start); });
    		hdd.exit().remove();

    		// Update the axis
			main.select(".axis").call(axis.scale(saxis));
        });
    };

	swimlane.on = function(evt, cb) {
		if (cb==null)
			return callbacks[evt];
		callbacks[evt] = cb;
		return swimlane;
	};

	swimlane.brush = function(_) { if (!arguments.length) return brush; brush = _; return swimlane; };
	swimlane.x = function(_) { if (!arguments.length) return x; x = _; return swimlane; };
	swimlane.y = function(_) { if (!arguments.length) return y; y = _; return swimlane; };
	swimlane.width = function(_) { if (!arguments.length) return width; width = _; return swimlane; };
	swimlane.height = function(_) { if (!arguments.length) return height; height = _; return swimlane; };
	swimlane.sx = function(_) { if (!arguments.length) return sx; sx = _; return swimlane; };
	swimlane.saxis = function(_) { if (!arguments.length) return saxis; saxis = _; return swimlane; };


	return swimlane;    
}