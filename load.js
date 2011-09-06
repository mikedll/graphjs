
var g1, g2;

function mouseScroll(e) {

    var delta = 0;
    if (e.wheelDelta) {
        delta = e.wheelDelta/120; 
        if (window.opera) delta = -delta;
    } else if (e.detail) {
        delta = -event.detail/3;
    }

    delta = Math.round(delta); //Safari Round

    g2.zoom( delta );
}

/**
 * Assumes xRange spans 3 points.* 
 */
function quagressXLabeler( baseDate ) {

    var iToDate = function( i ) {
	      var d = Date.parse( baseDate ).add(parseInt( i )).days();
	      return d.toString("MMM d");
    };

    var f = function( xRange, markerCount ) {
	      var markers = [];
	      var U = Math.ceil( xRange[1] );
	      var L = Math.floor( xRange[0] );
	      var step = Math.floor( (U - L) / markerCount );

	      if( step == 0 ) step = 1;

	      var init;
	      if( step == 1 )
	          init = 1;
	      else
	          init = Math.floor(step / 2);

	      for( var i = init; i < U; i += step ) {
	          markers.push( [ i, iToDate( i ) ] );
	      }

	      return markers;
    };

    return f;
};

function handleMouseOver(e) {
    console.debug("enter");
};

function handleMouseOut(e) {
    console.debug("leave");
};

function handleMouseMove(e) {
    var vals = g1.getInterpolatedValuesOnMouseMoveAt( e.offsetX, e.offsetY );
    if(vals == null) return;

    var x = vals[0], y = vals[1];

    x = x.toFixed(2);
    y = y.toFixed(2);

    $('#g1text').text("X = " + x + ", Y = " + y);
};

function loadUp() {

    var data = [ [-5,2], [1,1], [4,2], [5,3], [6,2], [8,3] ];
    g1 = new Graph( [0,7], [0,4], data, quagressXLabeler("2010-10-19") );
    g1.renderInCanvas('graph1');

    function ligand(Kd) {
	      return function(C) { return ( 120000 * (C / (C+Kd))); };
    }
    g2 = new Graph( [0,100], [0,120000], ligand(15) );
    g2.renderInCanvas('graph2');

    $('#graph1')
        .bind('mousemove', handleMouseMove )
        .bind('mouseover', handleMouseOver )
        .bind('mouseout', handleMouseOut );
        

    $('#graph2')
        .bind('mousewheel', mouseScroll )
        .bind('DOMMouseScroll', mouseScroll );

}


$(function() {
		     loadUp();
		 });
