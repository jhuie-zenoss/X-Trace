// lightweight is an optional argument that will try to draw the graph as fast as possible
function XTraceSwimLane(attachPoint, reports, /*optional*/ params) {
    var swimlane = this;
    
    var data = new SwimLaneData(reports);
    window.swimlane = data;
    
    var lanes = data.Threads();
    var items = data.Spans();
    var processes = data.Processes();
    for (var i = 0; i < lanes.length; i++) {
        lanes[i].lanenumber = i;
    }
    for (var i = 0; i < processes.length; i++) {
        processes[i].color = d3.rgb(200 + Math.random() * 20, 200 + Math.random() * 20, 200 + Math.random() * 20);
    }

    var datalen = data.max - data.min;
    var rangemin = data.min - datalen / 10.0;
    var rangemax = data.max + datalen / 10.0;
    
    var DAGTooltip = DirectedAcyclicGraphTooltip($.fn.tipsy.autoNS);
    
//    var data = randomData()
//    , lanes = data.lanes
//    , items = data.items
//    , now = new Date();

    
  var margin = {top: 20, right: 15, bottom: 15, left: 120}
    , width = $(window).width() - margin.left - margin.right
    , height = $(window).height() - margin.top - margin.bottom
    , miniHeight = lanes.length * 12 + 50
    , mainHeight = height - miniHeight - 50;
  
  var x = d3.scale.linear().domain([rangemin, rangemax]).range([0, width]);
  var x1 = d3.scale.linear().range([0, width]);
  var norm = d3.scale.linear().domain([rangemin - data.min, rangemax - data.min]).range([0, width]);

  var ext = d3.extent(lanes, function(thread) { return thread.lanenumber; });
  var y1 = d3.scale.linear().domain([ext[0], ext[1] + 1]).range([0, mainHeight]);
  var y2 = d3.scale.linear().domain([ext[0], ext[1] + 1]).range([0, miniHeight]);

  var chart = d3.select(attachPoint)
      .append('svg:svg')
      .attr('width', width + margin.right + margin.left)
      .attr('height', height + margin.top + margin.bottom)
      .attr('class', 'chart');

  chart.append('defs').append('clipPath')
      .attr('id', 'clip')
      .append('rect')
          .attr('width', width)
          .attr('height', mainHeight);

  var main = chart.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
      .attr('width', width)
      .attr('height', mainHeight)
      .attr('class', 'main');

  var mini = chart.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + (mainHeight + 60) + ')')
      .attr('width', width)
      .attr('height', miniHeight)
      .attr('class', 'mini');

  // draw the lanes for the main chart
  
  main.append('g').attr("class", "lane-background").selectAll('laneBackground')
      .data(lanes)
      .enter().append('rect')
      .attr('fill', function(d) { return d.process.color.brighter(0.3); })
      .attr('x', 0)
      .attr('y', function(d) { return y1(d.lanenumber) })
      .attr('width', width)
      .attr('height', function(d) { return y1(1); });
  
  main.append('g').selectAll('.laneLines')
      .data(lanes)
      .enter().append('line')
      .attr('x1', 0)
      .attr('y1', function(d) { return d3.round(y1(d.lanenumber)) + 0.5; })
      .attr('x2', width)
      .attr('y2', function(d) { return d3.round(y1(d.lanenumber)) + 0.5; })
      .attr('stroke', '#999');

  var mainlabels = main.append('g').selectAll('.laneText')
      .data(lanes)
      .enter();
  
//  mainlabels.append('text')
//      .text(function(d) { return d.process.Name(); })
//      .attr('x', -5)
//      .attr('y', function(d) { return y1(d.lanenumber + .5)-10; })
//      .attr('dy', '0.5ex')
//      .attr('text-anchor', 'end')
//      .attr('class', 'laneText')
//      .attr('fill', function(d) { return d.process.color.darker(1); });

  mainlabels.append('text')
      .text(function(d) { return d.Name(); })
      .attr('x', -5)
      .attr('y', function(d) { return y1(d.lanenumber + .5)+10; })
      .attr('dy', '0.5ex')
      .attr('text-anchor', 'end')
      .attr('class', 'laneText')
      .attr('fill', function(d) { return d.process.color.darker(1); });

          
  // draw the lanes for the mini chart
  mini.append('g').selectAll('.laneLines')
      .data(lanes)
      .enter().append('line')
      .attr('x1', 0)
      .attr('y1', function(d) { return d3.round(y2(d.lanenumber)) + 0.5; })
      .attr('x2', width)
      .attr('y2', function(d) { return d3.round(y2(d.lanenumber)) + 0.5; })
      .attr('stroke', 'lightgray');

  mini.append('g').selectAll('.laneText')
      .data(lanes)
      .enter().append('text')
      .text(function(d) { return d.ID(); })
      .attr('x', -10)
      .attr('y', function(d) { return y2(d.lanenumber + .5); })
      .attr('dy', '0.5ex')
      .attr('text-anchor', 'end')
      .attr('class', 'laneText');

  // draw the x axis
  var xDateAxis = d3.svg.axis()
      .scale(norm)
      .orient('bottom')
      .ticks(10)
      .tickSize(6, 0, 0);

  var x1DateAxis = d3.svg.axis()
      .scale(norm)
      .orient('bottom')
      .ticks(10)
      .tickSize(6, 0, 0);

  var mainaxis = main.append('g')
      .attr('transform', 'translate(0,' + mainHeight + ')')
      .attr('class', 'main axis date');
  mainaxis.call(x1DateAxis);

  mini.append('g')
      .attr('transform', 'translate(0,' + miniHeight + ')')
      .attr('class', 'axis date')
      .call(xDateAxis);

  // draw the items
  var itemRects = main.append('g')
  .attr('clip-path', 'url(#clip)');
  var causalityEdges = main.append('g')
  .attr('clip-path', 'url(#clip)');
  var eventDots = main.append('g')
  .attr('clip-path', 'url(#clip)');
  var lockLines = main.append('g')
  .attr('clip-path', 'url(#clip)');

  mini.append('g').selectAll('miniItems')
      .data(getPaths(items))
      .enter().append('path')
      .attr('class', function(d) { return 'miniItem'; })
      .attr('d', function(d) { return d.path; });

  // invisible hit area to move around the selection window
  mini.append('rect')
      .attr('pointer-events', 'painted')
      .attr('width', width)
      .attr('height', miniHeight)
      .attr('visibility', 'hidden')
      .on('mouseup', moveBrush);

  // draw the selection area
  var brush = d3.svg.brush()
      .x(x)
      .extent([data.min - x.invert(5) + x.invert(0), data.max + x.invert(5) - x.invert(0)]) // nicely sets the default viewport
      .on("brush", display);

  mini.append('g')
      .attr('class', 'x brush')
      .attr('clip-path', 'url(#clip)')
      .call(brush)
      .selectAll('rect')
          .attr('y', 1)
          .attr('height', miniHeight - 1);

  mini.selectAll('rect.background').remove();
  display();

  // Zoom behavior for the main display
  // For zoom's translating
  var moving = false,
      lastx = null;
  main.on("mousedown", function() { moving = true; lastx = null; });
  main.on("mouseup", function() { moving = false; lastx = null; });

  var zoom = d3.behavior.zoom();
  zoom.on("zoom", function() {
      console.log("zoom", d3.event);
      var mousex = x1.invert(d3.mouse(d3.select(this).select(".main").node())[0]);
      var brushExtent = brush.extent();
      
      // do the zoom in or out, clamping if necessary
      var newx0 = mousex +  ((brushExtent[0] - mousex) / d3.event.scale);
      var newx1 = mousex + ((brushExtent[1] - mousex) / d3.event.scale);
      newx0 = Math.max(newx0, rangemin);
      newx1 = Math.min(newx1, rangemax);
      
      // Apply any translate
      if (moving) {
          if (lastx!=null) {
              var deltax = x1.invert(lastx) - x1.invert(d3.event.translate[0]);
              if ((newx0 > rangemin || deltax > 0) && (newx1 < rangemax || deltax < 0)) {
                  newx0 = newx0 + deltax;
                  newx1 = newx1 + deltax;
              }
          }
          lastx = d3.event.translate[0];
      }
      
      // apply the extent and redisplay
      brush.extent([newx0, newx1]);
      display();
      zoom.scale(1);
  });
  zoom.call(main);

  function display () {

      var rects, dots
        , minExtent = brush.extent()[0]
        , maxExtent = brush.extent()[1];
      
      if (maxExtent - minExtent < 0.00001)
          maxExtent = minExtent+0.00001;
      
      var visItems = items.filter(function (d) { return d.Start() < maxExtent && d.End() > minExtent});

      mini.select('.brush').call(brush.extent([minExtent, maxExtent]));       

      x1.domain([minExtent, maxExtent]);
      norm.domain([minExtent - data.min, maxExtent - data.min]);


      //x1Offset.range([0, x1(d3.time.day.ceil(now) - x1(d3.time.day.floor(now)))]);


      // upate the item rects
      rects = itemRects.selectAll('rect.thread')
          .data(visItems, function (d) { return d.ID(); })
          .attr('x', function(d) { return x1(d.Start()); })
          .attr('width', function(d) { return x1(d.End()) - x1(d.Start()); })
      rects.enter().append('rect')
          .attr('x', function(d) { return x1(d.Start()); })
          .attr('y', function(d) { return y1(d.thread.lanenumber) + .1 * y1(1) + 0.5; })
          .attr('width', function(d) { return x1(d.End()) - x1(d.Start()); })
          .attr('height', function(d) { return .8 * y1(1); })
          .attr('class', function(d) { if (d.waiting) return "thread waiting"; else return "thread"; })
          .attr("fill", function(d) { return d.thread.process.color; });
      rects.exit().remove();
      
      // update the event dots
      dots = eventDots.selectAll('circle.event')
          .data(data.Events(), function(d) { return d.ID(); })
          .attr('cx', function(d) { return x1(d.Timestamp()); })
          .attr('r', function(d) { return d.visible ? 5 : 2; });
      dots.enter().append('circle')
          .attr('cx', function(d) { return x1(d.Timestamp()); })
          .attr('cy', function(d) { return y1(d.span.thread.lanenumber) + .5 * y1(1); })
          .attr('r', function(d) { return d.visible ? 5 : 2; })
          .attr('class', function(d) { return d.visible ? "event visible" : "event" })
          .attr('id', function(d) { return d.ID(); })
          .call(DAGTooltip);
      dots.exit().remove();
      
      // update the causality edges
      edges = causalityEdges.selectAll('line.edge')
          .data(data.Edges(), function(d) { return d.id; })
          .attr('x1', function(d) { return x1(d.parent.Timestamp()); })
          .attr('x2', function(d) { return x1(d.child.Timestamp()); });
      edges.enter().append('line')
          .attr('x1', function(d) { return x1(d.parent.Timestamp()); })
          .attr('x2', function(d) { return x1(d.child.Timestamp()); })
          .attr('y1', function(d) { return y1(d.parent.span.thread.lanenumber) + .5 * y1(1); })
          .attr('y2', function(d) { return y1(d.child.span.thread.lanenumber) + .5 * y1(1); })
          .attr('class', function(d) {
              if (d.parent.span.thread.process!=d.child.span.thread.process)
                  return "edge interprocess";
              else if (d.parent.span.thread!=d.child.span.thread)
                  return "edge interthread";
              else
                  return "edge internal";
          });
      mainaxis.call(x1DateAxis);
  }

  function moveBrush () {
      var origin = d3.mouse(this)
        , point = x.invert(origin[0])
        , halfExtent = (brush.extent()[1] - brush.extent()[0]) / 2
        , start = point - halfExtent
        , end = point + halfExtent;

      brush.extent([start,end]);
      display();
  }

  // generates a single path for each item class in the mini display
  // ugly - but draws mini 2x faster than append lines or line generator
  // is there a better way to do a bunch of lines as a single path with d3?
  function getPaths(items) {
      var paths = {}, d, offset = .5 * y2(1) + 0.5, result = [];
      for (var i = 0; i < items.length; i++) {
          d = items[i];
          if (!paths[d.class]) paths[d.class] = '';   
          paths[d.class] += ['M',x(d.Start()),(y2(d.thread.lanenumber) + offset),'H',x(d.End())].join(' ');
      }

      for (var className in paths) {
          result.push({class: className, path: paths[className]});
      }

      return result;
  }
}