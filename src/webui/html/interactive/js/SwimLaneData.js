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
    return values;
}

SwimLaneData.prototype.Processes = function() {
    return [].concat.apply([], this.Machines().map(function(machine) { return machine.Processes(); }));   
}

SwimLaneData.prototype.Threads = function() {
    return [].concat.apply([], this.Machines().map(function(machine) { return machine.Threads(); }));   
}

SwimLaneData.prototype.Spans = function() {
    return [].concat.apply([], this.Machines().map(function(machine) { return machine.Spans(); }));   
}

SwimLaneData.prototype.VisibleEvents = function() {
    return this.Events().filter(function(event) { return event.visible; });   
}

SwimLaneData.prototype.Events = function() {
    return [].concat.apply([], this.Spans().map(function(span) { return span.Events(); }));   
}

SwimLaneData.prototype.ExternalEdges = function() {
    return [].concat.apply([], this.Events().map(function(event) { return event.ExternalEdges(); }));
}

SwimLaneData.prototype.InternalEdges = function() {
    return [].concat.apply([], this.Events().map(function(event) { return event.InternalEdges(); }));
}

var Event = function(span, report) {
    this.report = report;
    this.span = span;
    this.id = report["X-Trace"][0].substr(18);
    this.timestamp = parseFloat(this.report["Timestamp"][0]);
    this.visible = !(report["Operation"]);    
    
    this.span.thread.process.machine.swimlane.reports_by_id[this.id] = this;
}

Event.prototype.ExternalEdges = function() {
    if (this.edges==null) {
        this.edges = [];
        var parents = this.report["Edge"];
        for (var i = 0; i < parents.length; i++) {
            var edge = {
                id: this.id+parents[i],
                parent: this.span.thread.process.machine.swimlane.reports_by_id[parents[i]],
                child: this,
            }
            if (edge.parent && edge.child && edge.parent.span.thread.process!=edge.child.span.thread.process)
                this.edges.push(edge);
        }
    }
    return this.edges;
}

Event.prototype.InternalEdges = function() {
    if (this.edges==null) {
        this.edges = [];
        var parents = this.report["Edge"];
        for (var i = 0; i < parents.length; i++) {
            var edge = {
                id: this.id+parents[i],
                parent: this.span.thread.process.machine.swimlane.reports_by_id[parents[i]],
                child: this,
            }
            if (edge.parent && edge.child && edge.parent.span!=edge.child.span && edge.parent.span.thread.process==edge.child.span.thread.process)
                this.edges.push(edge);
        }
    }
    return this.edges;    
}

Event.prototype.Timestamp = function() {
    return this.timestamp;
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
        var isWaitStart = reports[i]["Operation"] && reports[i]["Operation"][0]=="waitstart";
        if (isWaitStart) {
            span.push(reports[i]);
            if (span.length > 0) {
                this.spans.push(new Span(this, this.spans.length, span));
                span = [];
            }
            span.push(reports[i]);
            span.push(reports[i+1]);
            var waitspan = new Span(this, this.spans.length, span);
            waitspan.waiting = true;
            this.spans.push(waitspan);
            span = [];
            continue;
        }
        span.push(reports[i]);
        var isSpanEnd = reports[i]["Operation"] && reports[i]["Operation"][0]=="threadend";
        if (isSpanEnd) {
            this.spans.push(new Span(this, this.spans.length, span));
            span = [];
        }
    }
    if (span.length > 0)
        this.spans.push(new Span(this, this.spans.length, span));
}

Thread.prototype.Spans = function() {
    return this.spans;
}

Thread.prototype.Events = function() {
    return [].concat.apply([], this.Spans().map(function(span) { return span.Events(); }));
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
    return values;
}

Process.prototype.Spans = function() {
    return [].concat.apply([], this.Threads().map(function(thread) { return thread.Spans(); }));
}

Process.prototype.Events = function() {
    return [].concat.apply([], this.Threads().map(function(thread) { return thread.Events(); }));
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





