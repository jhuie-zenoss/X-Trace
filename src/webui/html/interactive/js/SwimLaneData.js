var SwimLaneData = function(data) {
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
}

SwimLaneData.prototype.Machines = function() {
    var machines = this.machines;
    var keys = Object.keys(this.machines);
    var values = keys.map(function(k) { return machines[k]; });
    values.sort(function(a, b) { return a.Start() - b.Start(); });
    return values;
}

SwimLaneData.prototype.Processes = function() {
    return [].concat.apply([], this.Machines().map(function(machine) { return machine.Processes(); }));   
}

SwimLaneData.prototype.Threads = function() {
    var threads = [].concat.apply([], this.Machines().map(function(machine) { return machine.Threads(); }));
    console.log(threads.map(function(thread) { return thread.Start(); }));
    return threads;
}

SwimLaneData.prototype.Spans = function() {
    return [].concat.apply([], this.Machines().map(function(machine) { return machine.Spans(); }));   
}

SwimLaneData.prototype.Events = function() {
    return [].concat.apply([], this.Spans().map(function(span) { return span.Events(); }));   
}

SwimLaneData.prototype.Edges = function() {
    return [].concat.apply([], this.Events().map(function(event) { return event.Edges(); }));
}

var Event = function(span, report) {
    this.report = report;
    this.span = span;
    this.id = report["X-Trace"][0].substr(18);
    this.timestamp = parseFloat(this.report["Timestamp"][0]);
    this.visible = !(report["Operation"]);    
    
    this.span.thread.process.machine.swimlane.reports_by_id[this.id] = this;
}

Event.prototype.Edges = function() {
    if (this.edges==null) {
        this.edges = [];
        var parents = this.report["Edge"];
        for (var i = 0; i < parents.length; i++) {
            var edge = {
                id: this.id+parents[i],
                parent: this.span.thread.process.machine.swimlane.reports_by_id[parents[i]],
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

var Span = function(thread, id, reports) {
    this.thread = thread;
    this.id = id;
    this.events = [];
    this.waiting = false; // is this a span where a thread is waiting?
    for (var i = 0; i < reports.length; i++)
        this.events.push(new Event(this, reports[i]));
    var startTS = this.events[0].timestamp;
    if (this.events[0].report["HRT"]) {
        var startHRT = Number(this.events[0].report["HRT"][0]);
        for (var i = 1; i < this.events.length; i++) {
            var event = this.events[i];
            var eventHRT = Number(event.report["HRT"][0]);
            event.timestamp = startTS + (eventHRT - startHRT) / 1000000000.0;
        }
    }
    this.events.sort(function(a, b) { return a.timestamp - b.timestamp; });
}

Span.prototype.Name = function() {
    for (var i = 0; i < this.events.length; i++) {
        var eventname = this.events[i].Name();
        if (eventname)
            return eventname;
    }
}

Span.prototype.Events = function() {
    return this.events;
}

Span.prototype.Start = function() {
    return this.events[0].Timestamp();
}

Span.prototype.End = function() {
    return this.events[this.events.length-1].Timestamp();
}

var Thread = function(process, id, reports) {
    this.process = process;
    this.id = id;
    
    this.spans = [];
    var span = [];
    for (var i = 0; i < reports.length; i++) {
        if (reports[i]["Operation"] && reports[i]["Operation"][0]=="waited") {
            /* Special case: a 'wait' report.  A 'wait' report translates into two events; a start and end.
             * A 'wait' report is generated at the end of the wait, and contains a field specifying the duration
             * of the wait.  So we must manually reconstruct the begin event of the wait */
            
            // The duration of the wait event
            var duration = Number(reports[i]["Duration"][0]) / 1000000000.0;
            
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
    
    var reports_by_thread = group_reports_by_field(reports, "ThreadID");
    
    this.threads = {};
    for (var thread_id in reports_by_thread)
        this.threads[thread_id] = new Thread(this, thread_id, reports_by_thread[thread_id]);
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

var Machine = function(swimlane, id, reports) {
    this.swimlane = swimlane;
    this.id = id;
    
    var reports_by_process = group_reports_by_field(reports, "ProcessID");
    
    this.processes = {};
    for (var process_id in reports_by_process)
        this.processes[process_id] = new Process(this, process_id, reports_by_process[process_id]);
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



