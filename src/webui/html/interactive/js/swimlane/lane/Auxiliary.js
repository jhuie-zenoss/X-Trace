/* This file contains auxiliary renderers for things like lane labels and lane backgrounds */

// Draws backgrounds for thread lanes
function ThreadBackground(swimlane) {
  var fill = d3.rgb(200+Math.random()*20, 200+Math.random()*20, 200+Math.random()*20);
  
  function background(data, groupid) {
    d3.select(this).selectAll("rect").data(data, function(d) { return d.ID(); }).attr("class", "").classed(groupid, true);       
  };
  
  background.refresh = function(data, groupid, offsety, height, sx) {
    var backgrounds = d3.select(this).selectAll("rect").filter("."+groupid).data(data, function(d) { return d.ID(); });
    backgrounds.enter().append("rect").classed(groupid, true).attr("fill", fill);
    backgrounds.exit().remove();
    backgrounds.attr("x", 0).attr("y", function(d, i) { return offsety + height * i + 0.5; })
               .attr("width", sx.range()[1]).attr("height", height - 0.5);
    backgrounds.on("click", cbs["click"]);
  };

  background.fill = function(_) { if (!arguments.length) return fill; fill = _; return lane; };
  
  cbs = {"click": function(){}};
  background.on = function(evt, cb) { if (cb) cbs[evt] = cb; else return cbs[evt]; return background; };
  
  return background;
};

// Draws labels for thread lanes
function ThreadLabels(swimlane) {
  var fill = d3.rgb(200+Math.random()*20, 200+Math.random()*20, 200+Math.random()*20);
  var tooltip = makeThreadTooltip($.fn.tipsy.autoWE);
  
  function label(threaddata, groupid) {
    d3.select(this).selectAll("text").data(threaddata, XThread.getID).attr("class", "").classed(groupid, true);
  };
  
  label.refresh = function(threaddata, groupid, offsety, height) {
    var labels = d3.select(this).selectAll("text").filter("."+groupid).data(threaddata, XThread.getID);
    labels.enter().append("text").classed(groupid, true);
    labels.exit().remove();
    labels.attr("text-anchor", "end").attr("fill", fill).text(function(d) { return d.ShortName(); }).call(tooltip);
    labels.attr('x', swimlane.margin()-5).attr('y', function(d, i) { return offsety + (i+.5) * height; }).attr("dominant-baseline", "middle");
  };

  label.fill = function(_) { if (!arguments.length) return fill; fill = _; return label; };
  label.tooltip = function(_) { if (!arguments.length) return tooltip; tooltip = _; return label; };
  
  return label;  
};