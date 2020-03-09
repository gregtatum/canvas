const lerp = require("lerp");

const { PI } = Math;
const TAU = Math.PI * 2;

function lerpTheta(a, b, t) {
  // Transform a and b to be between 0 and TAU. The first modulo operation could
  // result in a negative number, the second ensures it's positive.
  a = ((a % TAU) + TAU) % TAU;
  b = ((b % TAU) + TAU) % TAU;

  if (b - a > PI) {
    a += TAU;
  }
  return lerp(a, b, t);
}

module.exports = {
  lerpTheta,
};
