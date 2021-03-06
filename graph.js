
var GRAPH_DEBUG_LEVEL = 1;

function gdd( s, level ) {
    if( typeof(level) === "undefined" ) {
        level = 0;
    }

    if( GRAPH_DEBUG_LEVEL <= level )
	      console.debug( s );
}

function Graph( xBounds, yBounds, funcOrData, logs, labeller ) {

    this.options = {
	      padX: true,
        domainConceptuallyIntegers: true,
        minimumYRange: 3.0,
        maxXRange: 36525,
        minXRange: 6
    };
    this.ctxLayer1 = null;
    this.ctxLayer2 = null;
    this.height = this.width = 0;
    this.labeller = labeller;

    // TODO: handle when graph is too small
    this.xLabelHeight = 40;
    this.yLabelWidth = 70;
    this.yLabelPadding = 10;
    this.dataPointcircleRadius = 3;
    this.lineWidth = 2;
    this.comfortableEdgeSpace = 0.15;

    this.upperPadding = this.rightPadding = 20;

    this.Nmarkers = 6;
    this.markerSize = 10;

    this.zoomFactorPercent = 40;

    // Null, or a [xBegin, xEnd] array where xBegin and xEnd are in xBounds
    this.highlightRange = null;
  
    this.verticalSpotterAt = null;
    this.reloadData( xBounds, yBounds, funcOrData, logs, null, false, null);
};

Graph.prototype.currentLog = function() {
    return this.logs[ this.currentLogI ];
};

Graph.prototype.isFunctional = function() {
    if( this.func != null ) return true;
    else if ( this.data != null ) return false;
    else gdd("Graph is in invalid state: neither functional nor with data.");
    return null;
};

Graph.prototype.configureCanvas1Font = function() {
    this.ctxLayer1.font = '14px Arial';
    this.ctxLayer1.textAlign = 'center';
    this.ctxLayer1.textBaseline = 'middle';
    this.ctxLayer1.fillStyle = '#fff';

};

Graph.prototype.configureCanvas1Lines = function() {    
    this.ctxLayer1.strokeStyle = '#fff';
    this.ctxLayer1.lineWidth = this.lineWidth;
};

Graph.prototype.configureCanvas2 = function() {    
    this.ctxLayer2.font = '14px Arial';
    this.ctxLayer2.textAlign = 'center';
    this.ctxLayer2.textBaseline = 'middle';
    this.ctxLayer2.fillStyle = '#fff';
    this.ctxLayer2.strokeStyle = '#fff';
    this.ctxLayer2.lineWidth = this.lineWidth;
};

Graph.prototype.getCSSInt = function(node, name) {
    return parseInt( node.ownerDocument.defaultView.getComputedStyle( node, null ).getPropertyValue( name ) );
};

Graph.prototype.setCSS = function(node, name, val) {
    node.style[name] = val;
};

Graph.prototype.canvasInvertsY = function(y) {
    return this.height - y;
};

Graph.prototype.insetH = function(h) {
    return this.canvasInvertsY(this.xLabelHeight + h);
};

Graph.prototype.insetW = function(w) {
    return (this.yLabelWidth + w);
};

Graph.prototype.wToX = function(w) {
    return this.xBounds[0] + ((w - this.yLabelWidth) * this.dxdw());
};

Graph.prototype.xToW = function(x) {
    return (x - this.xBounds[0]) / this.dxdw();
};

Graph.prototype.yOffsetToInsetH = function( screenYOffset ) {
    if( screenYOffset < this.upperPadding ) return null;

    var rightSideUp = this.height - screenYOffset;
    if( rightSideUp < this.xLabelHeight) return null;

    return rightSideUp - this.xLabelHeight;
};

Graph.prototype.offsetToInsetW = function( screenXOffset ) {
    if(screenXOffset < this.yLabelWidth) return null;
    if(screenXOffset > this.width - this.rightPadding) return null;
    return screenXOffset - this.yLabelWidth;
};

Graph.prototype.insetWH = function(w,h) {
    return [this.insetW(w), this.insetH(h)];
};

Graph.prototype.wRange = function() {
    return this.width - (this.yLabelWidth + this.rightPadding);
};

Graph.prototype.hRange = function() {
    return this.height - (this.xLabelHeight + this.upperPadding);
};

Graph.prototype.xRange = function() {
    return this.xBounds[1] - this.xBounds[0];
};

Graph.prototype.yRange = function() {
    return this.yBounds[1] - this.yBounds[0];
};

Graph.prototype.dhdy = function() {
    return this.hRange() / this.yRange();
};

Graph.prototype.dxdw = function() {
    return this.xRange() / this.wRange();
};

Graph.prototype.maxX = function() {
    if (this.isFunctional()) return null;
    return this.data[ this.data.length - 1 ][0];    
};

Graph.prototype.minX = function() {
    if (this.isFunctional()) return null;
    return this.data[0][0];
};

Graph.prototype.drawLineOn = function(ctx, from, to) {
  ctx.beginPath();

  ctx.moveTo(from[0],from[1]);
  ctx.lineTo(to[0], to[1]);
  ctx.stroke();
  ctx.closePath();
};

Graph.prototype.drawLine = function(from, to) {
  this.drawLineOn(this.ctxLayer1, from, to);
};

Graph.prototype.drawLineUI = function(from, to) {
  this.drawLineOn(this.ctxLayer2, from, to);
};

/*
 * Repositions the graph so that x is visible,
 * and returns related coordinates to x.
 * 
 * Updates mouse UI to reflect an interest
 * in x.
 * 
 * Returns [w, y, label if available or null]
 * 
 * Assume the domain is an integer domain.
 */
Graph.prototype.prepareForActionAtX = function(x) {
  var lboundXComfort = this.xRange() * this.comfortableEdgeSpace + this.xBounds[0];
  var uboundXComfort = this.xBounds[1] - this.xRange() * this.comfortableEdgeSpace;
  
  if(x < lboundXComfort || x > uboundXComfort) {
    this.moveXBounds((x - (x < lboundXComfort ? lboundXComfort : uboundXComfort)));
  }

  var y = this.solve(x);
  var w = this.xToW(x);

  if(this.highlightRange === null) {
    this.verticalSpotterAt = w;
    this.redrawUI();
  }

  var l = (this.labeller == null ? null : this.labeller.iToDateObj(x));

  return [w, y, l];
};

Graph.prototype.minYGlobalMaxYInXBoundsOrGlobal = function() {
    if (this.isFunctional() ) return null;

    var inXBounds = false;
    var maxY = null, minY = null, globalMaxY = null;
    for(var i = 0; i < this.data.length; i++ ) {
        if(!inXBounds && this.data[i][0] >= this.xBounds[0]) {
            inXBounds = true;
        }

        if( minY === null || minY > this.data[i][1] ) minY = this.data[i][1];
        if( globalMaxY === null || globalMaxY < this.data[i][1] ) globalMaxY = this.data[i][1];

        if(inXBounds) {
            if( maxY === null || maxY < this.data[i][1] ) maxY = this.data[i][1];
        }

        if(inXBounds && this.data[i][0] > this.xBounds[1])
            break;
    }

    if(maxY === null) maxY = globalMaxY;

    return [minY, maxY];
};

Graph.prototype.redrawGraph = function() {
    this.ctxLayer1.clearRect( 0, 0, this.width, this.height);
    this.renderGraph();
};

/*
 * Redraws both the layer 1 main display and the UI.
 */
Graph.prototype.redraw = function() {
    this.redrawGraph();
    this.redrawUI();
};

/*
 * Redraws the UI while leaving layer 1 alone.
 */
Graph.prototype.redrawUI = function() {
    this.ctxLayer2.clearRect( 0, 0, this.width, this.height);  
    this.renderUI();
};

Graph.prototype.zoom = function(delta) {
    var factor = ((delta > 0) ? this.zoomFactorPercent : -this.zoomFactorPercent);
    this.xBounds[0] += this.xRange() * (factor / 100.0);
    this.xBounds[1] -= this.xRange() * (factor / 100.0);
    this.yBounds[0] += this.yRange() * (factor / 100.0);
    this.yBounds[1] -= this.yRange() * (factor / 100.0);
    this.verticalSpotterAt = null;
    this.redraw();
};

Graph.prototype.autoFixYAxis = function() {
    var minMaxY = this.minYGlobalMaxYInXBoundsOrGlobal();
    var newVisibleDataRange = (minMaxY[1] - minMaxY[0]);
    if (newVisibleDataRange === 0) newVisibleDataRange = this.options.minimumYRange;
    this.yBounds[0] = (minMaxY[0] >= 0) ? 0 : (minMaxY[0] - (newVisibleDataRange * 0.1));
    this.yBounds[1] = minMaxY[1] + (newVisibleDataRange * 0.1);
};

Graph.prototype.zoomAndAutofitYAxis = function(delta) {
    var factor = ((delta > 0) ? this.zoomFactorPercent : -this.zoomFactorPercent);

    var newXmin = this.xBounds[0] + (this.xRange() * (factor / 100.0)), newXmax = this.xBounds[1] - (this.xRange() * (factor / 100.0));

    var newRange = (newXmax - newXmin);

    if( newRange <= this.options.maxXRange && newRange >= this.options.minXRange ) {
        this.xBounds[0] = newXmin;
        this.xBounds[1] = newXmax;
    }

    if( !this.isFunctional() ) {
        if( this.xBounds[0] > this.maxX() ) {
            this.xBounds[0] = this.maxX();
        }

        if( this.xBounds[1] < this.minX() ) {
            this.xBounds[1] = this.minX();
        }
    }

    if(this.labeller != null) this.labeller.changeStep( this.xBounds, this.Nmarkers );
    this.autoFixYAxis();
    this.verticalSpotterAt = null;
    this.redraw();    
};

Graph.prototype.killHighlight = function() {
    if(this.highlightRange == null) return false;

    this.highlightRange = null;
    return true;
};

Graph.prototype.startHighlight = function(canvasOffsetX) {
    this.highlightRange = null;
    return this.moveHighlight(canvasOffsetX);
};

Graph.prototype.stopHighlight = function(canvasOffsetX) {
    if(this.highlightRange[0] == this.highlightRange[1]) this.highlightRange = null;
};

Graph.prototype.clickedHighlight = function(canvasOffsetX) {
    if(this.highlightRange == null) return false;
    var x = this.wToX(canvasOffsetX);
    return(this.highlightRange[0] <= x && x <= this.highlightRange[1]);
};

Graph.prototype.strafeHighlight = function(mouseOffset) {
    if(this.highlightRange == null) {
        throw "Called strafehighlight when highlight is no active.";
    }

    var dx = mouseOffset * this.dxdw();
    
    this.highlightRange[0] += dx;
    this.highlightRange[1] += dx;
    this.redrawUI();
};

Graph.prototype.moveHighlight = function(canvasOffsetX) {
    var x = this.wToX(canvasOffsetX);

    if( this.options.domainConceptuallyIntegers ) x = Math.round( x );

    if(x < this.xBounds[0]) x = this.xBounds[0];
    if(x > this.xBounds[1]) x = this.xBounds[1];

    if(this.highlightRange == null) {
        this.highlightRange = [x, x];
    }
    else {
        if(this.highlightRange.length != 2) throw "Internal app error: Expected highlightRange to have at least 2 values.";
        this.highlightRange[1] = x;
    }

    this.redrawUI();
};

Graph.prototype.getStatsOfHighlight = function() {
    var bounds = this.getHighlightXBounds();
    if(bounds == null) return 0;

    
    var sum = 0, count = 0, avg = null;
        
    if( this.data instanceof Array && this.options.domainConceptuallyIntegers ) {
        var j = 0;
        for(var x = Math.ceil(bounds[0]); x <= Math.floor(bounds[1]) && j < this.data.length; x++) {
            while(j < this.data.length) {
                if(this.data[j][0] >= x) {
                    break;
                }
                j++;
            }

            if(j < this.data.length && this.data[j][0] == x) {
                sum += this.data[j][1];
                count += 1;
            }
            
        }
    }
    else {
        // use some calculus? oh well.
    }

    if(count > 0) {
        avg = sum / count;
    }
    sum = Math.round(sum * 100) / 100;
    avg = Math.round(avg * 100) / 100;

    return [(this.labeller != null ? this.labeller.iToDate(bounds[0]) : bounds[0]), 
            (this.labeller != null ? this.labeller.iToDate(bounds[1]) : bounds[1]),
            sum, 
            avg];
};

/*
 * We cut off the bounds inside the window here.
 */
Graph.prototype.getHighlightWBounds = function() {
    var xBounds = this.getHighlightXBounds();
    if(xBounds[0] < this.xBounds[0]) xBounds[0] = this.xBounds[0];
    if(xBounds[1] < this.xBounds[0]) xBounds[1] = this.xBounds[0];

    if(xBounds[0] > this.xBounds[1]) xBounds[0] = this.xBounds[1];
    if(xBounds[1] > this.xBounds[1]) xBounds[1] = this.xBounds[1];
    return [this.xToW( xBounds[0] ), this.xToW( xBounds[1] )];
};

Graph.prototype.getHighlightXBounds = function() {
    if(this.highlightRange == null) {
        return null;   
    }

    var xMin, xMax;
    if(this.highlightRange[0] <= this.highlightRange[1]) {
        xMin = this.highlightRange[0];
        xMax = this.highlightRange[1];
    }
    else {
        xMin = this.highlightRange[1];
        xMax = this.highlightRange[0];
    }
    return [xMin, xMax];
};

Graph.prototype.moveXBoundsByW = function(wOffset) {
    var dx = this.xRange() * (wOffset / this.wRange());
    this.moveXBounds(dx);
};

Graph.prototype.moveXBounds = function(dx) {
    this.verticalSpotterAt = null;
    this.xBounds[0] += dx;
    this.xBounds[1] += dx;

    this.autoFixYAxis();
    this.redraw();
};

Graph.prototype.onMouseOut = function() {
    this.verticalSpotterAt = null;
    this.redrawUI();
};

/*
 * Returns [x, y, label for x if labeller is defined else null]
 */
Graph.prototype.getInterpolatedValuesOnMouseMoveAt = function( screenX, screenY ) {
    var w = this.offsetToInsetW( screenX );
    var h = this.yOffsetToInsetH( screenY );
    var wFinal = w, hFinal;

    if(w === null || h === null) {
      if(this.highlightRange === null && this.verticalSpotterAt !== null) {
        this.verticalSpotterAt = null;
        this.redrawUI();
      }
      return null;
    }

    gdd( "Picked up w = " + w + ", h = " + h, 0 );

    var x = this.dxdw() * w + this.xBounds[0];
    if( this.options.domainConceptuallyIntegers ) {
        x = Math.round( x );
        w = this.xToW(x);
    }

    var y = this.solve( x );
    // if(y  === null) return null;

    if(this.highlightRange === null && this.verticalSpotterAt !== w) {
      this.verticalSpotterAt = w;
      this.redrawUI();
    }

    // Not sure if this one really helps.
    // hFinal = this.dhdy() * (y - this.yBounds[0]);
    // this.drawVeryThinLineUI( this.insetWH(0,hFinal), this.insetWH(this.wRange()-1,hFinal) );

    return [x, y, (this.labeller == null ? null : this.labeller.iToDateObj(x)) ];
};

Graph.prototype.middleX = function() {
  var x = (this.xBounds[1] - this.xBounds[0]) / 2.0 + this.xBounds[0];
  if( this.options.domainConceptuallyIntegers ) {
    x = Math.round( x );
  }
  return x;
};

Graph.prototype.changeFunction = function(f) {
    this.func = f;
    this.verticalSpotterAt = null;
    this.redraw();
};

Graph.prototype.reloadData = function( xBounds, yBounds, funcOrData, logs, labellerStartDate, retainXAxis, defaultDate ) {
  this.func = null;
  this.data = null;

  if( funcOrData instanceof Array ) {
	  this.data = funcOrData;	
	  if( this.data.length == 0 ) {
	    this.data = [1,0];
	  }
  }
  else if ( funcOrData instanceof Function )
	this.func = funcOrData;
  else
	  gdd("Expected Array or Function as 3rd parameter to graph constructor.");

  this.logs = logs;
  this.currentLogI = 0;

  if( typeof(this.xBounds) === "undefined" || !retainXAxis ) {
    this.verticalSpotterAt = null;
    if( defaultDate !== null ) {
      this.xBounds = [defaultDate - 3.5, defaultDate + 3.5];
    }
    else {
      this.xBounds = xBounds;
      if( this.options.padX && (this.xBounds[1] - this.xBounds[0] < 3)) {
	      this.xBounds[0] = Math.floor( this.xBounds[0] ) - 1;
	      this.xBounds[1] = Math.ceil( this.xBounds[1] ) + 1;
      }
    }
  }

  if(this.labeller != null && labellerStartDate != null) this.labeller.updateBaseDate( labellerStartDate );
  if(this.labeller != null) this.labeller.changeStep( this.xBounds, this.Nmarkers );

  this.yBounds = yBounds;
};

Graph.prototype.reload = function( xBounds, yBounds, funcOrData, logs, labellerStartDate, retainXAxis, defaultDate ) {
    this.reloadData( xBounds, yBounds, funcOrData, logs, labellerStartDate, retainXAxis, defaultDate );
    this.redraw();    
};

Graph.prototype.dropContextPointers = function() { 
  this.ctxLayer1 = null;
  this.ctxLayer2 = null;
  return;
};

Graph.prototype.dump = function() {
    dd("dumping: ", 
       this.hRange(), 
       this.yRange(), 
       "dhdy: " + this.dhdy(), 
       "wrange: " + this.wRange(), 
       "xrange: " + this.xRange(), 
       "dxdw: " + this.dxdw(), 
       this.width, 
       this.height);
};

Graph.prototype.renderToDom = function(id1, id2) {
  if( this.ctxLayer1 === null ) { 
    this.ctxLayer1 = document.getElementById(id1).getContext('2d');
  }
  if( this.ctxLayer2 === null ) { 
    this.ctxLayer2 = document.getElementById(id2).getContext('2d');
  }
  this.renderGraph();
  this.renderUI();
};

Graph.prototype.renderGraph = function() {
    this.configureCanvas1Font();
    this.configureCanvas1Lines();
    this.width = this.getCSSInt(this.ctxLayer1.canvas, 'width');
    this.height = this.getCSSInt(this.ctxLayer1.canvas, 'height');

    this.drawGraphLine();

    if ( ! this.isFunctional() ) {
        this.drawDataPoints();
    }

    this.drawMarkers();

    this.drawAxisLines();
    this.renderUI();
};

Graph.prototype.renderUI = function() {
    this.configureCanvas2();
    if(this.highlightRange !== null)
      this.drawHighlight();
    else if(this.verticalSpotterAt !== null) {
      this.drawVeryThinLineUI( this.insetWH(this.verticalSpotterAt,0), this.insetWH(this.verticalSpotterAt,this.hRange()-1) );
    }
};

Graph.prototype.drawGraphLine = function() {
    var dhdy = this.dhdy();
    var dxdw = this.dxdw();

    var didDrawSomething = false;

    this.ctxLayer1.beginPath();
    for( var w = 0; w < this.wRange(); w++ ) {
	      var x = this.xBounds[0] + dxdw * w;

        if( w <= 3 ) {
            gdd( "Seeking point for x = " + x, 0);
        }

	      var y = this.isFunctional() ? this.func(x) : this.solve( x );

	      if( y == null ) {
	          gdd("Y undefined x == " + x, 0);
	          continue;
	      }
        else {
            didDrawSomething = true;
        }

	      var h = dhdy * (y - this.yBounds[0]);

	      if( h >= this.hRange() || h < 0) {
	          gdd("h (" + h + ") from y (" + y + ") is out of h range.", 0);
	          continue;
	      }

	      if( w == 0) this.ctxLayer1.moveTo( this.insetW(w),this.insetH(h) );
	      else this.ctxLayer1.lineTo( this.insetW(w), this.insetH(h) );
    }
    this.ctxLayer1.stroke();
    this.ctxLayer1.closePath();

    if( !didDrawSomething && this.data.length != 0 ) {
        var refW = null, y, h, refX = null, left = null;

        if( this.xBounds[0] > this.maxX() ) {
            refX = this.maxX();
            left = true;
            refW = 10;
        }
        else if ( this.xBounds[1] < this.minX() ) {
            refX = this.minX();
            refW = this.wRange() - 11;
            left = false;
        }

        if(refW != null && refX != null) {
	          y = this.isFunctional() ? this.func( refX ) : this.solve( refX );
            h = dhdy * (y - this.yBounds[0]);
            this.drawArrowAt( refW, h, left );            
        }

    }
};

Graph.prototype.drawDataPoints = function() {
    var dwdx = 1.0 / this.dxdw();
    var dhdy = this.dhdy();

    for( var i = 0; i < this.data.length; i++ ) {
        if ( this.data[i][0] >= this.xBounds[0]  && this.data[i][0] <= this.xBounds[1] ) {            
            this.drawDataPointAt( dwdx * (this.data[i][0] - this.xBounds[0]), dhdy * (this.data[i][1] - this.yBounds[0]) );
        }
    }
    
};

Graph.prototype.drawArrowAt = function( w, h, faceLeft ) {
    var direction = ( faceLeft == true ? 1 : -1 );
    this.ctxLayer1.lineWidth = 3;
    
    this.drawLine( this.insetWH(w, h), this.insetWH(w + (direction * 14), h) );
    this.drawLine( this.insetWH(w, h - 1), this.insetWH(w + (direction * 5), h + 5) );
    this.drawLine( this.insetWH(w, h + 1), this.insetWH(w + (direction * 5), h - 5) );

    this.ctxLayer1.lineWidth = this.lineWidth;
};

Graph.prototype.drawDataPointAt = function( w, h ) {
  this.ctxLayer1.beginPath();
  this.ctxLayer1.moveTo( this.insetW(w),this.insetH(h) );
  this.ctxLayer1.arc( this.insetW(w), this.insetH(h), this.dataPointcircleRadius, 0, 2 * Math.PI );
  this.ctxLayer1.fill();
  this.ctxLayer1.closePath();
};

/*
 * This will interpolate if there is no match for this x in the domain,
 * or it'll return 0 if the graph is accumulative and there is no match for this x in the domain.
 * The interpolation needs work, though.
 */
Graph.prototype.solve = function(x) {

    var dataWLeft = null, dataWRight = null;

    if( this.data.length == 0 || x < this.data[0][0] ) {
	      gdd("X (" + x + ")is less than the smallest data point available, " + this.data[0][0]);
	      return null;	
    }

    for( var j = 0; j < this.data.length; j++ ) {
	      if( dataWLeft == null || (this.data[j][0] > this.data[dataWLeft][0] && this.data[j][0] <= x) )
	          dataWLeft = j;
    }

    // Lucky us. Exact hit. No interpolation required.
    if( this.data[dataWLeft][0] === x ) {
        return this.data[dataWLeft][1];
    }

    if( dataWLeft < this.data.length - 1 )
	      dataWRight = dataWLeft + 1;
    else
	      gdd("Cannot extrapolate beyond highest X data point.");

    if( dataWLeft == null || dataWRight == null ) return null;

    var dydx = (this.data[dataWRight][1] - this.data[dataWLeft][1]) / (this.data[dataWRight][0] - this.data[dataWLeft][0]);

    var dx = (x - this.data[dataWLeft][0]);

    gdd("interpolating from (" + this.data[dataWLeft][0] + ", " + this.data[dataWLeft][1] + ") "
		   + " to (" + this.data[dataWRight][0] + ", " + this.data[dataWRight][1] + ") "
		   + " with dydx (" + dydx + ") and dx (" + dx + ")");
    return this.data[dataWLeft][1] + dydx * dx;
};

Graph.prototype.drawAxisLines = function() {
    this.drawLine( this.insetWH(0,0), this.insetWH(0,this.hRange()-1) );
    this.drawLine( this.insetWH(0,0), this.insetWH(this.wRange()-1,0) );
};

Graph.prototype.markerString = function( offset, range, markerCount, markerIndex  ) {
    var v = offset + (range / markerCount) * markerIndex;
    return String( Math.round( v * 100 ) / 100 );
};

Graph.prototype.drawMarkers = function() {
    (this.labeller == null) ? this.drawXMarkers() : this.drawXMarkersWithLabeller();
    this.drawYMarkers();
};

Graph.prototype.drawWMarker = function( w, xString ) {
    this.drawLine( this.insetWH(w,0), this.insetWH(w,this.markerSize) );
    this.ctxLayer1.fillText( xString, this.insetW(w), this.canvasInvertsY(this.xLabelHeight / 2));	
};

Graph.prototype.drawXMarkersWithLabeller = function() {
    var xMarkers = this.labeller.labelRange( this.xBounds, this.Nmarkers );
    var dxdw = this.dxdw();

    for( var i = 0; i < xMarkers.length; i++ ) {
	      var markerW = (xMarkers[i][0] - this.xBounds[0]) / dxdw;
	      var xString = xMarkers[i][1];
	      this.drawWMarker( markerW, xString );
    }
};

Graph.prototype.drawXMarkers = function() {
    var markerSize = this.wRange() / this.Nmarkers;
    for( var i = 0; i <= this.Nmarkers; i++ ) {
	      var markerW = markerSize * i;
	      var xString = this.markerString( this.xBounds[0], this.xRange(), this.Nmarkers, i );
	      this.drawWMarker( markerW, xString );
    }
};

Graph.prototype.drawYMarkers = function() {
    var markerSize = this.hRange() / this.Nmarkers;
    for( var i = 0; i <= this.Nmarkers; i++) {
     	  var markerH =  markerSize * i;
	      var yString = this.markerString( this.yBounds[0], this.yRange(), this.Nmarkers, i );
	      this.drawLine( this.insetWH(0,markerH), this.insetWH(this.markerSize,markerH) );

	      this.ctxLayer1.textAlign = 'right';
	      this.ctxLayer1.fillText( yString, this.yLabelWidth  - this.yLabelPadding, this.insetH(markerH) );
	      this.ctxLayer1.textAlign = 'center';
    }
};

Graph.prototype.drawVeryThinLineUI = function(from, to) {
    this.ctxLayer2.lineWidth = 1;
    this.drawLineUI(from, to);
    this.ctxLayer2.lineWidth = this.lineWidth;
};

Graph.prototype.drawHighlight = function() {
    var wBounds = this.getHighlightWBounds();
    var wMin = wBounds[0], wMax = wBounds[1];

    this.ctxLayer2.fillStyle = "rgba(245, 255, 139, 0.5)";
    this.ctxLayer2.fillRect(this.insetW(wMin), this.insetH(0), wMax - wMin, this.insetH(this.hRange()) - this.insetH(0));
};
