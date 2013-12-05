var Workload = function(data, gcdata) {
	this.data = data;
	this.gcdata = gcdata;
	this.id = unique_id();

	// Create the data structures
	this.tasks = {};
	for (var i = 0; i < data.length; i++) {
		this.tasks[data[i]["id"]] = new XTask(data[i]);
	}

	// Determine the timestamp extents of the data
	var minTimestamp = Infinity;
	var maxTimestamp = -Infinity;
	var events = this.Events();
	for (var i = 0; i < events.length; i++) {
		var timestamp = events[i].Timestamp();
		if (timestamp < minTimestamp)
			minTimestamp = timestamp;
		if (timestamp > maxTimestamp)
			maxTimestamp = timestamp;
	}

	this.min = minTimestamp;
	this.max = maxTimestamp;

	// Now create the GC events, if possible.  Even though two tasks may technically share the same process,
	// they will actually have separate process objects, so we create a GCEvent for each of them.
	if (gcdata) {
		var processes = this.Processes();
		for (var i = 0; i < processes.length; i++) {
			var process = processes[i];
			var gcreports = gcdata[process.id];
			if (gcreports) {
				process.gcevents = gcreports.map(function(report) { return new GCEvent(process, report); });
				process.gcevents = process.gcevents.filter(function(gcevent) { 
					return gcevent.start <= maxTimestamp && gcevent.end >= minTimestamp && gcevent.duration > 0; 
				});
			}
		}
	}
};

Workload.prototype.Tasks = function() {
	var tasks = this.tasks;
	var keys = Object.keys(this.tasks);
	var values = keys.map(function(k) { return tasks[k]; });
	values.sort(function(a, b) { return a.Start() - b.Start(); });
	return values;	
};

Workload.prototype.Machines = function() {
	return [].concat.apply([], this.Tasks().map(function(task) { return task.Machines(); }));   
};

Workload.prototype.Processes = function() {
	return [].concat.apply([], this.Tasks().map(function(task) { return task.Processes(); }));   
};

Workload.prototype.Threads = function() {
	var threads = [].concat.apply([], this.Tasks().map(function(task) { return task.Threads(); }));
	return threads;
};

Workload.prototype.Spans = function() {
	return [].concat.apply([], this.Tasks().map(function(task) { return task.Spans(); }));   
};

Workload.prototype.Events = function() {
	return [].concat.apply([], this.Tasks().map(function(task) { return task.Events(); }));   
};

Workload.prototype.Edges = function() {
	return [].concat.apply([], this.Tasks().map(function(task) { return task.Edges(); }));
};

Workload.prototype.GCEvents = function() {
	return [].concat.apply([], this.Tasks().map(function(task) { return task.GCEvents(); }));
};

Workload.prototype.HDDEvents = function() {
	return this.Events().filter(function(event) { return event.report["Operation"] && event.report["Operation"][0].substring(0, 4)=="file"; });
};

Workload.prototype.ID = function() {
	return ""+this.id;
};

Workload.getID = function(workload) {
	return workload.ID();
};

var XTask = function(data) {
	// Copy the params
	this.id = data.id;
	this.reports = data.reports;
	this.reports_by_id = {};

	for (var i = 0; i < this.reports.length; i++) {
		var report = this.reports[i];
		var reportid = report["X-Trace"][0].substr(18);
		this.reports_by_id[reportid] = report;
	}

	// Create the data structures
	this.machines = {};
	var reports_by_machine = group_reports_by_field(data.reports, "Host");
	for (var machine_id in reports_by_machine)
		this.machines[machine_id] = new XMachine(this, machine_id, reports_by_machine[machine_id]);
	
	// Extract the tags
	var tags = {};
	for (var i = 0; i < this.reports.length; i++) {
	  if (this.reports[i]["Tag"])
	    for (var j = 0; j < this.reports[i]["Tag"].length; j++)
	      tags[this.reports[i]["Tag"][j]] = true;
	}
	this.tags = Object.keys(tags);
};

XTask.prototype.Machines = function() {
	var machines = this.machines;
	var keys = Object.keys(this.machines);
	var values = keys.map(function(k) { return machines[k]; });
	values.sort(function(a, b) { return a.Start() - b.Start(); });
	return values;
};

XTask.prototype.Processes = function() {
	return [].concat.apply([], this.Machines().map(function(machine) { return machine.Processes(); }));   
};

XTask.prototype.Threads = function() {
	return [].concat.apply([], this.Machines().map(function(machine) { return machine.Threads(); }));
};

XTask.prototype.Spans = function() {
	return [].concat.apply([], this.Machines().map(function(machine) { return machine.Spans(); }));   
};

XTask.prototype.Events = function() {
	return [].concat.apply([], this.Spans().map(function(span) { return span.Events(); }));   
};

XTask.prototype.Edges = function() {
	return [].concat.apply([], this.Events().map(function(event) { return event.Edges(); }));
};

XTask.prototype.GCEvents = function() {
	return [].concat.apply([], this.Machines().map(function(machine) { return machine.GCEvents(); }));
};

XTask.prototype.HDDEvents = function() {
  return this.Events().filter(function(event) { return event.report["Operation"] && event.report["Operation"][0].substring(0, 4)=="file"; });
};

XTask.prototype.ID = function() {
	return "Task-"+this.id;
};

XTask.prototype.Start = function() {
	return Math.min.apply(this, this.Machines().map(function(machine) { return machine.Start(); }));
};

XTask.prototype.End = function() {
  return Math.max.apply(this, this.Machines().map(function(machine) { return machine.End(); }));  
};

XTask.prototype.Tags = function() {
  return this.tags;
};

XTask.getID = function(task) {
	return task.ID();
};

var XEvent = function(span, report) {
	this.report = report;
	this.span = span;
	this.id = report["X-Trace"][0].substr(18);
	this.fqid = this.span.ID() + "_Event-"+this.id;
	this.timestamp = parseFloat(this.report["Timestamp"][0]);
	this.type = "event";
	if (this.report["Operation"])
		this.type = "operation " + this.report["Operation"][0];
	if (this.report["Duration"]) {
		this.duration = Number(this.report["Duration"][0]) / 1000000.0;
		this.start = this.timestamp - this.duration;
		this.end = this.timestamp;
	}
	if (this.report["Operation"] && this.report["Operation"][0].substr(0, 4)=="file" && this.report["Class"][0].indexOf("ScheduledFileIO")!=-1) {
//	if (this.report["Operation"] && this.report["Class"][0].startsWith("edu.brown.cs.systems.xtrace.resourcetracing.events.ScheduledFileIO")!=-1) {
	  var keys = ["PreWait", "PreDuration", "IOWait", "IODuration", "PostWait", "PostDuration"];
	  this.duration = 0;
	  for (var i = 0; i < keys.length; i++) {
	    if (this.report[keys[i]])
	      this.duration += Number(this.report[keys[i]][0]);
	  }
	  this.duration = this.duration / 1000000.0;
	  this.start = this.timestamp - this.duration;
	  this.end = this.timestamp;
	}

	this.span.thread.process.machine.task.reports_by_id[this.id] = this;
};

XEvent.prototype.Edges = function() {
	if (this.edges==null) {
		this.edges = [];
		var parents = this.report["Edge"];
		for (var i = 0; i < parents.length; i++) {
			var edge = {
					id: this.id+parents[i],
					parent: this.span.thread.process.machine.task.reports_by_id[parents[i]],
					child: this
			};
			if (edge.parent && edge.child) 
				this.edges.push(edge);
		}
	}
	return this.edges;    
};

XEvent.prototype.Timestamp = function() {
	return this.timestamp;
};

XEvent.prototype.ID = function() {
	return this.fqid;
};

XEvent.getID = function(event) {
	return event.ID();
};

var XSpan = function(thread, id, reports) {
	this.thread = thread;
	this.id = id;
	this.fqid = this.thread.ID() + "_Span(" + this.id + ")";
	this.events = [];
	this.waiting = false; // is this a span where a thread is waiting?
	for (var i = 0; i < reports.length; i++) {
		if (reports[i]["Operation"] && reports[i]["Operation"][0].substring(0, 4)=="file") {
			this.events.push(new XEvent(this, reports[i]));
		} else {
			this.events.push(new XEvent(this, reports[i]));
		}
	}
	this.events.sort(function(a, b) { return a.timestamp - b.timestamp; });
	this.start = this.events[0].Timestamp();
	this.end = this.events[this.events.length-1].Timestamp();
};

XSpan.prototype.ID = function() {
	return this.fqid;
};

XSpan.prototype.Events = function() {
	return this.events;
};

XSpan.prototype.Edges = function() {
  return [].concat.apply([], this.Events().map(function(event) { return event.Edges(); }));
};

XSpan.prototype.Start = function() {
	return this.start;
};

XSpan.prototype.End = function() {
	return this.end;
};

XSpan.getID = function(span) {
	return span.ID();
};

var XThread = function(process, id, reports) {
	reports.sort(function(a, b) { return parseFloat(a["Timestamp"][0]) - parseFloat(b["Timestamp"][0]); })
	this.process = process;
	this.id = id;
	this.fqid = this.process.ID() + "_Thread-"+this.id;
	this.llid = this.process.llid + "_Thread-"+this.id;

	this.spans = [];
	var span = [];
	for (var i = 0; i < reports.length; i++) {
		if (reports[i]["Operation"] && reports[i]["Operation"][0]=="waited") {
			/* Special case: a 'wait' report.  A 'wait' report translates into two events; a start and end.
			 * A 'wait' report is generated at the end of the wait, and contains a field specifying the duration
			 * of the wait.  So we must manually reconstruct the begin event of the wait */

			// The duration of the wait event
			var duration = Number(reports[i]["Duration"][0]) / 1000000.0;

			// Add an event to the end of the prior span and modify the timestamp
			span.push(reports[i]);
			var preWait = new XSpan(this, this.spans.length, span);
			var preWaitEndEvent = preWait.events[preWait.events.length-1];
			this.spans.push(preWait);

			// Create a span just for the event
			var Wait = new XSpan(this, this.spans.length, [reports[i], reports[i]]);
			Wait.waiting = true;
			Wait.events[0].timestamp = Wait.events[0].timestamp - duration;
			preWaitEndEvent.timestamp = Wait.events[0].timestamp; // modify the timestamp of the end event of the prior span
			this.spans.push(Wait);

			// Fix start/end ts (a hack, whatever)
			preWait.end = preWaitEndEvent.timestamp;
			Wait.start = Wait.events[0].timestamp;

			// Create the start of the next span;
			span = [reports[i]];
		} else if (reports[i]["Operation"] && reports[i]["Operation"][0]=="unset") {
			span.push(reports[i]);
			this.spans.push(new XSpan(this, this.spans.length, span));
			span = [];
		} else {
			span.push(reports[i]);            
		}
	}
	if (span.length > 0)
		this.spans.push(new XSpan(this, this.spans.length, span));
	this.spans.sort(function(a, b) { return a.Start() - b.Start(); });
};

XThread.prototype.ID = function() {
	return this.fqid;
};

XThread.prototype.ShortName = function() {
	var defaultName = "Thread-"+this.id;
	var names = {};
	names[defaultName] = true;
	var events = this.Events();
	for (var i = 0; i < events.length; i++) {
		if (events[i].report["ThreadName"])
			names[events[i].report["ThreadName"][0]] = true;
	}
	delete names[defaultName];
	var othernames = Object.keys(names);
	if (othernames.length > 0) {
		var selected = othernames[0];
		if (selected.length > 20)
			return selected.substring(0, 20)+"...";
		else
			return selected;
	}
	return "Thread-"+this.id;
};

XThread.prototype.Spans = function() {
	return this.spans;
};

XThread.prototype.Events = function() {
  return [].concat.apply([], this.Spans().map(function(span) { return span.Events(); }));
};

XThread.prototype.Edges = function() {
  return [].concat.apply([], this.Spans().map(function(span) { return span.Edges(); }));
};

XThread.prototype.Start = function() {
  return Math.min.apply(this, this.Spans().map(function(span) { return span.Start(); }));
};

XThread.prototype.End = function() {
  return Math.max.apply(this, this.Spans().map(function(span) { return span.End(); }));
};

XThread.getID = function(thread) {
	return thread.ID();
};

XThread.sharedID = function(thread) {
  return thread.llid;
};

XThread.prototype.HDDEvents = function() {
  return this.Events().filter(function(event) { return event.report["Operation"] && event.report["Operation"][0].substring(0, 4)=="file"; });
};

var XProcess = function(machine, id, reports) {
	this.machine = machine;
	this.id = id;
	this.fqid = this.machine.ID() + "_Process-"+id.replace("@","");
	this.llid = this.machine.llid + "_Process-"+id.replace("@","");
	this.gcevents = [];

	// We want high resolution timestamps, so perform some averaging
	if (reports[0]["HRT"]) {
		var totalTS = 0.0;
		var totalHRT = 0.0;
		var count = 0.0;
		for (var i = 0; i < reports.length; i++) {
			totalTS += Number(reports[i]["Timestamp"][0]);
			totalHRT += Number(reports[i]["HRT"][0]);
			count += 1.0;
		}

		var avgHRT = totalHRT / count;
		var avgTS = totalTS / count;
		for (var i = 0; i < reports.length; i++) {
			var reportHRT = Number(reports[i]["HRT"][0]);
			var reportTS = avgTS + (reportHRT - avgHRT) / 1000000.0;
			reports[i]["Timestamp"][0] = ""+reportTS;
		}
	}

	var reports_by_thread = group_reports_by_field(reports, "ThreadID");

	this.threads = {};
	for (var thread_id in reports_by_thread)
		this.threads[thread_id] = new XThread(this, thread_id, reports_by_thread[thread_id]);
};

XProcess.prototype.ID = function() {
	return this.fqid;
};

XProcess.prototype.Threads = function() {
	var threads = this.threads;
	var keys = Object.keys(this.threads);
	var values = keys.map(function(k) { return threads[k]; });
	values.sort(function(a, b) { return a.Start() - b.Start(); });
	return values;
};

XProcess.prototype.Spans = function() {
	return [].concat.apply([], this.Threads().map(function(thread) { return thread.Spans(); }));
};

XProcess.prototype.Events = function() {
  return [].concat.apply([], this.Threads().map(function(thread) { return thread.Events(); }));
};

XProcess.prototype.Edges = function() {
  return [].concat.apply([], this.Threads().map(function(thread) { return thread.Edges(); }));
};

XProcess.prototype.Start = function() {
  return Math.min.apply(this, this.Threads().map(function(thread) { return thread.Start(); }));
};

XProcess.prototype.End = function() {
  return Math.max.apply(this, this.Threads().map(function(thread) { return thread.End(); }));
};

XProcess.prototype.GCEvents = function() {
	return this.gcevents;
};

XProcess.getID = function(process) {
	return process.ID();
};

XProcess.sharedID = function(process) {
  return process.llid;
};

var XMachine = function(task, id, reports) {
	this.task = task;
	this.id = id;
	this.fqid = this.task.ID() + "_Machine-"+this.id;
	this.llid = "Machine-"+this.id;

	var reports_by_process = group_reports_by_field(reports, "ProcessID");

	this.processes = {};
	for (var process_id in reports_by_process) {
		this.processes[process_id] = new XProcess(this, process_id, reports_by_process[process_id]);
	}
};

XMachine.prototype.ID = function() {
	return this.fqid;
};

XMachine.prototype.Processes = function() {
	var processes = this.processes;
	var keys = Object.keys(this.processes);
	var values = keys.map(function(k) { return processes[k]; });
	values.sort(function(a, b) { return a.Start() - b.Start(); });
	return values;
};

XMachine.prototype.Threads = function() {
	return [].concat.apply([], this.Processes().map(function(process) { return process.Threads(); }));
};

XMachine.prototype.Spans = function() {
	return [].concat.apply([], this.Processes().map(function(process) { return process.Spans(); }));    
};

XMachine.prototype.Events = function() {
	return [].concat.apply([], this.Processes().map(function(process) { return process.Events(); }));    
};

XMachine.prototype.Start = function() {
  return Math.min.apply(this, this.Processes().map(function(process) { return process.Start(); }));
};

XMachine.prototype.End = function() {
  return Math.max.apply(this, this.Processes().map(function(process) { return process.End(); }));
};

XMachine.prototype.GCEvents = function() {
  return [].concat.apply([], this.Processes().map(function(process) { return process.GCEvents(); }));
};

XMachine.prototype.Edges = function() {
  return [].concat.apply([], this.Processes().map(function(process) { return process.Edges(); }));
};

XMachine.getID = function(machine) {
	return machine.ID();
};

XMachine.sharedID = function(machine) {
  return machine.llid;
};

function group_reports_by_field(reports, field) {
	var grouping = {};
	for (var i = 0; i < reports.length; i++) {
		try {
			var value = reports[i][field][0];
			if (!(value in grouping))
				grouping[value] = [];
			grouping[value].push(reports[i]);
		} catch (e) {
			console.log(e);
		}
	}
	return grouping;
}

var GCEvent = function(process, report) {
	this.report = report;
	this.process = process;
	this.id = report["X-Trace"][0].substr(18);
	this.fqid = this.process.ID() + "_GC-" + this.id;

	this.start = Number(this.report["GcStart"][0])+1;
	this.duration = Number(this.report["GcDuration"][0])-1;
	this.end = this.start + this.duration;
	this.name = this.report["GcName"][0];
};

GCEvent.prototype.ID = function() {
	return this.fqid;
};

GCEvent.getID = function(event) {
	return event.ID();
};
