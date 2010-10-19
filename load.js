
var g1, g2;

function mouseScroll(e) {
    g2.zoom( Event.wheel(e) );
}

function loadUp() {
    var mapToDate = function( i ) {
	var base = 0 + i;
    };


    var data = new Array( [1,1], [4,2], [5,3], [6,2] );
    g1 = new Graph( [0,7], [0,4], data );
    g1.renderInCanvas('graph1');


    function ligand(Kd) {
	return function(C) { return ( 120000 * (C / (C+Kd))); };
    }
    g2 = new Graph( [0,100], [0,120000], ligand(15) );
    // g2.renderInCanvas('graph2');
    Event.observe( $('graph2'), 'mousewheel', mouseScroll);
    Event.observe( $('graph2'), 'DOMMouseScroll', mouseScroll);
}



document.observe('dom:loaded', function() {
		     loadUp();
		 });
