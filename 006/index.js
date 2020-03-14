const Simplex = require("simplex-noise");
const setupRandom = require("@tatumcreative/random");
const initializeShortcuts = require("../lib/shortcuts");
const { setupCanvas, loop, generateSeed } = require("../lib/draw");
const { setupCurveDrawing } = require("../lib/curve-drawing");
const createVerletSystem = require("verlet-system");
const createPoint = require("verlet-point");
const createConstraint = require("verlet-constraint");
const ease = require("eases/cubic-in-out");

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
    baseExtrudeLength: 50,
    blobDiesAtAge: 50,
    textFadeInSpeed: 0.02,
    textFadeOutSpeed: 0.02,
    pointsPerDistance: 5,
    gravitySimplexScale: 1,
    gravityDistance: 100,
    constraintConfig: { stiffness: 0.1 },
    inProgressSimplexSpeed: 1,
    inProgressSimplexScale: 5,
  };

  // Mutable state.
  const current = {
    now: Date.now() / 1000,
    dt: 0,
    blobs: new Set(),
    textFadeIn: 0,
    verletSystem: createVerletSystem({
      min: [0, 0],
      max: [ctx.canvas.width, ctx.canvas.height],
    }),
    curveDrawing: setupCurveDrawing({
      ctx,
      pointsPerDistance: config.pointsPerDistance,
      drawingTarget: document.body,
      onCurveDrawn: curve => addNewCurve(config, current, curve),
    }),
    triangles: new Set(),
    pointToTriangle: new Map(),
  };

  window.current = current;

  loop(now => {
    current.dt = Math.min(now - current.time, 100);
    current.time = now;

    updateVerlet(config, current);
    updateDestroyingGeometry(config, current);

    drawClearScreen(config);
    drawIntroText(config, current);
    drawInProgressDrawing(config, current);
    // drawConstraints(config, current);
    drawPoints(config, current);
    drawTriangles(config, current);
  });
}

function drawClearScreen({ ctx }) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawTriangles(config, current) {
  const { ctx } = config;
  const { triangles } = current;

  ctx.fillStyle = "#fff6";
  ctx.beginPath();
  for (const triangle of triangles) {
    const [a, b, c] = triangle.points;
    ctx.moveTo(a.position[0], a.position[1]);
    ctx.lineTo(b.position[0], b.position[1]);
    ctx.lineTo(c.position[0], c.position[1]);
    ctx.lineTo(a.position[0], a.position[1]);
  }
  ctx.fill();
}

function drawIntroText(config, current) {
  const { ctx } = config;
  const { blobs, curveDrawing } = current;
  if (blobs.size === 0 && curveDrawing.points.length === 0) {
    current.textFadeIn += config.textFadeInSpeed;
    current.textFadeIn = Math.min(1, current.textFadeIn);
  } else {
    current.textFadeIn -= config.textFadeOutSpeed;
    current.textFadeIn = Math.max(0, current.textFadeIn);
  }
  if (current.textFadeIn > 0) {
    const hexOpacity = Math.floor(ease(current.textFadeIn) * 15).toString(16);

    ctx.textAlign = "center";
    ctx.font = "50px sans-serif";
    ctx.fillStyle = "#fff" + hexOpacity;
    ctx.fillText(
      "Draw on the screen",
      ctx.canvas.width / 2,
      ctx.canvas.height / 2
    );
  }
}

function updateDestroyingGeometry(config, current) {
  const { random, blobDiesAtAge } = config;
  const { blobs, triangles, pointToTriangle } = current;

  for (const blob of blobs) {
    const { constraints, points } = blob;
    blob.age++;

    const blobDeathCount = Math.min(
      constraints.length,
      Math.floor(random(0, blob.age / blobDiesAtAge))
    );

    for (let i = 0; i < blobDeathCount; i++) {
      // Pick a random constraint, and remove it.
      const index = random(0, constraints.length, true);
      const constraint = constraints[index];
      // Ordering doesn't matter, swap the last constraint into this one's spot.
      constraints[index] = constraints[constraints.length - 1];
      constraints.pop();

      for (const point of constraint.points) {
        const trianglesToDelete = pointToTriangle.get(point);
        if (trianglesToDelete) {
          for (const triangle of trianglesToDelete) {
            triangles.delete(triangle);
          }
        }
      }
      // Add some chaos to the destruction.
      for (const point of constraint.points) {
        const destroyForce = random(10, 50);
        point.addForce([
          random(-destroyForce, destroyForce),
          random(-destroyForce, destroyForce),
        ]);
      }
    }

    if (constraints.length === 0 && random() < points.length / 40) {
      // We've already run out of constraints
      points.pop();
    }

    if (points.length === 0) {
      current.blobs.delete(blob);
    }
  }
}

function addNewCurve(config, current, curve) {
  const { constraintConfig, baseExtrudeLength } = config;
  const { triangles, pointToTriangle } = current;
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

    const unitI = (line.length - i) / (line.length + 1);
    const extrudeLength = baseExtrudeLength;
    // * ease(1 - Math.abs(unitI - 0.5) * 2);

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
      position: [p1.x + extrudeLength * perp.x, p1.y + extrudeLength * perp.y],
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

    const triangle1 = {
      points: [a, b, c],
    };
    const triangle2 = {
      points: [c, d, a],
    };

    mapAddToList(pointToTriangle, a, triangle1);
    mapAddToList(pointToTriangle, b, triangle1);
    mapAddToList(pointToTriangle, c, triangle1);
    mapAddToList(pointToTriangle, c, triangle2);
    mapAddToList(pointToTriangle, d, triangle2);
    mapAddToList(pointToTriangle, a, triangle2);

    triangles.add(triangle1);
    triangles.add(triangle2);

    points.push(d, c);
    a = d;
    b = c;
  }

  for (const constraint of constraints) {
    constraint.restingDistance *= config.lineShrinkage;
  }
  current.blobs.add({ points, constraints, age: 0 });
}

/**
 * Utility to add a Value to Map<Key, Value[]>
 */
function mapAddToList(map, key, value) {
  let list = map.get(key);
  if (!list) {
    list = [];
    map.set(key, list);
  }
  list.push(value);
}

function updateVerlet(config, current) {
  const { ctx, simplex3, gravitySimplexScale, gravityDistance } = config;
  const { verletSystem, blobs, dt, time } = current;

  // Update the size of the simulation.
  verletSystem.max = [ctx.canvas.width, ctx.canvas.height];

  const theta = Math.PI * simplex3(1, 1, time * gravitySimplexScale);
  verletSystem.gravity = [
    Math.cos(theta) * gravityDistance,
    Math.sin(theta) * gravityDistance,
  ];

  // Solve the system.
  for (const { points, constraints } of blobs) {
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
  for (const { constraints } of current.blobs) {
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

function drawInProgressDrawing(config, current) {
  const {
    ctx,
    simplex3,
    inProgressSimplexSpeed,
    inProgressSimplexScale,
  } = config;
  const {
    time,
    curveDrawing: { points },
  } = current;

  if (points.length) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 30 * devicePixelRatio;
    ctx.beginPath();
    ctx.strokeStyle = "#fffa";
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const { x, y } = points[i];
      ctx.lineTo(
        x +
          simplex3(x, y, time * inProgressSimplexSpeed) *
            inProgressSimplexScale,
        y +
          simplex3(x + 1000, y, time * inProgressSimplexSpeed) *
            inProgressSimplexScale
      );
    }
    ctx.stroke();
  }
}

function drawPoints(config, current) {
  const { ctx } = config;
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3 * devicePixelRatio;
  ctx.beginPath();
  for (const { points } of current.blobs) {
    for (const point of points) {
      ctx.moveTo(point.position[0], point.position[1]);
      ctx.lineTo(point.position[0] + 0.1, point.position[1]);
    }
  }
  ctx.stroke();
}
