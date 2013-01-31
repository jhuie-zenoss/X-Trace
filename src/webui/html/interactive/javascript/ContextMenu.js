var DirectedAcyclicGraphContextMenu = function(graph, graphSVG) {
    
    var onMenuClick = function(d) {
        var items = [];
        var name = "";
        if (d.operation=="hideselected") {
            items = graphSVG.selectAll(".node.selected").data();
            name = "User Selection";
        }
        if (d.operation=="hidefield") {
            var fieldname = d.fieldname;
            var value = d.value;
            items = graph.getNodes().filter(function(node) {
                return !node.never_visible && node.report && 
                node.report[fieldname] && node.report[fieldname][0]==value;
            });
            name = fieldname+": "+value;
        }
        if (items.length!=0) {
            handlers.hidenodes.call(this, items, name);
        }
    }
    
    var onOptionMouseOver = function(d) {
        var items = [];
        if (d.operation=="hidefield") {
            var fieldname = d.fieldname;
            var value = d.value;
            items = graph.getNodes().filter(function(node) {
                return !node.never_visible && node.report && 
                node.report[fieldname] && node.report[fieldname][0]==value;
            });            
        }
        handlers.hovernodes.call(this, items);
    }
    
    var onOptionMouseOut = function(d) {
        handlers.hovernodes.call(this, []);
    }
    
    var ctxmenu = ContextMenu().on("click", onMenuClick)
                               .on("mouseover", onOptionMouseOver)
                               .on("mouseout", onOptionMouseOut);
    
    var menu = function(selection) {
        menu.hide();
        selection.each(function(d) {
            
            var items = [];
            
            items.push({
                "operation": "hideselected",
                "name": "Hide all highlighed nodes",
            });
            
            var addHideField = function(fieldname) {
                if (d.report && d.report[fieldname] && d.report[fieldname][0]) {
                    items.push({
                        "operation": "hidefield",
                        "name": "Hide all <span class='highlight'>"+d.report[fieldname][0]+"</span> nodes",
                        "fieldname": fieldname,
                        "value": d.report[fieldname][0],
                    });
                }
            }
            
            addHideField("Agent");
            addHideField("Host");
            addHideField("Class");
            
            ctxmenu.call(this, items);         
            
            d3.select(this).classed("hascontextmenu", true);
        });
    }
    
    menu.hide = function(selection) {
        d3.selectAll(".hascontextmenu").each(function(d) {
            $(this).unbind("contextmenu");
        })            
        $(".context-menu").remove();
    }
    var onhide = function(nodes, selectionname) {}
    
    var handlers = {
        "hidenodes": function() {},
        "hovernodes": function() {}
    }
    
    menu.on = function(event, _) {
        if (!handlers[event]) return menu;
        if (arguments.length==1) return handlers[event];
        handlers[event] = _;
        return menu;
    }
    
    return menu;
}

var ContextMenu = function() {
    
    var idseed = 0;
    
    var menu = function(ds) {
        var attach = this;
        
        // Create the menu items
        var menu = {};
        for (var i = 0; i < ds.length; i++) {
            var item = ds[i];
            var itemname = name.call(this, item);
            menu[itemname] = { 
                "click": menuClick(attach, item, i),
                "mouseover": menuMouseOver(attach, item, i),
                "mouseout": menuMouseOut(attach, item, i)
            };
        }
        
        // Set the options
        var options = {
            "disable_native_context_menu": true,
            "showMenu": function() { handlers.open.call(attach, ds); },
            "hideMenu": function() { handlers.close.call(attach, ds); }
        }
        
        // Attach the context menu to this element
        $(attach).contextMenu('context-menu'+(idseed++), menu, options);
    }
    
    // Stupid javascript
    var menuClick = function(attach,d, i) {
        return function() {
            handlers.click.call(attach, d, i);
        }
    }
    
    // Stupid stupid javascript
    var menuMouseOver = function(attach, d, i) {
        return function() {
            handlers.mouseover.call(attach, d, i);
        }
    }
    
    // Stupid stupid stupid javascript
    var menuMouseOut = function(attach, d, i) {
        return function() {
            handlers.mouseout.call(attach, d, i);
        }
    }
    
    var name = function(d) { return d.name; }
    
    var handlers = {
        "click": function() {},
        "open": function() {},
        "close": function() {},
        "mouseover": function() {},
        "mouseout": function() {},
    }
    
    
    menu.name = function(_) { if (arguments.length==0) return name; name = _; return menu; }
    menu.on = function(event, _) {
        if (!handlers[event]) return menu;
        if (arguments.length==1) return handlers[event];
        handlers[event] = _;
        return menu;
    }
    
    
    return menu;
}