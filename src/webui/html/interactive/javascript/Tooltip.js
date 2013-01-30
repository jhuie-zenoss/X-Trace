var Tooltip = function() {
    
    var tooltip = function(selection) {
        selection.each(function(d) {
            $(this).tipsy({
                gravity: $.fn.tipsy.autoWE,
                html: true,
                title: function() { return title(d); }
            });
        });
    }
    
    var title = function(d) { return ""; };
    
    tooltip.hide = function() { $(".tipsy").remove(); }
    tooltip.title = function(_) { if (arguments.length==0) return title; title = _; return tooltip; }
    
    
    return tooltip;
}