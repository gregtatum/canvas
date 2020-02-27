const Rbush        = require('rbush')
const Simplex      = require('simplex-noise')
const lerp         = require('lerp')
const Random       = require('@tatumcreative/random')
const Intersection = require('../lib/intersection')
const setupDraw         = require('../lib/draw')
const Shortcuts    = require('../lib/shortcuts')
const TAU          = Math.PI * 2

function _updateLines(props, state) {

}

function initLines (props, state) {

}

function _createStageBoundary(props, state) {
	const centerX = 0.5
	const centerY = 0.5

	const size = props.margin * 0.5

	const x1 = centerX - size
	const x2 = centerX + size
	const y1 = centerY - size
	const y2 = centerY + size

	state.stageBoundary = [
		lerp( centerX, x1, 0.5 ),
		lerp( centerY, y1, 0.5 ),
		lerp( centerX, x2, 0.5 ),
		lerp( centerY, y2, 0.5 ),
	]
}

function _initLines ({ rowCount, colCount }, state) {
	const xWidth = 1 / (colCount);
	const yWidth = 1 / (rowCount);

	let prevRowY = null;
  for (let i = 0; i < rowCount; i++) {
		let prevY = i * yWidth;
		let prevX = 0;
	  const currRowY = []
		for (let j = 1; j < colCount; j++) {
			if (i === 3) {

			}
			const minY = prevRowY ? prevRowY[j] : -Infinity;
			const currX = j * (xWidth);
			const currY = Math.max(
				prevY + (Math.random() - 0.5) * 0.05,
				minY + 0.005
			)
			state.lines.push([prevX, prevY, currX, currY])

			prevX = currX
			prevY = currY
			currRowY[j] = currY;
		}
		prevRowY = currRowY;
  }
}

function init() {
	const seed = window.location.hash.substr(1) || String(Math.random()).split('.')[1]
	const random = Random( seed )
	const simplex = new Simplex( random )
	const simplex3 = simplex.noise3D.bind(simplex)

	Shortcuts(seed)
	console.log('seed', seed)

	const props = {
		rowCount: 100,
		colCount: 30,
		activeLines : 10,
		random : random,
		simplex3 : simplex3,
		maxAngle : Math.PI * 0.2,
		lineLength : 0.002,
		simplexScale : 1,
		simplexDepthScale : 0.001,
	}

	const state = {
		tree : Rbush(9),
		lines : [],
		stageBoundary : null,
		generation : 0,
		iteration : 0,
	}

	_createStageBoundary(props, state)
	_initLines(props, state);

	const draw = setupDraw(state)

	function loop() {
		_updateLines( state, props )
		draw()
		requestAnimationFrame( loop )
	}
	requestAnimationFrame(loop)

	window.onhashchange = function () {
		location.reload()
	}
}

init()
