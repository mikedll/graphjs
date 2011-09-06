
var g1, g2;

function mouseScroll(e) {
    g2.zoom( Event.wheel(e) );
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


function loadUp() {

    var data = [ [1,1], [4,2], [5,3], [6,2] ];
    g1 = new Graph( [0,7], [0,4], data, quagressXLabeler("2010-10-19") );
    g1.renderInCanvas('graph1');

    function ligand(Kd) {
	      return function(C) { return ( 120000 * (C / (C+Kd))); };
    }
    g2 = new Graph( [0,100], [0,120000], ligand(15) );
    g2.renderInCanvas('graph2');
    Event.observe( $('graph2'), 'mousewheel', mouseScroll);
    Event.observe( $('graph2'), 'DOMMouseScroll', mouseScroll);
}



document.observe('dom:loaded', function() {
		     loadUp();
		 });
