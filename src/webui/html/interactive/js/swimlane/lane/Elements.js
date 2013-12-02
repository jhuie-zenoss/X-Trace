/* Contains classes for drawing the individual elements of a lane */

// An empty function that renders nothing
var NoRender = function() {
   var render = function(){};
   render.refresh = function(){};
   return render;
}();

// Draws events as dots
function EventDot(swimlane) {
  var radius = function(d) { return d.type=="event" ? 5 : 2; }; // by default, variable sized events. can be set to function or value
  var tooltip = makeEventTooltip($.fn.tipsy.autoBounds(Math.min(window.width(), window.height()) / 3, "s")); // TODO: pass in as arg and have empty function as default

  var event_visible = function(sx) {
    var min = sx.domain()[0], max = sx.domain()[1];
    return function(d) { return d.Timestamp() > min && d.Timestamp() < max; };    
  };
  
  function render(eventdata, laneid) {
    d3.select(this).selectAll("circle").data(eventdata, XEvent.getID).attr("class", function(d) { return d.type; }).classed(laneid, true);
  };
  
  render.refresh = function(eventdata, laneid, laneoffset, laneheight, sx) {
    var events = d3.select(this).selectAll("circle").filter("."+laneid).data(eventdata.filter(event_visible(sx)), XEvent.getID);
    events.enter().append('circle').attr("class", function(d) { return d.type; }).classed(laneid, true)
    .attr('cy', function(d) { return laneoffset + .5 * laneheight; })
    .attr('r', radius)
    .attr('id', function(d) { return d.ID(); })
    .call(tooltip);
    events.attr('cx', function(d) { return sx(d.Timestamp()); });
    events.exit().remove();
  };
  
  render.exit = function(laneid) {
    d3.select(this).selectAll("circle").filter("."+laneid).remove();
  };

  render.radius = function(_) { if (!arguments.length) return radius; radius = _; return render; };
  render.tooltip = function(_) { if (!arguments.length) return tooltip; tooltip = _; return render; };
  
  return render;
}

// Draws spans as rectangles
function SpanRect(swimlane) {
  var span_visible = function(sx) {
    var min = sx.domain()[0], max = sx.domain()[1];
    return function(d) { return d.Start() < max && d.End() > min; };
  };
  
  function render(spandata, laneid) {
    d3.select(this).selectAll("rect").data(spandata, XSpan.getID).attr("class", "").classed("waiting", function(d){return d.waiting;}).classed(laneid, true);     
  };
  
  render.refresh = function(spandata, laneid, laneoffset, laneheight, sx) {
    var spans = d3.select(this).selectAll("rect").filter("."+laneid).data(spandata.filter(span_visible(sx)), XSpan.getID);
    spans.enter().append("rect").classed("waiting", function(d){return d.waiting;}).classed(laneid, true)
    .attr('y', function(d) { return laneoffset + .1 * laneheight + 0.5; })
    .attr('height', function(d) { return .8 * laneheight; });
    spans.attr('x', function(d) { return sx(d.Start()); })
    .attr('width', function(d) { return sx(d.End()) - sx(d.Start()); });
    spans.exit().remove();
  };

  render.exit = function(laneid) {
    d3.select(this).selectAll("rect").filter("."+laneid).remove();
  };

  return render;
};