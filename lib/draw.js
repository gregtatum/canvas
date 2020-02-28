var TAU = Math.PI * 2

function _drawLines(ctx, config, plot, lines) {
	ctx.strokeStyle = config.lineColor
	ctx.lineCap = 'round'

	for (const line of lines) {
		ctx.lineWidth = config.lineWidth
		ctx.beginPath()
		ctx.moveTo(
			plot.x(line[0], line[1]),
			plot.y(line[0], line[1])
		)
		ctx.lineTo(
			plot.x(line[2], line[3]),
			plot.y(line[2], line[3])
		)
		ctx.stroke()
		ctx.closePath()
	}
}

function _prepCanvasAndGetCtx(canvas) {

	function resize() {
		canvas.width = window.innerWidth * devicePixelRatio
		canvas.height = window.innerHeight * devicePixelRatio
	}
	resize();
	window.addEventListener('resize', resize, false)

	return canvas.getContext('2d')
}

function _setupPlotting(config, current, canvas) {
	// [-1,1] range to approximately [0,canvas.size]
	function resize() {
		current.ratio = canvas.width / canvas.height

		if( current.ratio < 1 ) {
			current.width = canvas.width
			current.height = canvas.height * current.ratio
		} else {
			current.ratio = 1 / current.ratio
			current.width = canvas.width * current.ratio
			current.height = canvas.height
		}

		current.offsetX = (canvas.width - current.width) / 2
		current.offsetY = (canvas.height - current.height) / 2

		current.size = (
			Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height)
			/ config.baseScreenDiagonal
		)
	}
	resize();
	window.addEventListener('resize', resize, false)

	const halfShrink = (1 - config.shrink) * 0.5;

	return {
		x : function (x, y) {
			return current.offsetX + (halfShrink + config.shrink * x) * current.width
		},
		y : function (x, y) {
			return current.offsetY + (halfShrink + config.shrink * y) * current.height
		},
		line : function(n) {
			return n * current.size
		}
	}
}

module.exports = function setupDraw(graph) {
	const config = {
		shrink: 0.75,
		baseScreenDiagonal : 1000,
		lineWidth : 2,
		lineColor : "#ddd",
	}

	const current = {
		ratio : 1,
		width : 0,
		height : 0,
	}

	const canvas = document.createElement('canvas')
	document.body.appendChild(canvas)
	const ctx = _prepCanvasAndGetCtx(canvas)
	const plot = _setupPlotting(config, current, canvas)

	function draw(redrawAll) {
		_drawLines(ctx, config, plot, graph.lines)
	}

	window.addEventListener('resize', () => draw(true), false)
	return draw
}
