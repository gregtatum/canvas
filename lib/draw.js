const lerp = require("lerp");

function setupCanvas() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  document.body.appendChild(canvas);

  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  resize();
  window.addEventListener("resize", resize, false);

  return ctx;
}

function loop(callback) {
  const startTime = Date.now();
  function innerLoop() {
    callback((Date.now() - startTime) / 1000);
    requestAnimationFrame(innerLoop);
  }
  requestAnimationFrame(innerLoop);
}

function generateSeed() {
  const seed =
    window.location.hash.substr(1) || String(Math.random()).split(".")[1];
  console.log("current seed", seed);

  // Reload the page on hash change.
  window.onhashchange = function() {
    location.reload();
  };
  return seed;
}

const TAU = Math.PI;
function lerpTheta(a, b, t) {
  a = ((a % TAU) + TAU) % TAU;
  b = ((b % TAU) + TAU) % TAU;

  if (b - a > Math.PI) {
    a += TAU;
  }
  return lerp(a, b, t);
}

module.exports = {
  setupCanvas,
  loop,
  generateSeed,
  lerpTheta,
};
