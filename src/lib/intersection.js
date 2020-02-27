// Adapted from https://github.com/psalaets/line-intersect/
// Paul Salaets <psalaets@gmail.com>
// MIT License

module.exports = function checkIntersection( x1, y1, x2, y2, x3, y3, x4, y4 ) {
	
	if(
		(x1 === x3 && y1 == y3) ||
		(x1 === x4 && y1 == y4) ||
		(x2 === x3 && y2 == y3) ||
		(x2 === x4 && y2 == y4)
	) {
		return false
	}
		
	
	var denom = ((y4 - y3) * (x2 - x1)) - ((x4 - x3) * (y2 - y1));
	var numeA = ((x4 - x3) * (y1 - y3)) - ((y4 - y3) * (x1 - x3));
	var numeB = ((x2 - x1) * (y1 - y3)) - ((y2 - y1) * (x1 - x3));

	if( denom === 0 || (numeA === 0 && numeB === 0) ) {
		return false
	}

	var uA = numeA / denom;
	var uB = numeB / denom;

	if( uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1 ) {
		return [
			(uA * (x2 - x1)) + x1,
			(uA * (y2 - y1)) + y1
		]
	}
}