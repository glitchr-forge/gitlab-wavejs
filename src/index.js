import breakpoint from '@glitchr/breakpoints';

(function(){
	"use strict";

	let canvas,context;
	let waves = [];
	const colours = ["#fff3","#fff9","#ffff"]
	// The rate the wave motion was originally tuned at. It is no longer a
	// frame-rate cap - the loop runs at the display's rate - only the scale
	// that keeps the animation's SPEED identical to what it always was.
	const AUTHORED_FRAME_MS = 1000 / 12;

	const isMobile = breakpoint.startsWith("mobile") || breakpoint.startsWith("tablet");
	const lines = false;
	const lambda = 0.4;
	const nodes = isMobile ? 10 : 20;
	const waveHeight = isMobile ? 20 : 15;
	const nwaves = 3;

	// ── Scheduling state ──────────────────────────────────────────────────
	// rafId doubles as "is the loop running": null means parked, and nothing
	// is scheduled, so a parked loop costs exactly zero per frame.
	let rafId = null;
	let initQueued = false;
	let onScreen = true;
	let observer = null;

	function init() {

		initQueued = false;

		const next = document.getElementById("waves");

		// The canvas can legitimately disappear: this is loaded once per tab,
		// but the host site swaps pages under it, and not every page has a
		// footer wave. Park the loop rather than spinning on a dead context.
		if(!next) { canvas = null; context = null; return stop(); }

		canvas = next;
		context = canvas.getContext("2d");
		resizeCanvas(canvas);

		waves = [];
		for (let i = 0; i < nwaves; i++)
			new Wave(colours[i],lambda,nodes);

		observe();
		start();
	}

	// Coalesces the several events that all mean "re-init" into one init on the
	// next frame, so a burst cannot run the Wave rebuild several times over.
	//
	// Note this deferral alone does NOT make the layout read below free:
	// requestAnimationFrame callbacks run BEFORE the frame's style and layout
	// pass, so a layout-forcing read inside one still forces a synchronous
	// layout. That is what measuredWidth() is for.
	function queueInit() {

		if(initQueued) return;
		initQueued = true;
		requestAnimationFrame(init);
	}

	// Decorative and off-screen for most of a long page's scroll. Nothing is
	// gained by compositing a canvas nobody can see, so only run while it
	// actually intersects the viewport.
	function observe() {

		if(typeof IntersectionObserver === "undefined") return;
		if(observer) observer.disconnect();

		observer = new IntersectionObserver(function(entries) {

			onScreen = entries[entries.length-1].isIntersecting;
			if(onScreen) start();
			else stop();

		}, {rootMargin: "100px"});

		observer.observe(canvas);
	}

	let now, then;

	function start() {

		if(rafId !== null) return;              // already running
		if(!canvas || !onScreen) return;
		if(document.visibilityState === "hidden") return;

		then = Date.now();
		rafId = requestAnimationFrame(play);
	}

	function stop() {

		if(rafId === null) return;
		cancelAnimationFrame(rafId);
		rafId = null;
	}

	function play() {

		// request another frame
		rafId = requestAnimationFrame(play);

		now = Date.now();
		let dt = now - then;
		then = now;

		// A long task, or a tab that was parked and resumed, must not
		// teleport the wave forward by however long we were away. Clamp to
		// ~3 frames' worth: the motion is decorative and continuous, so a
		// stall is better hidden than replayed.
		if (dt > 50) dt = 50;

		// Phase advances with TIME, not with frames. `bounce` used to do
		// `node[2] += node[3]` once per rendered frame, which bolted the
		// wave's speed to the frame rate - the only reason this ran at 12fps
		// was that the motion had been tuned at 12fps, and raising it simply
		// made the waves move five times faster. It was never a cost
		// decision: the whole frame is 60 nodes, one Math.sin each, drawn on
		// a strip a couple of dozen pixels tall.
		//
		// Dividing by the interval it was authored at keeps the speed
		// identical to before while letting the loop run at whatever rate
		// the display offers.
		update(dt / AUTHORED_FRAME_MS);
	}

	function update(step) {

		if(!canvas) return;

		context.clearRect(0, 0, canvas.width, canvas.height);

		// "screen" is what makes the three stacked waves lighten where they
		// overlap. The previous "source-over" immediately before it was dead
		// (overwritten on the next line), as was the trailing "hue" at the end
		// of this function - it was set after the last draw call and reset
		// before the next one, so it tinted nothing, while leaving the context
		// parked in a non-separable blend mode between every frame.
		context.globalCompositeOperation = "screen";

		const mid = canvas.height / 2;

		for (let i = 0; i < waves.length; i++) {

			for (let j = 0; j < waves[i].nodes.length; j++)
				bounce(waves[i].nodes[j], mid, step);

			drawWave(waves[i]);
			if(lines) {
				drawLine(waves[i].nodes);
				drawNodes(waves[i].nodes);
			}
		}
	}

	function Wave(colour,lambda,nodes) {

		this.colour = colour;
		this.lambda = lambda;
		this.nodes = [];

		for (let i = 0; i <= nodes+2; i++) {

			const temp = [(i-1)*canvas.width/nodes,0,Math.random()*200,lambda];
			this.nodes.push(temp);
		}

		waves.push(this);
	}

	function bounce(node, mid, step) {
		node[1] = waveHeight/2*Math.sin(node[2]/20)+mid;
		node[2] = node[2] + node[3] * step;
	}

	function drawWave (obj) {
		const diff = function(a,b) {
			return (b - a)/2 + a;
		}
		context.fillStyle = obj.colour;
		context.beginPath();
		context.moveTo(0,canvas.height);
		context.lineTo(obj.nodes[0][0],obj.nodes[0][1]);
		for (let i = 0; i < obj.nodes.length; i++) {
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
		for (let i = 0; i < array.length; i++) {
			context.beginPath();
			context.arc(array[i][0],array[i][1],4,0,2*Math.PI);
			context.closePath();
			context.stroke();
		}
	}

	function drawLine (array) {
		context.strokeStyle = "#888";
		for (let i = 0; i < array.length; i++) {
			if (array[i+1]) {
				context.lineTo(array[i+1][0],array[i+1][1]);
			}
		}
		context.stroke();
	}

	// document.body.clientWidth forces a synchronous layout, and during a page
	// swap that is a layout of the entire freshly-inserted document - which is
	// what made this one read the most expensive JS in the swap window (~24ms
	// on prod). A swap cannot change the viewport width, so measure once and
	// reuse it; only the events that genuinely resize the viewport drop the
	// cached value. WRITING canvas.width is free - only reading forces layout.
	//
	// body.clientWidth rather than window.innerWidth is deliberate and
	// load-bearing: it excludes the scrollbar (the "windows scrollbar issue"
	// the init() call below refers to).
	let viewportWidth = null;
	function measuredWidth() {

		if(viewportWidth === null) viewportWidth = document.body.clientWidth;
		return viewportWidth;
	}

	function resizeCanvas(canvas,width,height) {
		if (width && height) {
			canvas.width = width;
			canvas.height = height;
		} else {
			canvas.width = measuredWidth();
			canvas.height = 120/100 * waveHeight;
		}
	}

	document.addEventListener("DOMContentLoaded", queueInit, true);

	init(); // Avoid windows scrollbar issue..

	window.addEventListener("load", queueInit);

	// resize and orientationchange both fire in bursts - a window drag emits
	// them continuously - and each one used to run a full init(): a forced
	// layout plus three Wave objects rebuilt from scratch. queueInit collapses
	// a whole burst into one init on the next frame.
	function invalidateWidth() { viewportWidth = null; queueInit(); }
	window.addEventListener("resize", invalidateWidth);
	window.addEventListener("orientationchange", invalidateWidth);

	// A backgrounded tab throttles rAF but the loop still exists; parking it
	// outright also guarantees `then` is re-based on return, so the first frame
	// back does not see a huge elapsed value.
	document.addEventListener("visibilitychange", function() {
		if(document.visibilityState === "hidden") stop();
		else start();
	});
})();
