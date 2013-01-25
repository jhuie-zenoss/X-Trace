function Minimap() {
    var width   = d3.functor(100),
        height  = d3.functor(100),
        x       = d3.functor(0),
        y       = d3.functor(0);
    
    
    function minimap(selection) {
        selection.each(function(data) {
            // Select the svg element that we draw to or add it if it doesn't exist
            var svg = d3.select(this).selectAll("svg").data([data]);
            var firsttime = svg.enter().append("svg");
            firsttime.append("rect").attr("class", "background").attr("fill", "#DDD")
                        .attr("fill-opacity", 0.5).attr("width", "100%").attr("height", "100%");
            var contents = firsttime.append("svg").attr("class", "minimap");
            contents.append("g").attr("class", "contents")
            contents.append("rect").attr("class", "viewfinder").attr("stroke", "black")
                                   .attr("fill", "black").attr("opacity", 0.1);
            
            // Size the minimap as appropriate
            svg.attr("width", width.call(this, data));
            svg.attr("height", height.call(this, data));
            svg.attr("x", x.call(this, data));
            svg.attr("y", y.call(this, data));
            
            // Draw the contents of the minimap
            draw.call(svg.select('.contents').node(), data);
            
            // Zoom the minimap to the extent of the contents
            var bbox = svg.select('.contents').node().getBBox();
            var x1 = bbox.x, y1 = bbox.y, x2 = bbox.x+bbox.width, y2 = bbox.y+bbox.height;
            svg.select(".minimap").attr("viewBox", x1 + " " + y1 + " " + x2 + " " + y2);
            
            // Set the viewfinder to view everything
            contents.select(".viewfinder").attr("x", x1).attr("y", y1).attr("width", x2-x1).attr("height", y2-y1);
        });
    }
    
    var draw = function(d) {
        // Default - copy verbatim
        var ctx = this;
        d3.selectAll(d3.select(d).select("svg").node().childNodes).each(function(d) {
            ctx.appendChild(this.cloneNode(true));
        });
    }
    
    minimap.draw = function(_) { if (!arguments.length) return draw; draw = _; return minimap; }
    minimap.width = function(_) { if (!arguments.length) return width; width = d3.functor(_); return minimap; }
    minimap.height = function(_) { if (!arguments.length) return height; height = d3.functor(_); return minimap; }
    minimap.x = function(_) { if (!arguments.length) return x; x = d3.functor(_); return minimap; }
    minimap.y = function(_) { if (!arguments.length) return y; y = d3.functor(_); return minimap; }
    
    return minimap;
}