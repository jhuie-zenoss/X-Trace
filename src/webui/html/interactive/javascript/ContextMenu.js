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
            onhide.call(this, items, name);
        }
    }
    
    var ctxmenu = ContextMenu().on("click", onMenuClick);
    
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
    
    menu.on = function(event, _) {
        if (event!="hide") return menu;
        if (event=="hide" && arguments.length==1) return onhide;
        onhide = _;
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
                "click": menuCallback(attach, item, i)
            };
        }
        console.log(menu);
        
        // Set the options
        var options = {
            "disable_native_context_menu": true,
            "showMenu": function() { onopen.call(attach, ds); },
            "hideMenu": function() { onclose.call(attach, ds); }
        }
        
        // Attach the context menu to this element
        console.log("attaching context menu", menu, options);
        $(attach).contextMenu('context-menu'+(idseed++), menu, options);
    }
    
    // Stupid javascript
    var menuCallback = function(attach,d, i) {
        return function() {
            onclick.call(attach, d, i);
        }
    }
    
    var name = function(d) { return d.name; }
    var onclick = function(d, i) {}
    var onopen = function(ds) {}
    var onclose = function(ds) {}
    
    menu.name = function(_) { if (arguments.length==0) return name; name = _; return menu; }
    menu.on = function(event, _) {
        if (event!="click" && event!="open" && event!="close") return menu;
        if (event=="click" && arguments.length==1) return onclick;
        if (event=="open" && arguments.length==1) return onopen;
        if (event=="close" && arguments.length==1) return onclose;
        if (event=="click") onclick = _;
        if (event=="open") onopen = _;
        if (event=="close") onclose = _;
        return menu;
    }
    
    
    return menu;
}