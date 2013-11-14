jQuery.fn.outerHTML = function() {
	return jQuery('<div />').append(this.eq(0).clone()).html();
};

var timestampToTimeString = function(timestamp) {
	timestamp = Math.floor(timestamp);
	var date = new Date(timestamp);
	var hours = date.getHours();
	var minutes = date.getMinutes();
	minutes = minutes < 10 ? '0'+minutes : minutes;
	var seconds = date.getSeconds();
	seconds = seconds < 10 ? '0'+seconds : seconds;
	var milliseconds = date.getMilliseconds();
	milliseconds = milliseconds < 10 ? '00'+milliseconds : milliseconds < 100 ? '0'+milliseconds : milliseconds;
	return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
};

/* Default tooltip for events */
var makeEventTooltip = function(gravity) {

	var tooltip = Tooltip(gravity).title(function(d) {
		var report = d.report;

		var reserved = ["Source", "Operation", "Agent", "Label", "Class", "Timestamp", "HRT", "Cycles", "Host", "ProcessID", "ThreadID", "ThreadName", "X-Trace"];

		function appendRow(key, value, tooltip) {
			var keyrow = $("<div>").attr("class", "key").append(key);
			var valrow = $("<div>").attr("class", "value").append(value);
			var clearrow = $("<div>").attr("class", "clear");
			tooltip.append($("<div>").append(keyrow).append(valrow).append(clearrow));
		}

		var tooltip = $("<div>").attr("class", "xtrace-tooltip");
		var seen = {"Edge": true, "version": true};

		// Do the reserved first
		for (var i = 0; i < reserved.length; i++) {
			var key = reserved[i];
			if (report.hasOwnProperty(key)) {
				seen[key] = true;
				if (key=="Timestamp") {
					appendRow(key, timestampToTimeString(report[key][0]), tooltip);
				} else {
					appendRow(key, report[key].join(", "), tooltip);
				}

			}
		}

		// Do the remainder
		for (var key in report) {
			if (!seen[key]) {
				appendRow(key, report[key].join(", "), tooltip);
			}
		}

//		// Do the label
//		appendRow("(hash)", hash_report(report), tooltip);

		return tooltip.outerHTML();
	});

	return tooltip;
};

//For XTrace Swimlane GC
var makeGCTooltip = function(gravity) {

	var tooltip = Tooltip(gravity).title(function(d) {
		var report = d.report;

		function appendRow(key, value, tooltip) {
			var keyrow = $("<div>").attr("class", "key").append(key);
			var valrow = $("<div>").attr("class", "value").append(value);
			var clearrow = $("<div>").attr("class", "clear");
			tooltip.append($("<div>").append(keyrow).append(valrow).append(clearrow));
		}

		var tooltip = $("<div>").attr("class", "xtrace-tooltip");

		appendRow("", "<div style='padding-bottom:10px'><b>Garbage Collection Event</b></div>", tooltip);
		appendRow("ProcessID", report["ProcessID"][0], tooltip);
		appendRow("Thread", "<div style='padding-bottom:10px'>" + report["ThreadID"][0] + " ("+report["ThreadName"][0] + ")</div>", tooltip);
		appendRow("Start", timestampToTimeString(report["GcStart"][0]), tooltip);
		appendRow("End", timestampToTimeString(Number(report["GcStart"][0]) + Number(report["GcDuration"][0])), tooltip);
		appendRow("Duration", "<div style='padding-bottom:10px'>" + report["GcDuration"][0]+" ms</div>", tooltip);
		appendRow("Name", report["GcName"][0], tooltip);
		appendRow("Cause", report["GcCause"][0], tooltip);
		appendRow("Action", report["GcAction"][0], tooltip);

		return tooltip.outerHTML();
	});

	return tooltip;

};

//For XTrace Swimlane GC
var makeHDDTooltip = function(gravity) {

	var tooltip = Tooltip(gravity).title(function(d) {
		var report = d.report;

		function appendRow(key, value, tooltip) {
			var keyrow = $("<div>").attr("class", "key").append(key);
			var valrow = $("<div>").attr("class", "value").append(value);
			var clearrow = $("<div>").attr("class", "clear");
			tooltip.append($("<div>").append(keyrow).append(valrow).append(clearrow));
		}

		var tooltip = $("<div>").attr("class", "xtrace-tooltip");

		appendRow("", "<div style='padding-bottom:10px'><b>HDD Event:  " + report["Operation"][0] + "</b></div>", tooltip);
		if (report["Bytes"])
			appendRow("Bytes", Number(report["Bytes"][0]).toLocaleString() + " bytes", tooltip);
		appendRow("Duration", d.duration.toFixed(2)+" ms", tooltip);
		appendRow("File", "<div style='padding-bottom:10px'>" + report["File"][0] + "</div>", tooltip);


		appendRow("Source", report["Source"][0], tooltip);
		appendRow("Call", "<div style='padding-bottom:10px'>" + report["Signature"][0] + "</div>", tooltip);

		appendRow("Start", timestampToTimeString(d.start), tooltip);
		appendRow("End", timestampToTimeString(d.end), tooltip);

		return tooltip.outerHTML();
	});

	return tooltip;

};

var Tooltip = function(gravity) {
	if (gravity==null)
		gravity = $.fn.tipsy.autoWE;

	var tooltip = function(selection) {
		selection.each(function(d) {
			$(this).tipsy({
				gravity: gravity,
				html: true,
				title: function() { return title(d); },
				opacity: 1
			});
		});
	};

	var title = function(d) { return ""; };

	tooltip.hide = function() { $(".tipsy").remove(); };
	tooltip.title = function(_) { if (arguments.length==0) return title; title = _; return tooltip; };

	return tooltip;
};