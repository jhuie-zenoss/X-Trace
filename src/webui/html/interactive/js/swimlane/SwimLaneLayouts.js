/* One swimlane per thread */
function PerThreadLayout() {
	var spacing = 10;
	
	var layout = function(data, height) {
		var cache = {};
		
		var processes = data.Processes();
		var numprocs = processes.length;
		
		var processspacing = Math.min(spacing, height / (numprocs - 1)); 
		var threadheight = (height - (numprocs - 1) * processspacing) / data.Threads().length;
		
		var lanes = [];
		
		var offset = 0;
		for (var i = 0; i < processes.length; i++) {
			cache[processes[i].ID()] = offset;
			var threads = processes[i].Threads();
			for (var j = 0; j < threads.length; j++) {
				cache[threads[j].ID()] = offset;
				lanes.push(offset);
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
	return layout;
};

/* At any given time, each active thread is in its own lane, but when a thread ends it lane can be reused by a later new thread */
function ReusableLaneLayout() {
	var spacing = 10;
	
	var layout = function(data, height) {
		var cache = {};
		
		var processes = data.Processes();
		var offset = 0;
		var lanemap = {};
		var procmap = {};
		for (var i = 0; i < processes.length; i++) {
			var process = processes[i];
			var threads = process.Threads();
			var spans = process.Spans();
			
			// first, assign each thread its own lane
			var spanlanes = {};
			var threadlanes = {};
			for (var j = 0; j < threads.length; j++) {
				threadlanes[threads[j].ID()] = j;
				threads[j].Spans().forEach(function(span) { spanlanes[span.ID()] = j; });
			
			}
			
			// now determine the maximum number of concurrent spans, to see whether we can compact
			var spanstarts = spans.map(function(span) { return span.Start(); }).sort().reverse();
			var spanends = spans.map(function(span) { return span.End(); }).sort().reverse();
			var maxconcurrent = 0;
			var count = 0;
			var nextstart = spanstarts.pop();
			var nextend = spanends.pop();
			while (nextstart != null) {
				if (nextstart < nextend) {
					count++;
					nextstart = spanstarts.pop();
				} else {
					count--;
					nextend = spanends.pop();
				}
				if (count > maxconcurrent)
					maxconcurrent = count;
			}
			
			console.log("process " + i + " has maxconcurrent = " + maxconcurrent + " and threads " + threads.length);
			
			// compact if we can
			if (maxconcurrent < threads.length) {
				var affinity = {};
				var spanends = [];
				for (var j = 0; j < threads.length; j++) {
					affinity[threads[j].ID()] = j % maxconcurrent;
					spanends[j] = 0;
				}
				
				for (var j = 0; j < spans.length; j++) {
					var span = spans[j];
					var spanaffinity = affinity[span.thread.ID()];
					var spanstart = span.Start();
					for (var k = 0; k < maxconcurrent; k++) {
						var candidate = (spanaffinity + k) % maxconcurrent;
						if (spanends[candidate] < spanstart) {
							spanends[candidate] = span.End();
							spanlanes[span.ID()] = candidate;
							break;
						}
					}
				}
			}
			
			// finally, populate the cache with the determined span lanes
			for (var spanid in spanlanes) {
				lanemap[spanid] = spanlanes[spanid] + offset;
				procmap[process.ID()] = offset;
			}
			
			// update the offset for the next process
			offset = offset + maxconcurrent;
		}
		
		var numlanes = offset;
		
		console.log("there are " + numlanes + " lanes");
		
		var processspacing = Math.min(spacing, height / (processes.length - 1)); 
		var laneheight = (height - (processes.length - 1) * processspacing) / numlanes;
		
		console.log("process spacing is " + processspacing + " and laneheight " + laneheight);
		console.log("lanemap: ", lanemap);
		
		var lanes = {};
		
		for (var i = 0; i < processes.length; i++) {
			var procid = processes[i].ID();
			var offset = i * processspacing + procmap[procid] * laneheight;
			console.log("process " + i + " offset " + offset);
			cache[procid] = offset;
			var spans = processes[i].Spans();
			for (var j = 0; j < spans.length; j++) {
				var spanid = spans[j].ID();
				cache[spanid] = offset + lanemap[spanid] * laneheight;
				lanes[cache[spanid]] = true;
			}
		}
		
		console.log("lanemap", lanemap);
		
		function offsetOf(obj) {
			if (cache.hasOwnProperty(obj.ID()))
				return cache[obj.ID()];
			var offset = 0;
			
			if (obj instanceof XEvent)
				offset = offsetOf(obj.span);
			else if (obj instanceof XThread)
				offset = offsetOf(obj.process);
			else if (obj instanceof XMachine)
				offset = offsetOf(obj.Processes()[0]);
			else if (obj instanceof GCEvent)
				offset = offsetOf(obj.process);
			
			cache[obj.ID()] = offset;
			return offset;
		}
		
		offsetOf.laneHeight = function() { return laneheight; };
		offsetOf.lanes = function() { return Object.keys(lanes); };
		
		console.log("lanes are " + offsetOf.lanes());
		
		return offsetOf;
		
	};
	
	layout.spacing = function(_) { if (!arguments.length) return spacing; spacing = _; return layout; };
	return layout;
};

