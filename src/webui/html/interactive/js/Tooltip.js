jQuery.fn.outerHTML = function() {
    return jQuery('<div />').append(this.eq(0).clone()).html();
};

var DirectedAcyclicGraphTooltip = function() {
    
    var tooltip = Tooltip().title(function(d) {
        var report = d.report;

        var reserved = ["Agent", "Label", "Class", "Timestamp", "Host", "ProcessID", "ThreadID", "ThreadName", "X-Trace"];
        
        function appendRow(key, value, tooltip) {
            var keyrow = $("<div>").attr("class", "key").append(key);
            var valrow = $("<div>").attr("class", "value").append(value);
            var clearrow = $("<div>").attr("class", "clear");
            tooltip.append($("<div>").append(keyrow).append(valrow).append(clearrow));
        }
        
        var tooltip = $("<div>").attr("class", "xtrace-tooltip");
        var seen = {"Operation": true, "Edge": true, "version": true};
        
        // Do the reserved first
        for (var i = 0; i < reserved.length; i++) {
            var key = reserved[i];
            if (key in report) {
                appendRow(key, report[key].join(", "), tooltip);
                seen[key] = true;
            }
        }
        
        // Do the remainder
        for (var key in report) {
            if (!seen[key]) {
                appendRow(key, report[key].join(", "), tooltip);
            }
        }
        
        return tooltip.outerHTML();
    });
    
    return tooltip;
}


var Tooltip = function() {
    
    var tooltip = function(selection) {
        selection.each(function(d) {
            $(this).tipsy({
                gravity: $.fn.tipsy.autoWE,
                html: true,
                title: function() { return title(d); },
                opacity: 1
            });
        });
    }
    
    var title = function(d) { return ""; };
    
    tooltip.hide = function() { $(".tipsy").remove(); }
    tooltip.title = function(_) { if (arguments.length==0) return title; title = _; return tooltip; }
    
    
    return tooltip;
}