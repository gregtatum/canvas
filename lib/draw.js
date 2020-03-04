function setupCanvas() {
  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);

  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
  }
  resize();
  window.addEventListener("resize", resize, false);

  return canvas.getContext("2d", { alpha: false });
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
  return seed;
}

module.exports = {
  setupCanvas,
  loop,
  generateSeed
};
