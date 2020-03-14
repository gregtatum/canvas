const Simplex = require("simplex-noise");
const setupRandom = require("@tatumcreative/random");
const initializeShortcuts = require("../lib/shortcuts");
const { setupCanvas, loop, generateSeed } = require("../lib/draw");
const { CurveDrawingLayer, drawCurve } = require("../lib/curve-drawing");
const TAU = Math.PI * 2;

{
  const seed = generateSeed();
  const random = setupRandom(seed);
  const simplex = new Simplex(random);
  const simplex3 = simplex.noise3D.bind(simplex);
  const ctx = setupCanvas();

  initializeShortcuts(seed);

  const config = {
    ctx,
    seed,
    random,
    simplex3,
  };

  const curveDrawingLayer = new CurveDrawingLayer({
    ctx,
    pointsPerDistance: 100,
    drawingTarget: document.body,
    doDrawTrail: true,
    onCurveDrawn: curve => {
      drawCurve(ctx, curve);
      console.log("Curve drawn", curve);
    },
  });

  // Mutable state.
  const current = {
    curveDrawingLayer,
  };

  window.current = current;

  // loop(now => {
  //   current.time = now;
  //   draw(config, current);
  // });

  window.addEventListener("resize", () => {
    // TODO
  });
}
