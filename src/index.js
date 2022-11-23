(function(){
	"use strict";

	var canvas,context;
	var waves = [];
	var colours = ["#fff3","#fff9","#ffff"]
	var fps = 12;

	if(breakpoint.startsWith("mobile") || breakpoint.startsWith("tablet")) {

		var lines = false;
		var lambda = 0.4;
		var nodes = 10;
		var waveHeight = 20;
		var nwaves = 3;

	} else {

		var lines = false;
		var lambda = 0.4;
		var nodes = 20;
		var waveHeight = 15;
		var nwaves = 3;
	}

	function init() {

		canvas = document.getElementById("waves");
		if(!canvas) return;

		context = canvas.getContext("2d");
		resizeCanvas(canvas);

		waves = [];
		for (var i = 0; i < nwaves; i++)
			new Wave(colours[i],lambda,nodes);
	}

	var fpsInterval, startTime, now, then, elapsed;
	function animate(_fps) {

		if(_fps != null) {

			fpsInterval = 1000 / _fps;
			then = Date.now();
			startTime = then;
			return play();
		}
	}

	function play() {

		// request another frame
		requestAnimationFrame(play);

		// calc elapsed time since last loop
		now = Date.now();
		elapsed = now - then;

		// if enough time has elapsed, draw the next frame

		if (elapsed > fpsInterval) {

			then = now - (elapsed % fpsInterval);
			update();
		}
	}
			
	function update() {

		if(!canvas) return;

		context.clearRect(0, 0, canvas.width, canvas.height);
		context.globalCompositeOperation = "source-over";
		context.globalCompositeOperation = "screen";

		for (var i = 0; i < waves.length; i++) {

			for (var j = 0; j < waves[i].nodes.length; j++)
				bounce(waves[i].nodes[j]);

			drawWave(waves[i]);
			if(lines) {
				drawLine(waves[i].nodes);
				drawNodes(waves[i].nodes);
			}
		}

		context.globalCompositeOperation = "hue";
	}

	function Wave(colour,lambda,nodes) {

		this.colour = colour;
		this.lambda = lambda;
		this.nodes = [];

		for (var i = 0; i <= nodes+2; i++) {

			var temp = [(i-1)*canvas.width/nodes,0,Math.random()*200,lambda];
			this.nodes.push(temp);
		}

		waves.push(this);
	}

	function bounce(node) {
		node[1] = waveHeight/2*Math.sin(node[2]/20)+canvas.height/2;
		node[2] = node[2] + node[3];
	}

	function drawWave (obj) {
		var diff = function(a,b) {
			return (b - a)/2 + a;
		}
		context.fillStyle = obj.colour;
		context.beginPath();
		context.moveTo(0,canvas.height);
		context.lineTo(obj.nodes[0][0],obj.nodes[0][1]);
		for (var i = 0; i < obj.nodes.length; i++) {
			if (obj.nodes[i+1]) {
				context.quadraticCurveTo(
					obj.nodes[i][0],obj.nodes[i][1],
					diff(obj.nodes[i][0],obj.nodes[i+1][0]),diff(obj.nodes[i][1],obj.nodes[i+1][1])
				);
			}else{
				context.lineTo(obj.nodes[i][0],obj.nodes[i][1]);
				context.lineTo(canvas.width,canvas.height);
			}
		}
		context.closePath();
		context.fill();
	}

	function drawNodes (array) {
		context.strokeStyle = "#888";
		for (var i = 0; i < array.length; i++) {
			context.beginPath();
			context.arc(array[i][0],array[i][1],4,0,2*Math.PI);
			context.closePath();
			context.stroke();
		}
	}

	function drawLine (array) {
		context.strokeStyle = "#888";
		for (var i = 0; i < array.length; i++) {
			if (array[i+1]) {
				context.lineTo(array[i+1][0],array[i+1][1]);
			}
		}
			context.stroke();
	}

	function resizeCanvas(canvas,width,height) {
		if (width && height) {
			canvas.width = width;
			canvas.height = height;
		} else {
			canvas.width = document.body.clientWidth;
			canvas.height = 120/100 * waveHeight;
		}
	}

	document.addEventListener("DOMContentLoaded", init, true);

	init(); // Avoid windows scrollbar issue..
	animate(fps);

	window.addEventListener("load", function() { init(); });
	window.addEventListener("resize", function() { init(); });
	window.addEventListener("orientationchange", function() { init(); });
})();
