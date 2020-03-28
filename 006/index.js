const Simplex = require("simplex-noise");
const setupRandom = require("@tatumcreative/random");
const initializeShortcuts = require("../lib/shortcuts");
const { setupCanvas, loop, generateSeed } = require("../lib/draw");
const createVerletSystem = require("verlet-system");
const createPoint = require("verlet-point");
const createConstraint = require("verlet-constraint");
const lerp = require("lerp");
const createRtree = require("rtree");
const triangulate = require("delaunay-triangulate");
const ease = require("eases/cubic-in-out");

const TAU = Math.PI * 2;

{
  const seed = generateSeed();
  const random = setupRandom(seed);
  const simplex = new Simplex(random);
  const simplex3 = simplex.noise3D.bind(simplex);
  const ctx = setupCanvas();

  document.body.style.cursor = "none";

  initializeShortcuts(seed);

  const config = {
    ctx,
    seed,
    random,
    simplex3,
    textFadeInSpeed: 0.02,
    textFadeOutSpeed: 0.02,
    delaunayChance: 1 / 50,
    gridCellSize: 25,
    mouseLinesCount: 17,
    mouseLinesLength: 30,
    mouseLinesSpeed: 0.3,
    mouseLinesDiamondWidth: 1,
    maxConstraintsPerPoint: 5,
    constraintConfig: { stiffness: 0.1 / 10, restingDistance: 15 },
  };

  // Mutable state.
  const current = {
    now: Date.now() / 1000,
    dt: 0,
    textFadeIn: 0,
    firstFewDts: [],
    medianDt: 0,
    lastTickUnravelCount: 0,
    tick: 0,
    rtree: createRtree(),
    points: [],
    constraints: [],
    debugConstraints: [],
    grid: createGrid(config),
    pointToConstraints: new Map(),
    verletSystem: createVerletSystem({
      min: [0, 0],
      max: [innerWidth, innerHeight],
    }),
    mouseX: 100,
    mouseY: 100,
    isMouseDown: false,
  };

  window.current = current;

  setupMouseMove(config, current);

  window.addEventListener("resize", () => {
    current.grid = createGrid(config);
  });

  window.addEventListener("mousedown", () => (current.isMouseDown = true));
  window.addEventListener("mouseup", () => (current.isMouseDown = false));
  window.addEventListener("mouseout", () => (current.isMouseDown = false));

  loop(now => {
    try {
      current.dt = Math.min(now - current.time, 100);
      current.time = now;
      current.tick++;

      updatePointGeneraton(config, current);
      current.grid.update(current);
      updateRandomConnection(config, current);
      updateDelaunay(config, current);
      updateUnravel(config, current);
      updateVerlet(config, current);

      drawClearScreen(config);
      drawIntroText(config, current);
      drawMouse(config, current);
      drawConstraints(config, current);
      drawPoints(config, current);
      // drawTriangles(config, current);
    } catch (error) {
      document.body.style.cursor = "default";
      throw error;
    }
  });
}

function updateDelaunay(config, current) {
  const { random, delaunayChance } = config;
  const { pointToConstraints } = current;

  if (random() > delaunayChance) {
    return;
  }

  if (current.constraints.length < 10) {
    return;
  }

  const points = new Set();
  const connected = new Set();
  // Pick a random constraint:
  const firstConstraint =
    current.constraints[random(0, current.constraints.length - 1, true)];
  const constraintsToWalk = [firstConstraint];
  connected.add(firstConstraint);

  while (constraintsToWalk.length > 0) {
    const constraint = constraintsToWalk.pop();
    for (const point of constraint.points) {
      // Keep track of this point.
      points.add(point);

      // Now go through all of the connected constraints for this point.
      const nextConstraints = pointToConstraints.get(point);
      if (nextConstraints) {
        for (const nextConstraint of nextConstraints) {
          if (!connected.has(nextConstraint)) {
            connected.add(nextConstraint);
            constraintsToWalk.push(nextConstraint);
          }
        }
      }
    }
  }

  if (connected.size < 12) {
    // Not enough to form a triangle.
    return;
  }

  for (const point of points) {
    // Forget everything connected to this point.
    pointToConstraints.delete(point);
  }

  // Remove the old constraints.
  current.constraints = current.constraints.filter(c => !connected.has(c));

  const indexedPoints = [...points];

  const triangles = triangulate(indexedPoints.map(p => p.position));
  for (const indexes of triangles) {
    const pointA = indexedPoints[indexes[0]];
    const pointB = indexedPoints[indexes[1]];
    const pointC = indexedPoints[indexes[2]];
    addConstraintToSystem(current, config, pointA, pointB);
    addConstraintToSystem(current, config, pointB, pointC);
    addConstraintToSystem(current, config, pointC, pointA);
  }
}

function updateUnravel(config, current) {
  const { random } = config;
  const {
    constraints,
    points,
    pointToConstraints,
    firstFewDts,
    tick,
    dt,
  } = current;

  {
    // Compute the average dt.
    if (tick < 11) {
      if (tick === 1) {
        // This dt is probably ~0;
        return;
      }
      firstFewDts.push(dt);
      return;
    }
    if (tick === 11) {
      // Find the median dt.
      firstFewDts.sort();
      current.medianDt = firstFewDts[Math.floor(firstFewDts.length / 2)];
    }
  }

  // Wait to run this until there are enough constraints before we unravel.
  if (constraints.length < 10) {
    current.lastTickUnravelCount = 0;
    return;
  }

  // The strategy here is to unravel when this thing takes too long.
  if (dt > current.medianDt * 1.5) {
    current.lastTickUnravelCount++;
  } else {
    current.lastTickUnravelCount = Math.floor(
      (current.lastTickUnravelCount - 1) / 2
    );
    current.lastTickUnravelCount = Math.max(0, current.lastTickUnravelCount);
  }

  const unravelCount = Math.min(points.length, current.lastTickUnravelCount);

  for (let i = 0; i < unravelCount; i++) {
    const pointIndex = random(0, points.length - 1, true);
    const point = points[pointIndex];
    fastRemove(points, pointIndex);
    const constraintsToRemove = pointToConstraints.get(point);
    pointToConstraints.delete(point);

    if (constraintsToRemove) {
      for (const constraint of constraintsToRemove) {
        impartForceOnConnectedConstraints(config, current, constraint);
        const constraintIndex = constraints.indexOf(constraint);
        if (constraintIndex !== -1) {
          fastRemove(constraints, constraintIndex);
        }
      }
    }
  }
}

function impartForceOnConnectedConstraints(config, current, constraint) {
  const { random } = config;
  const { pointToConstraints } = current;
  for (const point of constraint.points) {
    const otherConstraints = pointToConstraints.get(point);
    if (!otherConstraints) {
      continue;
    }
    for (const otherConstraint of otherConstraints) {
      for (const otherPoint of otherConstraint.points) {
        const theta = random(TAU);
        const distance = random(2);
        otherPoint.addForce([
          //
          Math.cos(theta) * distance,
          Math.sin(theta) * distance,
        ]);
      }
    }
  }
}

// Quickly removes an item from a list by swapping out the last item.
function fastRemove(list, index) {
  if (list.length === 0) {
    return;
  }

  if (index === list.length - 1) {
    list.pop();
  } else {
    list[index] = list.pop();
  }
}

function addConstraintToSystem(current, config, pointA, pointB) {
  const { constraintConfig } = config;
  const { pointToConstraints } = current;
  const constraint = createConstraint([pointA, pointB], constraintConfig);
  insertIntoList(pointToConstraints, pointA, constraint);
  insertIntoList(pointToConstraints, pointB, constraint);
  current.constraints.push(constraint);
}

function updateRandomConnection(config, current) {
  const { random, maxConstraintsPerPoint } = config;
  const { points, constraints } = current;

  if (points.length < 5) {
    return;
  }

  for (let i = 0; i < 5; i++) {
    const point = points[random(0, points.length, true)];
    if (point.connectionCount >= maxConstraintsPerPoint) {
      return;
    }
    const neighbor = current.grid.getNearestNeighbor(point);
    if (neighbor && !(neighbor.connectionCount >= maxConstraintsPerPoint)) {
      // Check if it's already connected somewhere.
      let areConnected = false;
      for (const { points } of constraints) {
        const [a, b] = points;
        if (
          (a === point || a === neighbor) &&
          (b === point || b === neighbor)
        ) {
          areConnected = true;
          break;
        }
      }
      if (!areConnected) {
        point.connectionCount = (point.connectionCount || 0) + 1;
        neighbor.connectionCount = (neighbor.connectionCount || 0) + 1;
        addConstraintToSystem(current, config, point, neighbor);
      }
    }
  }
}

function insertIntoList(map, key, value) {
  let list = map.get(key);
  if (!list) {
    list = [];
    map.set(key, list);
  }
  list.push(value);
}

function setupMouseMove(config, current) {
  window.addEventListener("touchmove", event => {
    const [{ pageX, pageY }] = event.touches[0];
    current.mouseX = pageX;
    current.mouseY = pageY;
  });

  window.addEventListener("touchend", () => {
    current.mouseX = null;
    current.mouseY = null;
  });

  window.addEventListener("mousemove", event => {
    current.mouseX = event.pageX;
    current.mouseY = event.pageY;
  });

  window.addEventListener("mouseout", () => {
    current.mouseX = null;
    current.mouseY = null;
  });
}

function createGrid(config) {
  const { gridCellSize } = config;
  const w = Math.max(1, Math.floor(innerWidth / gridCellSize));
  const h = Math.max(1, Math.floor(innerHeight / gridCellSize));
  const itemToCoordinate = new Map();
  const grid = [];
  for (let i = 0; i < w; i++) {
    grid.push([]);
    for (let j = 0; j < h; j++) {
      grid[i][j] = new Set();
    }
  }

  function update(current) {
    for (const point of current.points) {
      updateItem(point, point.position[0], point.position[1]);
    }
  }

  function updateItem(item, pixelX, pixelY) {
    if (Number.isNaN(pixelX) || Number.isNaN(pixelY)) {
      throw new Error("gride.updateItem, pixels were NaN");
    }
    const gridX = clamp(0, w - 1, Math.floor(pixelX / w));
    const gridY = clamp(0, h - 1, Math.floor(pixelY / h));
    let coord = itemToCoordinate.get(item);
    if (coord) {
      grid[coord.x][coord.y].delete(item);
      coord.x = gridX;
      coord.y = gridY;
    } else {
      coord = { x: gridX, y: gridY };
      itemToCoordinate.set(item, coord);
    }
    if (Number.isNaN(coord.x) || Number.isNaN(coord.y)) {
      throw new Error("A NaN coordinate was found.");
    }
    grid[coord.x][coord.y].add(item);
  }

  function getNeighbors(item) {
    const coord = itemToCoordinate.get(item);
    if (!coord) {
      throw new Error("Could not find the item's coordinate. Was it updated?");
    }
    return grid[coord.x][coord.y];
  }

  function getDistSq(a, b) {
    const dx = a.position[0] - b.position[0];
    const dy = a.position[1] - b.position[1];
    return dx * dx + dy * dy;
  }

  function getNearestNeighbor(item) {
    let closest;
    let distSq;
    for (const neighbor of getNeighbors(item)) {
      if (neighbor === item) {
        continue;
      }
      const neighborDistSq = getDistSq(item, neighbor);
      if (!closest) {
        closest = neighbor;
        distSq = neighborDistSq;
      } else {
        if (neighborDistSq < distSq) {
          closest = neighbor;
          distSq = neighborDistSq;
        }
      }
    }
    return closest;
  }
  return {
    update,
    getNeighbors,
    getNearestNeighbor,
  };
}

function drawClearScreen({ ctx }) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, innerWidth, innerHeight);
}

function updateVerlet(config, current) {
  const { verletSystem, points, constraints, dt } = current;

  // Update the size of the simulation.
  verletSystem.max = [innerWidth, innerHeight];

  // Solve the system.
  verletSystem.integrate(points, dt);
  for (const constraint of constraints) {
    constraint.solve();
  }
}

function drawMouse(config, current) {
  const {
    ctx,
    mouseLinesCount,
    mouseLinesLength,
    mouseLinesSpeed,
    mouseLinesDiamondWidth,
  } = config;
  const { mouseX, mouseY, time } = current;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  if (mouseX !== null) {
    const rotation = time * mouseLinesSpeed;
    for (let i = 0; i < mouseLinesCount; i++) {
      const thetaOffset = (TAU * i) / mouseLinesCount;
      const lineLength =
        mouseLinesLength * Math.abs(Math.sin(time + thetaOffset * 3));
      const targetX = mouseX + Math.cos(rotation + thetaOffset) * lineLength;
      const targetY = mouseY + Math.sin(rotation + thetaOffset) * lineLength;

      const perp = getPerpendicularUnitVector(mouseX, mouseY, targetX, targetY);

      const midpointX = lerp(mouseX, targetX, 0.5);
      const midpointY = lerp(mouseY, targetY, 0.5);
      const diamondWidth =
        Math.sin(3 * thetaOffset + time) * mouseLinesDiamondWidth;

      ctx.moveTo(mouseX, mouseY);
      ctx.lineTo(
        midpointX + perp.x * diamondWidth,
        midpointY + perp.y * diamondWidth
      );
      ctx.lineTo(targetX, targetY);
      ctx.lineTo(
        midpointX - perp.x * diamondWidth,
        midpointY - perp.y * diamondWidth
      );
      current.time;
    }
  }
  ctx.fill();
}

function drawConstraints(config, current) {
  const { constraints } = current;
  const { ctx } = config;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#fff";
  ctx.beginPath();
  for (const {
    points: [a, b],
  } of constraints) {
    ctx.moveTo(a.position[0], a.position[1]);
    ctx.lineTo(b.position[0], b.position[1]);
  }
  ctx.stroke();
}

function drawPoints(config, current) {
  const { ctx } = config;
  const { points, pointToConstraints } = current;
  ctx.fillStyle = "#fff";
  for (const point of points) {
    if (pointToConstraints.has(point)) {
      continue;
    }
    const [x, y] = point.position;
    const w = 3;
    ctx.fillRect(x - w / 2, y - w / 2, w, w);
  }
}

function getPerpendicularUnitVector(aX, aY, bX, bY) {
  const dx = aX - bX;
  const dy = aY - bY;
  const length = Math.sqrt(dx * dx + dy * dy);
  return { x: dy / length, y: -dx / length };
}

function updatePointGeneraton(config, current) {
  const { random } = config;
  const { mouseX, mouseY, points, isMouseDown } = current;
  if (!isMouseDown || mouseX === null || mouseY === null) {
    return;
  }
  for (let i = 0; i < 5; i++) {
    const point = createPoint({
      position: [mouseX, mouseY],
    });
    const theta = random(TAU);
    const distance = random(2, 3);
    point.addForce([
      //
      Math.cos(theta) * distance,
      Math.sin(theta) * distance,
    ]);
    if (Number.isNaN(point.position[0]) || Number.isNaN(point.position[1])) {
      throw new Error("updatePointGeneration had a NaN");
    }

    points.push(point);
  }
}

function clamp(min, max, value) {
  return Math.max(min, Math.min(max, value));
}

function drawIntroText(config, current) {
  const { ctx } = config;
  const { points } = current;
  if (points.length === 0) {
    current.textFadeIn += config.textFadeInSpeed;
    current.textFadeIn = Math.min(1, current.textFadeIn);
  } else {
    current.textFadeIn -= config.textFadeOutSpeed;
    current.textFadeIn = Math.max(0, current.textFadeIn);
  }

  if (current.textFadeIn > 0) {
    const hexOpacity = Math.floor(ease(current.textFadeIn) * 15).toString(16);

    ctx.textAlign = "center";
    ctx.font = "25px sans-serif";
    ctx.fillStyle = "#fff" + hexOpacity;
    ctx.fillText("Push on the screen", innerWidth / 2, innerHeight / 2);
  }
}
