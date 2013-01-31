var DirectedAcyclicGraphContextMenu = function() {
    
    var onMenuClick = function(d) {
        console.log("menu click!", d);
    }
    
    var ctxmenu = ContextMenu().on("click", onMenuClick);
    
    var menu = function(selection) {
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
                        "value": d.report[fieldname][0]
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
    var onhide = function() {}
    
    menu.on = function(event, _) {
        if (event!="hide") return menu;
        if (event=="hide" && arguments.length==1) return onhide;
        onhide = _;
        return menu;
    }
    

//    
//    var hideSelection = {
//        "id": 0, "name": "Hide Selected Nodes",
//    }
//    
//    var items = [hideSelection];
//    d3.selectAll(".node.selected").each(function(d) {
//        console.log("attaching menu to ", this);
//        DAGContextMenu.call(this, items);
//    });
//    
//    DAGContextMenu.on("click", function(d) {
////        console.log("clicked", this, d);
//      var item = history.addSelection(graphSVG.selectAll(".node.selected").data(), "User Selection");
//      graphSVG.classed("hovering", false);
//      listSVG.datum(history).call(DAGHistory);
//      
//      // Find the point to animate the hidden nodes to
//      var bbox = DAGHistory.bbox().call(DAGHistory.select.call(listSVG.node(), item), item);
//      var transform = zoom.getTransform(bbox);
//      DAG.removenode(function(d) {
//          d3.select(this).classed("visible", false).transition().duration(800).attr("transform", transform).remove();
//      });
//      
//      draw();
//    });
    
    
    return menu;
}

var ContextMenu = function() {
    
    var idseed = 0;
    
    var menu = function(ds) {
        var attach = this;
        
        // Create the menu items
        var menu = {};
        for (var i = 0; i < ds.length; i++) {
            var d = ds[i];
            var n = name.call(this, d);
            var click = function() {
                onclick.call(attach, d, i);
            }
            menu[n] = { "click": click }
        }
        
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