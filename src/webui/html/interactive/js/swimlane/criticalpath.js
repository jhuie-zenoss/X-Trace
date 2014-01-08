// JSON reports as argument, produce IDs on critical path
function critical_path(reports, finalreport) {
	if (finalreport==null)
		finalreport = reports[reports.length-1];
	
	var reportmap = {};
	for (var i = 0; i < reports.length; i++) {
		reportmap[report_id(reports[i])] = reports[i];
	}
	
	var cpath = [];
	var next = finalreport;
	while (next && next["Edge"]) {
		cpath.push(next);
		var parents = next["Edge"];
		next = reportmap[parents[0]];
		for (var i = 1; next==null && i < parents.length; i++) {
			next = reportmap[parents[i]];
		}
		for (var i = 1; i < parents.length; i++) {
			var candidate = reportmap[parents[i]];
			if (reportmap[parents[i]] && Number(candidate["Timestamp"][0]) > Number(next["Timestamp"][0]))
				next = candidate;
		}
	}
	
	return cpath;
};

function draw_critical_path(reports) {
	var oncpath = {};
	for (var i = 0; i < reports.length; i++) {
		oncpath[report_id(reports[i])] = true;
	}
	window.viz.Events().forEach(function(event) {
	  event.cp = oncpath[event.id];
	});
	
	
	d3.select(".events").selectAll("circle").attr("display", function(d) { 
	  if (d.cp) 
	    return "block"; 
	  else 
	    return "none"; 
	});
  d3.select(".edges").selectAll("line").attr("display", function(d) { 
    if (d.cp) 
      return "block"; 
    else 
      return "none"; 
  });
}
