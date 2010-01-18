/*
Script: ART.js

License:
	MIT-style license.
*/

// kappa!

Math.kappa = (4 * (Math.sqrt(2) - 1) / 3);

var ART = function(){
	return new Error('No suitable adapter found.');
};

// Generic base Class.

(function(){

var Base = ART.Base = new Class({
	
	style: {
		'fill': false,
		'stroke': false,
		'fill-color': 'rgb(0, 0, 0)',
		'stroke-color': 'rgb(0, 0, 0)',
		'stroke-width': 1,
		'stroke-cap': 'round',
		'stroke-join': 'round',
		'shadow-color': null,
		'shadow-blur': 0,
		'shadow-offset-x': 0,
		'shadow-offset-y': 0
	},
	
	initialize: function(){
		this.stack = {global: []};
		this.global = {x: 0, y: 0};
		this.shift({x: 0, y: 0});
	},
	
	start: function(vector){
		vector = vector || {x: 0, y: 0};

		this.started = true;
		
		this.boundsMax = {x: null, y: null};
		this.boundsMin = {x: null, y: null};

		this.joinVector = {x: 0, y: 0};
		this.drawn = false;
		
		this.stack.local = [];
		this.local = {x: 0, y: 0};

		return this.shift(vector);
	},

	shift: function(vector){
		var p = (this.started) ? 'local' : 'global';
		this[p] = {x: this[p].x + vector.x, y: this[p].y + vector.y};
		if (this.started) this.moveTo({x: 0, y: 0});
		return this;
	},
	
	save: function(){
		var p = (this.started) ? 'local' : 'global';
		this.stack[p].push(this[p]);
		return this;
	},
	
	restore: function(){
		var p = (this.started) ? 'local' : 'global';
		var vector = this.stack[p].pop();
		if (!vector) return this;
		this[p] = vector;
		if (this.started) this.moveTo({x: 0, y: 0});
		return this;
	},
	
	/* join */
	
	join: function(){
		this.now = this.joinVector;
		this.drawn = false;
		this.joinVector = {x: 0, y: 0};
		return this;
	},
	
	/* to methods */
	
	moveTo: function(vector){
		this.now = vector;
		return this.getUpdatedVector(this.now);
	},
	
	lineTo: function(vector){
		this.updateJoinVector();
		this.now = vector;
		return this.getUpdatedVector(this.now);
	},

	bezierTo: function(c1, c2, end){
		this.updateJoinVector();
		c1 = this.getUpdatedVector(c1);
		c2 = this.getUpdatedVector(c2);
		this.now = end;
		var now = this.getUpdatedVector(this.now);
		return [c1, c2, now];
	},
	
	/* by methods */
	
	moveBy: function(vector){
		return this.moveTo({x: this.now.x + vector.x, y: this.now.y + vector.y});
	},
	
	lineBy: function(vector){
		return this.lineTo({x: this.now.x + vector.x, y: this.now.y + vector.y});
	},
	
	bezierBy: function(c1, c2, end){
		var n = this.now;
		return this.bezierTo({x: c1.x + n.x, y: c1.y + n.y}, {x: c2.x + n.x, y: c2.y + n.y}, {x: end.x + n.x, y: end.y + n.y});
	},
	
	/* path */
	
	path: function(path, s){
		var regexp = /([mrvxe])([^a-z]*)/g, match;
		while ((match = regexp.exec(path))){
			var c = match[2].split(',');
			switch (match[1]){
				case 'v': this.bezierBy({x: s * ~~c[0], y: s * ~~c[1]}, {x: s * ~~c[2], y: s * ~~c[3]}, {x: s * ~~c[4], y: s * ~~c[5]}); break;
				case 'r': this.lineBy({x: s * ~~c[0], y: s * ~~c[1]}); break;
				case 'm': this.moveTo({x: s * ~~c[0], y: s * ~~c[1]}); break;
				case 'x': this.join(); break;
				case 'e': return;
			}
		}
	},
	
	/* roundCaps */
	
	roundCapLeftTo: function(vector){
		return this.roundCapLeftBy({x: vector.x - this.now.x, y: vector.y - this.now.y});
	},
	
	roundCapRightTo: function(vector){
		return this.roundCapRightBy({x: vector.x - this.now.x, y: vector.y - this.now.y});
	},

	roundCapLeftBy: function(end){
		var kappa = {x: end.x * Math.kappa, y: end.y * Math.kappa};
		this.bezierBy({x: 0, y: kappa.y}, {x: end.x - kappa.x, y: end.y}, end);
		return this;
	},
	
	roundCapRightBy: function(end){
		var kappa = {x: end.x * Math.kappa, y: end.y * Math.kappa};
		this.bezierBy({x: kappa.x, y: 0}, {x: end.x, y: end.y - kappa.y}, end);
		return this;
	},
	
	/* to element */
	
	toElement: function(){
		return this.element;
	},
	
	/* privates */
	
	getUpdatedVector: function(vector){
		var sum = {x: this.global.x + this.local.x + vector.x, y: this.global.y + this.local.y + vector.y};
		
		if (this.boundsMax.x == null || this.boundsMax.x < sum.x) this.boundsMax.x = sum.x;
		if (this.boundsMax.y == null || this.boundsMax.y < sum.y) this.boundsMax.y = sum.y;
		if (this.boundsMin.x == null || this.boundsMin.x > sum.x) this.boundsMin.x = sum.x;
		if (this.boundsMin.y == null || this.boundsMin.y > sum.y) this.boundsMin.y = sum.y;
		
		return {x: sum.x, y: sum.y};
	},
	
	updateJoinVector: function(){
		if (!this.drawn){
			this.drawn = true;
			this.joinVector = this.now;
		}
	},
	
	sanitizeStyle: function(style){
		var styleCC = {}, p;
		for (p in style) styleCC[p.camelCase()] = style[p];
		var thisStyleCC = {};
		for (p in this.style) thisStyleCC[p.camelCase()] = this.style[p];
		return $merge(thisStyleCC, styleCC);
	}
	
});

var adapter;

var registerAdapter = ART.registerAdapter = function(klass){
	if (adapter) return null;
	adapter = true;
	ART = klass;
	ART.Base = Base;
	ART.registerAdapter = registerAdapter;
	return ART;
};

})();