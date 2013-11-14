var Workload = function(data, gcdata) {
	this.data = data;
	this.gcdata = gcdata;

	// Create the data structures
	this.tasks = {};
	for (var i = 0; i < data.length; i++) {
		this.tasks[data[i]["id"]] = new Task(data[i]);
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
}

Workload.prototype.Tasks = function() {
	var tasks = this.tasks;
	var keys = Object.keys(this.tasks);
	var values = keys.map(function(k) { return tasks[k]; });
	values.sort(function(a, b) { return a.Start() - b.Start(); });
	return values;	
}

Workload.prototype.Machines = function() {
	return [].concat.apply([], this.Tasks().map(function(task) { return task.Machines(); }));   
}

Workload.prototype.Processes = function() {
	return [].concat.apply([], this.Tasks().map(function(task) { return task.Processes(); }));   
}

Workload.prototype.Threads = function() {
	var threads = [].concat.apply([], this.Tasks().map(function(task) { return task.Threads(); }));
	return threads;
}

Workload.prototype.Spans = function() {
	return [].concat.apply([], this.Tasks().map(function(task) { return task.Spans(); }));   
}

Workload.prototype.Events = function() {
	return [].concat.apply([], this.Tasks().map(function(task) { return task.Events(); }));   
}

Workload.prototype.Edges = function() {
	return [].concat.apply([], this.Tasks().map(function(task) { return task.Edges(); }));
}

Workload.prototype.GCEvents = function() {
	return [].concat.apply([], this.Tasks().map(function(task) { return task.GCEvents(); }));
}

Workload.prototype.HDDEvents = function() {
	return this.Events().filter(function(event) { return event.report["Operation"] && event.report["Operation"][0].substring(0, 4)=="file"; });
}

Workload.prototype.ID = function() {
	return "Task("+this.id+")";
}

var Task = function(data) {
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
		this.machines[machine_id] = new Machine(this, machine_id, reports_by_machine[machine_id]);
}

Task.prototype.Machines = function() {
	var machines = this.machines;
	var keys = Object.keys(this.machines);
	var values = keys.map(function(k) { return machines[k]; });
	values.sort(function(a, b) { return a.Start() - b.Start(); });
	return values;
}

Task.prototype.Processes = function() {
	return [].concat.apply([], this.Machines().map(function(machine) { return machine.Processes(); }));   
}

Task.prototype.Threads = function() {
	return [].concat.apply([], this.Machines().map(function(machine) { return machine.Threads(); }));
}

Task.prototype.Spans = function() {
	return [].concat.apply([], this.Machines().map(function(machine) { return machine.Spans(); }));   
}

Task.prototype.Events = function() {
	return [].concat.apply([], this.Spans().map(function(span) { return span.Events(); }));   
}

Task.prototype.Edges = function() {
	return [].concat.apply([], this.Events().map(function(event) { return event.Edges(); }));
}

Task.prototype.GCEvents = function() {
	return [].concat.apply([], this.Machines().map(function(machine) { return machine.GCEvents(); }));
}

Task.prototype.ID = function() {
	return "Task("+this.id+")";
}

Task.prototype.Start = function() {
	return Math.min.apply(this, this.Machines().map(function(process) { return process.Start(); }));
}

var Event = function(span, report) {
	this.report = report;
	this.span = span;
	this.id = report["X-Trace"][0].substr(18);
	this.fqid = this.span.ID() + "_Event(" + this.id + ")";
	this.timestamp = parseFloat(this.report["Timestamp"][0]);
	this.type = "event";
	if (this.report["Operation"])
		this.type = "operation " + this.report["Operation"][0];
	if (this.report["Duration"]) {
		this.duration = Number(this.report["Duration"][0]) / 1000000.0;
		this.start = this.timestamp - this.duration;
		this.end = this.timestamp;
	}

	this.span.thread.process.machine.task.reports_by_id[this.id] = this;
}

Event.prototype.Edges = function() {
	if (this.edges==null) {
		this.edges = [];
		var parents = this.report["Edge"];
		for (var i = 0; i < parents.length; i++) {
			var edge = {
					id: this.id+parents[i],
					parent: this.span.thread.process.machine.task.reports_by_id[parents[i]],
					child: this
			}
			if (edge.parent && edge.child) 
				this.edges.push(edge);
		}
	}
	return this.edges;    
}

Event.prototype.Timestamp = function() {
	return this.timestamp;
}

Event.prototype.Name = function() {
	if (this.report["Name"] && this.report["Name"].length >= 1)
		return this.report["Name"][0];
}

Event.prototype.ProcessName = function() {

}

Event.prototype.ID = function() {
	return this.fqid;
}

var Span = function(thread, id, reports) {
	this.thread = thread;
	this.id = id;
	this.fqid = this.thread.ID() + "_Span(" + this.id + ")";
	this.events = [];
	this.waiting = false; // is this a span where a thread is waiting?
	for (var i = 0; i < reports.length; i++) {
		if (reports[i]["Operation"] && reports[i]["Operation"][0].substring(0, 4)=="file") {
			this.events.push(new Event(this, reports[i]));
		} else {
			this.events.push(new Event(this, reports[i]));
		}
	}
	this.events.sort(function(a, b) { return a.timestamp - b.timestamp; });
	this.start = this.events[0].Timestamp();
	this.end = this.events[this.events.length-1].Timestamp();
};

Span.prototype.ID = function() {
	return this.fqid;
};

Span.prototype.Name = function() {
	for (var i = 0; i < this.events.length; i++) {
		var eventname = this.events[i].Name();
		if (eventname)
			return eventname;
	}
};

Span.prototype.Events = function() {
	return this.events;
};

Span.prototype.Start = function() {
	return this.start;
};

Span.prototype.End = function() {
	return this.end;
};

var Thread = function(process, id, reports) {
	reports.sort(function(a, b) { return parseFloat(a["Timestamp"][0]) - parseFloat(b["Timestamp"][0]); })
	this.process = process;
	this.id = id;
	this.fqid = this.process.ID() + "_Thread("+this.id+")";

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
			var preWait = new Span(this, this.spans.length, span);
			var preWaitEndEvent = preWait.events[preWait.events.length-1];
			this.spans.push(preWait);

			// Create a span just for the event
			var Wait = new Span(this, this.spans.length, [reports[i], reports[i]]);
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
			this.spans.push(new Span(this, this.spans.length, span));
			span = [];
		} else {
			span.push(reports[i]);            
		}
	}
	if (span.length > 0)
		this.spans.push(new Span(this, this.spans.length, span));
	this.spans.sort(function(a, b) { return a.Start() - b.Start(); });
}

Thread.prototype.ID = function() {
	return this.fqid;
}

Thread.prototype.Name = function() {
	for (var i = 0; i < this.spans.length; i++) {
		var spanname = this.spans[i].Name();
		if (spanname)
			return spanname;
	}
	return "Thread-"+this.id;
}

Thread.prototype.Spans = function() {
	return this.spans;
}

Thread.prototype.Events = function() {
	return [].concat.apply([], this.Spans().map(function(span) { return span.Events(); }));
}

Thread.prototype.Start = function() {
	return Math.min.apply(this, this.Spans().map(function(span) { return span.Start(); }));
}

var Process = function(machine, id, reports) {
	this.machine = machine;
	this.id = id;
	this.fqid = this.machine.ID() + "_Process("+id+")";
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
		this.threads[thread_id] = new Thread(this, thread_id, reports_by_thread[thread_id]);
}

Process.prototype.ID = function() {
	return this.fqid;
}

Process.prototype.Threads = function() {
	var threads = this.threads;
	var keys = Object.keys(this.threads);
	var values = keys.map(function(k) { return threads[k]; });
	values.sort(function(a, b) { return a.Start() - b.Start(); });
	return values;
}

Process.prototype.Name = function() {
	var events = this.Events();
	for (var i = 0; i < events.length; i++) {
		var spanprocess = events[i].ProcessName();
		if (spanprocess)
			return spanprocess;
	}
	return this.id;
}

Process.prototype.Spans = function() {
	return [].concat.apply([], this.Threads().map(function(thread) { return thread.Spans(); }));
}

Process.prototype.Events = function() {
	return [].concat.apply([], this.Threads().map(function(thread) { return thread.Events(); }));
}

Process.prototype.Start = function() {
	return Math.min.apply(this, this.Threads().map(function(thread) { return thread.Start(); }));
}

Process.prototype.GCEvents = function() {
	return this.gcevents;
}

var Machine = function(task, id, reports) {
	this.task = task;
	this.id = id;
	this.fqid = this.task.ID() + "_Machine("+this.id+")";

	var reports_by_process = group_reports_by_field(reports, "ProcessID");

	this.processes = {};
	for (var process_id in reports_by_process)
		this.processes[process_id] = new Process(this, process_id, reports_by_process[process_id]);
}

Machine.prototype.ID = function() {
	return this.fqid;
}

Machine.prototype.Processes = function() {
	var processes = this.processes;
	var keys = Object.keys(this.processes);
	var values = keys.map(function(k) { return processes[k]; });
	values.sort(function(a, b) { return a.Start() - b.Start(); });
	return values;
}

Machine.prototype.Threads = function() {
	return [].concat.apply([], this.Processes().map(function(process) { return process.Threads(); }));
}

Machine.prototype.Spans = function() {
	return [].concat.apply([], this.Processes().map(function(process) { return process.Spans(); }));    
}

Machine.prototype.Events = function() {
	return [].concat.apply([], this.Processes().map(function(process) { return process.Events(); }));    
}

Machine.prototype.Start = function() {
	return Math.min.apply(this, this.Processes().map(function(process) { return process.Start(); }));
}

Machine.prototype.GCEvents = function() {
	return [].concat.apply([], this.Processes().map(function(process) { return process.GCEvents(); }));
}

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
	this.fqid = this.process.ID() + "_GC(" + this.id + ")";

	this.start = Number(this.report["GcStart"][0])+1;
	this.duration = Number(this.report["GcDuration"][0])-1;
	this.end = this.start + this.duration;
	this.name = this.report["GcName"][0];
}

GCEvent.prototype.ID = function() {
	return this.fqid;
}
