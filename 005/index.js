const Simplex = require("simplex-noise");
const setupRandom = require("@tatumcreative/random");
const initializeShortcuts = require("../lib/shortcuts");
const { setupCanvas, loop, generateSeed } = require("../lib/draw");
const { setupCurveDrawing, drawLineSegments } = require("../lib/curve-drawing");
const createVerletSystem = require("verlet-system");
const createPoint = require("verlet-point");
const createConstraint = require("verlet-constraint");

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
    lineInitialSpeed: 1,
    lineShrinkage: 0.8,
    extrudeLength: 50,
    constraintConfig: { stiffness: 0.1 },
  };

  // Mutable state.
  const current = {
    now: Date.now() / 1000,
    dt: 0,
    verletSystem: createVerletSystem({
      min: [0, 0],
      max: [ctx.canvas.width, ctx.canvas.height],
    }),
    lines: [],
  };

  setupCurveDrawing({
    ctx,
    pointsPerDistance: 50,
    drawingTarget: document.body,
    doDrawTrail: true,
    onCurveDrawn: curve => {
      const { constraintConfig, extrudeLength } = config;
      const line = [curve.line[0]];
      const points = [];
      const constraints = [];

      // Don't allow points to share the same space. Not sure why this is happening,
      // but I should probably fix it.
      for (let i = 1; i < curve.line.length; i++) {
        const p0 = curve.line[i - 1];
        const p1 = curve.line[i];
        if (p0.x !== p1.x && p0.y !== p1.y) {
          line.push(p1);
        }
      }

      // Create a strip from the lines by extruding out from the sides.
      //    o
      //    |
      //   p1
      // d--o--c   perp (unit vector
      // |  |  |   --->
      // |  |  |
      // a--o--b
      //   p0
      let a, b;
      for (let i = 1; i < line.length; i++) {
        const p0 = line[i - 1];
        const p1 = line[i];
        const perp = getPerpendicularUnitVector(p0, p1);

        if (Number.isNaN(perp.x) || Number.isNaN(perp.y)) {
          console.error({ p0, p1, perp });
          throw new Error("NaN");
        }

        if (!a && !b) {
          a = createPoint({
            position: [
              p0.x + extrudeLength * -perp.x,
              p0.y + extrudeLength * -perp.y,
            ],
          });
          b = createPoint({
            position: [
              p0.x + extrudeLength * perp.x,
              p0.y + extrudeLength * perp.y,
            ],
          });
          points.push(a, b);
        }
        const c = createPoint({
          position: [
            p1.x + extrudeLength * perp.x,
            p1.y + extrudeLength * perp.y,
          ],
        });
        const d = createPoint({
          position: [
            p1.x + extrudeLength * -perp.x,
            p1.y + extrudeLength * -perp.y,
          ],
        });

        // Connect the 4 sides of the square.
        constraints.push(createConstraint([a, b], constraintConfig));
        constraints.push(createConstraint([b, c], constraintConfig));
        constraints.push(createConstraint([c, d], constraintConfig));
        constraints.push(createConstraint([d, a], constraintConfig));
        // Create a diagonal brace.
        constraints.push(createConstraint([b, d], constraintConfig));
        constraints.push(createConstraint([a, c], constraintConfig));

        points.push(d, c);
        a = d;
        b = c;
      }

      for (const constraint of constraints) {
        constraint.restingDistance *= config.lineShrinkage;
      }
      current.lines.push({ points, constraints });
    },
  });

  window.current = current;

  loop(now => {
    current.dt = now - current.time;
    current.time = now;

    updateVerlet(config, current);
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    drawConstraints(config, current);
  });

  window.addEventListener("resize", () => {
    // TODO
  });
}

function updateVerlet(config, current) {
  const { ctx, simplex3 } = config;
  const { verletSystem, lines, dt, time } = current;

  // Update the size of the simulation.
  verletSystem.max = [ctx.canvas.width, ctx.canvas.height];

  const gravitySimplexScale = 1;
  const gravityDistance = 100;
  const theta = Math.PI * simplex3(1, 1, time * gravitySimplexScale);
  verletSystem.gravity = [
    Math.cos(theta) * gravityDistance,
    Math.sin(theta) * gravityDistance,
  ];

  // Solve the system.
  for (const { points, constraints } of lines) {
    verletSystem.integrate(points, dt);
    for (const constraint of constraints) {
      constraint.solve();
    }
  }
}

function drawConstraints(config, current) {
  const { ctx } = config;
  ctx.lineWidth = 1 * devicePixelRatio;
  ctx.strokeStyle = "#fff";

  ctx.beginPath();
  for (const { constraints } of current.lines) {
    for (const {
      points: [a, b],
    } of constraints) {
      ctx.moveTo(a.position[0], a.position[1]);
      ctx.lineTo(b.position[0], b.position[1]);
    }
  }
  ctx.stroke();
}

function getPerpendicularUnitVector(pointA, pointB) {
  const dx = pointA.x - pointB.x;
  const dy = pointA.y - pointB.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  return { x: dy / length, y: -dx / length };
}
