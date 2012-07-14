

var g1, g2;

var beginningDrag = false, isDragging = false, lastX = 0;


function dd(m) {
    console.debug("********************");
    $.each( arguments, function( i, v ) { console.debug( v ); } );
    console.debug("********************");
}

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


/* DO NOT MODIFY. This file was compiled Sat, 14 Jul 2012 10:38:51 GMT from
 * /home/mrmike/work/quagress/app/coffeescripts/labeller.coffee
 */

var Labeller;
Labeller = (function() {
  function Labeller(baseDate) {
    this.baseDate = baseDate;
  }
  Labeller.prototype.iToDate = function(i) {
    var d;
    d = Date.parse(this.baseDate).add(parseInt(i)).days();
    return d.toString("MMM d, yyyy");
  };
  Labeller.prototype.labelRange = function(xRange, markerCount) {
    var L, U, i, init, markers, step;
    init = 0;
    step = 0.0;
    U = Math.ceil(xRange[1]);
    L = Math.floor(xRange[0]);
    step = Math.floor((U - L) / markerCount);
    if (step === 0) {
      step = 1;
    }
    if (step === 1) {
      init = L + 1;
    } else {
      init = L + Math.floor(step / 2);
    }
    markers = (function() {
      var _ref, _results;
      _results = [];
      for (i = init, _ref = U + 1; init <= _ref ? i <= _ref : i >= _ref; i += step) {
        _results.push([i, this.iToDate(i)]);
      }
      return _results;
    }).call(this);
    return markers;
  };
  return Labeller;
})();

function handleMouseOver(e) {
    console.debug("enter");
};

function handleMouseOut(e) {
    g1.onMouseOut();
    $('#g1text').text("-");
};

function handleMouseDown(e) {
    dd('mouse is down');
    beginningDrag = true;
    isDragging = true;
};

function handleMouseUp(e) {
    isDragging = false;
    beginningDrag = false;
};


function globalHandleMouseDown(e) {
    dd('global mouse is down');
    if(beginningDrag) {
        beginningDrag = false;
        lastX = e.offsetX;
        dd("starting drag at ", lastX);
    }
};

function globalHandleMouseUp(e) {
    dd("global mouseup");
    isDragging = false;
    beginningDrag = false;
};

function globalHandleMouseMove(e) {
    if(isDragging) {
        var move = (lastX - e.offsetX);
        lastX = e.offsetX;
        g1.moveXBounds(move);
    }
}

function handleMouseMove(e) {
    if(!isDragging) {
        var vals = g1.getInterpolatedValuesOnMouseMoveAt( e.offsetX, e.offsetY );
        if(vals == null) return;

        var x = vals[0], y = vals[1];

        x = x.toFixed(2);
        y = y.toFixed(2);

        $('#g1text').text("X = " + x + ", Y = " + y);
    }
};

function loadUp() {

    var data = [ [-5,2], [1,1], [4,2], [5,3], [6,2], [8,3] ];
    g1 = new Graph( [0,7], [0,4], data, new Labeller("2010-10-19") );
    g1.renderInCanvas('graph1');

    function ligand(Kd) {
	      return function(C) { return ( 120000 * (C / (C+Kd))); };
    }
    g2 = new Graph( [0,100], [0,120000], ligand(15) );
    g2.renderInCanvas('graph2');

    $('#graph1')
        .bind('mousedown', handleMouseDown )
        .bind('mouseup', handleMouseUp )
        .bind('mousemove', handleMouseMove )
        .bind('mouseover', handleMouseOver )
        .bind('mouseout', handleMouseOut );

    $(document)
        .bind('mousemove', globalHandleMouseMove )
        .bind('mouseup', globalHandleMouseUp )
        .bind('mousedown', globalHandleMouseDown );

    $('#graph2')
        .bind('mousewheel', mouseScroll )
        .bind('DOMMouseScroll', mouseScroll );

}


$(function() {
		     loadUp();
		 });
