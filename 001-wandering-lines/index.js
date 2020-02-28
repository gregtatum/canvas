var Rbush        = require('rbush')
var Simplex      = require('simplex-noise')
var Lerp         = require('lerp')
var Random       = require('@tatumcreative/random')
var Intersection = require('../lib/intersection')
var Draw         = require('../lib/draw')
var Shortcuts    = require('../lib/shortcuts')
var TAU          = Math.PI * 2

function _cutOutIntersections( neighbors, bounds ) {

	var lineEnd
	var lastDistance = Infinity

	var a = bounds.line

	neighbors.forEach(function(neighbor) {

		var b = neighbor.line

		var intersection = Intersection(
			a[0], a[1], a[2], a[3],
			b[0], b[1], b[2], b[3]
		)
		if( intersection ) {
			var intersectionDistance = (
				( intersection[0] - a[0] ) * ( intersection[0] - a[0] )  +
				( intersection[1] - a[1] ) * ( intersection[1] - a[1] )
			)
			if( intersectionDistance < lastDistance ) {
				lastDistance = intersectionDistance
				lineEnd = intersection
			}
		}
	})

	if( lineEnd ) {
		return _lineToBounds([ a[0], a[1], lineEnd[0], lineEnd[1] ])
	}

	return false
}

function _lineToBounds( line ) {

	var bounds = [
		Math.min(line[0],line[2]),
		Math.min(line[1],line[3]),
		Math.max(line[0],line[2]),
		Math.max(line[1],line[3]),
	]

	bounds.line = line
	bounds.theta = Math.atan2( line[3] - line[1], line[2] - line[0] )
	return bounds
}

function _newLine( current, config, x, y, generation, now ) {

	var noise = config.simplex3(
		x * config.simplexScale,
		y * config.simplexScale,
		now * config.simplexDepthScale
	)

	var theta = noise * TAU

	var newX = x + Math.cos( theta ) * config.lineLength
	var newY = y + Math.sin( theta ) * config.lineLength

	var newBounds = _lineToBounds([ x, y, newX, newY ])
	var neighbors = current.tree.search( newBounds )

	var cutBounds = _cutOutIntersections( neighbors, newBounds )

	if( cutBounds ) {
		newBounds = cutBounds
	}
	newBounds.line.generation = generation
	current.tree.insert( newBounds )
	current.lines.push( newBounds.line )
	current.newLines.push( newBounds.line )

	if( !cutBounds ) {
		return newBounds
	}
}

function _createStageBoundary( config, current ) {

	var centerX = 0.5
	var centerY = 0.5

	var size = config.margin * 0.5

	var x1 = centerX - size
	var x2 = centerX + size
	var y1 = centerY - size
	var y2 = centerY + size

	// current.tree.insert( _lineToBounds([x1,y1,x2,y1]) )
	// current.tree.insert( _lineToBounds([x2,y1,x2,y2]) )
	// current.tree.insert( _lineToBounds([x2,y2,x1,y2]) )
	// current.tree.insert( _lineToBounds([x1,y2,x1,y1]) )

	current.stageBoundary = [
		Lerp( centerX, x1, 0.5 ),
		Lerp( centerY, y1, 0.5 ),
		Lerp( centerX, x2, 0.5 ),
		Lerp( centerY, y2, 0.5 ),
	]
}

function _updateLines( current, config ) {
	current.iteration++
	current.newLines.length = 0

	for( var i=0; i < config.activeLines; i++ ) {

		var bounds = current.active[i]
		var x, y, generation

		if( current.firstRun ) {
			x = config.random( current.stageBoundary[0], current.stageBoundary[2] )
			y = config.random( current.stageBoundary[1], current.stageBoundary[3] )
			generation = Math.log(current.generation++)
		} else if( !bounds ) {
			bounds = _startBranch( current, config )
		}

		if( bounds ) {
			x = bounds.line[2]
			y = bounds.line[3]
			generation = bounds.generation
		}

		current.active[i] = _newLine( current, config, x, y, generation, current.iteration )
	}

	current.firstRun = false
}

function _startBranch( current, config ) {

	var onStage = current.tree.search( current.stageBoundary )

	var index = Math.floor(config.random(onStage.length))
	var line = onStage[index].line

	var dx = (line[2] - line[0]) * config.nubSize
	var dy = (line[3] - line[1]) * config.nubSize

	// Choose either or side
	var normal = config.random() > 0.5 ? [-dy, dx] : [dy, -dx]

	var x = (line[0] + line[2]) / 2
	var y = (line[1] + line[3]) / 2

	var bounds = _lineToBounds([
		x + normal[0] * 0.5,
		y + normal[1] * 0.5,
		x + normal[0],
		y + normal[1]
	])

	bounds.line.generation = Math.pow((line.generation || 2), 2)

	current.tree.insert( bounds )
	current.lines.push( bounds.line )
	current.newLines.push( bounds.line )

	return bounds
}

function init() {

	var seed = window.location.hash.substr(1) || String(Math.random()).split('.')[1]
	var random = Random( seed )
	var simplex = new Simplex( random )
	var simplex3 = simplex.noise3D.bind(simplex)

	Shortcuts(seed)
	console.log('current seed', seed)

	var config = {
		margin: 1.5,
		activeLines : 20,
		random : random,
		simplex3 : simplex3,
		maxAngle : Math.PI * 0.2,
		lineLength : 0.002,
		simplexScale : 1,
		simplexDepthScale : 0.0001,
		nubSize : 0.0001,
	}

	var current = {
		firstRun : true,
		tree : Rbush(9),
		active : [],
		lines : [],
		newLines : [],
		stageBoundary : null,
		generation : 2,
		iteration : 0,
	}

	_createStageBoundary( config, current )

	var draw = Draw( current )

	function loop() {
		_updateLines( current, config )
		draw()
		requestAnimationFrame( loop )
	}
	requestAnimationFrame(loop)

	window.onhashchange = function () {
		location.reload()
	}
}

init()
