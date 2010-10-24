
var GRAPH_DEBUG = false;

function dd( s ) {
    if( GRAPH_DEBUG )
	console.debug( s );
}

function Graph( xBounds, yBounds, funcOrData, labeler ) {
    var options = {
	padX: true
    };
    this.ctx = null;
    this.height = this.width = 0;
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
	dd("Expected Array of Function as 3rd parameter to graph constructor.");

    this.xBounds = xBounds;
    if( options.padX && (this.xBounds[1] - this.xBounds[0] < 3)) {
	this.xBounds[0] = Math.floor( this.xBounds[0] ) - 1;
	this.xBounds[1] = Math.ceil( this.xBounds[1] ) + 1;
    }
    this.yBounds = yBounds;

    // TODO: handle when graph is too small
    this.xLabelHeight = 20;
    this.yLabelWidth = 60;
    this.yLabelPadding = 10;

    this.upperPadding = this.rightPadding = 20;

    this.Nmarkers = 6;
    this.markerSize = 10;

    this.zoomFactorPercent = 2;

    this.labeler = labeler;
};

Graph.prototype.isFunctional = function() {
    if( this.func != null ) return true;
    else if ( this.data != null ) return false;
    else dd("Graph is in invalid state: neither functional nor with data.");
    return null;
};

Graph.prototype.configureCanvasFont = function() {
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
};

Graph.prototype.configureCanvasLines = function() {    
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
};

Graph.prototype.getCSSInt = function(node, name) {
    return parseInt( node.ownerDocument.defaultView.getComputedStyle( node, null ).getPropertyValue( name ) );
};

Graph.prototype.setCSS = function(node, name, val) {
    node.style[name] = val;
};

Graph.prototype.canvasInvertsY = function(y) {
    return this.upperPadding + ((this.height - this.upperPadding) - y);
};

Graph.prototype.insetH = function(h) {
    return this.canvasInvertsY(this.xLabelHeight + h);
};

Graph.prototype.insetW = function(w) {
    return (this.yLabelWidth + w);
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

Graph.prototype.redraw = function() {
    this.ctx.clearRect( 0, 0, this.width, this.height);
    this.renderInCanvas();
};

Graph.prototype.zoom = function(delta) {
    var factor = ((delta > 0) ? this.zoomFactorPercent : -this.zoomFactorPercent);
    this.xBounds[0] += ((this.xRange() * .2) / factor);
    this.xBounds[1] -= ((this.xRange() * .2) / factor);
    this.yBounds[0] += ((this.yRange() * .2) / factor);
    this.yBounds[1] -= ((this.yRange() * .2) / factor);
    this.redraw();
};

Graph.prototype.changeFunction = function(f) {
    this.func = f;
    this.redraw();
};

Graph.prototype.initCanvas = function(id) {
    this.canvasId = id;
    this.ctx = document.getElementById(this.canvasId).getContext('2d');    
};

Graph.prototype.renderInCanvas = function(id) {
    if( this.ctx == null ) { this.initCanvas(id); }
    this.configureCanvasFont();
    this.configureCanvasLines();
    this.width = this.getCSSInt(this.ctx.canvas, 'width');
    this.height = this.getCSSInt(this.ctx.canvas, 'height');

    this.drawGraphLine();

    this.drawMarkers();

    this.drawAxisLines();
};

Graph.prototype.drawGraphLine = function() {
    var dhdy = this.hRange() / this.yRange();
    var dxdw = this.xRange() / this.wRange();

    this.ctx.beginPath();
    for( var w = 0; w < this.wRange(); w++ ) {
	var x = this.xBounds[0] + dxdw * w;

	var y = this.isFunctional() ? this.func(x) : this.interpolate( x );

	if( y == null ) {
	    dd("Y undefined x == " + x);
	    continue;
	}

	var h = dhdy * y;

	if( h >= this.hRange() || h < 0) {
	    dd("h (" + h + ") from y (" + y + ") is out of h range.");
	    continue;
	}

	if( w == 0) this.ctx.moveTo( this.insetW(w),this.insetH(h) );
	else this.ctx.lineTo( this.insetW(w), this.insetH(h) );
    }

    this.ctx.stroke();
    this.ctx.closePath();
};

Graph.prototype.interpolate = function(x) {
    var dataWLeft = null, dataWRight = null;

    if( this.data.length == 0 || x < this.data[0][0] ) {
	dd("X (" + x + ")is less than the smallest data point available, " + this.data[0][0]);
	return null;	
    }

    for( var j = 0; j < this.data.length; j++ ) {
	if( dataWLeft == null || (this.data[j][0] > this.data[dataWLeft][0] && this.data[j][0] <= x) )
	    dataWLeft = j;
    }

    if( dataWLeft < this.data.length - 1 )
	dataWRight = dataWLeft + 1;
    else
	dd("Cannot extrapolate beyond highest X data point.");

    if( dataWLeft == null || dataWRight == null ) return null;

    var dydx = (this.data[dataWRight][1] - this.data[dataWLeft][1]) / (this.data[dataWRight][0] - this.data[dataWLeft][0]);

    var dx = (x - this.data[dataWLeft][0]);

    dd("interpolateing from (" + this.data[dataWLeft][0] + ", " + this.data[dataWLeft][1] + ") "
		  + " to (" + this.data[dataWRight][0] + ", " + this.data[dataWRight][1] + ") "
		  + " with dydx (" + dydx + ") and dx (" + dx + ")");
    return this.data[dataWLeft][1] + dydx * dx;
};

Graph.prototype.drawAxisLines = function() {
    this.drawLine( this.insetWH(0,0), this.insetWH(0,this.hRange()-1) );
    this.drawLine( this.insetWH(0,0), this.insetWH(this.wRange()-1,0) );
};

Graph.prototype.markerString = function( range, markerCount, markerIndex  ) {
    var x = (range / markerCount) * markerIndex;
    return String( Math.round( x * 100 ) / 100 );
};

Graph.prototype.drawMarkers = function() {
    (this.labeler == null) ? this.drawXMarkers() : this.drawXMarkersWithLabeler();
    this.drawYMarkers();
};

Graph.prototype.drawWMarker = function( w, xString ) {
    this.drawLine( this.insetWH(w,0), this.insetWH(w,this.markerSize) );
    this.ctx.fillText( xString, this.insetW(w), this.canvasInvertsY(this.xLabelHeight / 2));	
};

Graph.prototype.drawXMarkersWithLabeler = function() {
    var xMarkers = this.labeler( this.xBounds, this.Nmarkers );
    var dxdw = this.xRange() / this.wRange();

    for( var i = 0; i < xMarkers.length; i++ ) {
	var markerW = xMarkers[i][0] / dxdw;
	var xString = xMarkers[i][1];
	this.drawWMarker( markerW, xString );
    }
};

Graph.prototype.drawXMarkers = function() {
    var markerSize = this.wRange() / this.Nmarkers;
    for( var i = 0; i <= this.Nmarkers; i++ ) {
	var markerW = markerSize * i;
	var xString = this.markerString( this.xRange(), this.Nmarkers, i );
	this.drawWMarker( markerW, xString );
    }
};

Graph.prototype.drawYMarkers = function() {
    var markerSize = this.hRange() / this.Nmarkers;
    for( var i = 0; i <= this.Nmarkers; i++) {
     	var markerH =  markerSize * i;
	var yString = this.markerString( this.yRange(), this.Nmarkers, i );
	this.drawLine( this.insetWH(0,markerH), this.insetWH(this.markerSize,markerH) );

	this.ctx.textAlign = 'right';
	this.ctx.fillText( yString, this.yLabelWidth  - this.yLabelPadding, this.insetH(markerH) );
	this.ctx.textAlign = 'center';
    }
};

Graph.prototype.drawLine = function(from,to) {
    this.ctx.beginPath();
    this.ctx.moveTo(from[0],from[1]);
    this.ctx.lineTo(to[0], to[1]);
    this.ctx.stroke();
    this.ctx.closePath();
};
