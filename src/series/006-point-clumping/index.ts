import Simplex from "simplex-noise";
import setupRandom from "@tatumcreative/random";
import initializeShortcuts from "../lib/shortcuts";
import { setupCanvas, loop, generateSeed } from "../lib/draw";
import createVerletSystem from "verlet-system";
import createPoint, { VerletPoint } from "verlet-point";
import createConstraint, { VerletConstraint } from "verlet-constraint";
import lerp from "lerp";
import createRtree from "rtree";
import triangulate from "delaunay-triangulate";
import ease from "eases/cubic-in-out";

type Config = ReturnType<typeof getConfig>;
type Current = ReturnType<typeof getCurrent>;

const TAU = Math.PI * 2;

{
  const config = getConfig();
  const current = getCurrent(config);

  (window as any).current = current;

  setupMouseMove(config, current);

  window.addEventListener("resize", () => {
    current.grid = createGrid(config);
  });

  window.addEventListener("mousedown", event => {
    const target = event.target as null | HTMLElement;
    if (target && target.tagName === "A") {
      // Don't set mouse down on a link.
      return;
    }

    current.isMouseDown = true;
  });
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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getConfig() {
  const seed = generateSeed();
  const random = setupRandom(seed);
  const simplex = new Simplex(random);
  const simplex3 = simplex.noise3D.bind(simplex);
  const ctx = setupCanvas();

  document.body.style.cursor = "none";

  initializeShortcuts(seed);

  return {
    ctx,
    seed,
    random,
    simplex3,
    textFadeInSpeed: 0.02,
    textFadeOutSpeed: 0.02,
    delaunayChance: 1 / 10,
    gridCellSize: 75,
    mouseLinesCount: 17,
    mouseLinesLength: 30,
    mouseLinesSpeed: 0.3,
    mouseLinesDiamondWidth: 1,
    maxConstraintsPerPoint: 5,
    minimumRemainingPoints: 20,
    breakingForce: 0.05,
    constraintConfig: { stiffness: 0.1 / 10, restingDistance: 15 },
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getCurrent(config: Config) {
  // Mutable state.
  return {
    time: (Date.now() / 1000) as Seconds,
    dt: 0,
    textFadeIn: 0,
    firstFewDts: [] as Seconds[],
    medianDt: 0,
    lastTickUnravelCount: 0,
    tick: 0,
    rtree: createRtree(),
    points: [] as VerletPoint[],
    constraints: [] as VerletConstraint[],
    grid: createGrid(config),
    pointToConstraints: new Map(),
    verletSystem: createVerletSystem({
      min: [0, 0],
      max: [innerWidth, innerHeight],
    }),
    mouseX: null as CssPixels | null,
    mouseY: null as CssPixels | null,
    isMouseDown: false,
    pointToConnectionCount: new Map() as Map<VerletPoint, Integer>,
  };
}

function updateDelaunay(config: Config, current: Current): void {
  const { random, delaunayChance } = config;
  const { pointToConstraints } = current;

  if (random() > delaunayChance) {
    return;
  }

  if (current.constraints.length < 10) {
    return;
  }

  const pointsToDelaunay: Set<VerletPoint> = new Set();
  const connected: Set<VerletConstraint> = new Set();

  // Pick a random constraint:
  const firstConstraint =
    current.constraints[random(0, current.constraints.length - 1, true)];
  const constraintsToWalk = [firstConstraint];
  connected.add(firstConstraint);

  while (constraintsToWalk.length > 0) {
    const constraint = constraintsToWalk.pop();
    if (!constraint) {
      throw new Error("Could not find constraint.");
    }
    for (const point of constraint.points) {
      // Keep track of this point.
      pointsToDelaunay.add(point);

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
  for (const point of pointsToDelaunay) {
    if (!current.points.includes(point)) {
      throw new Error("Woops");
    }
  }

  if (connected.size < 12) {
    // Not enough to form a triangle.
    return;
  }
  for (const point of pointsToDelaunay) {
    // Forget everything connected to this point.
    pointToConstraints.delete(point);
  }
  // Remove the old constraints.
  current.constraints = current.constraints.filter(c => !connected.has(c));
  const indexedPoints = [...pointsToDelaunay];

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

function updateUnravel(config: Config, current: Current): void {
  const { random, minimumRemainingPoints } = config;
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
  if (dt > current.medianDt * 2) {
    current.lastTickUnravelCount += 2;
  } else {
    current.lastTickUnravelCount = Math.floor(
      (current.lastTickUnravelCount - 1) / 2
    );
    current.lastTickUnravelCount = Math.max(0, current.lastTickUnravelCount);
  }

  const unravelCount = Math.min(
    points.length - minimumRemainingPoints,
    current.lastTickUnravelCount
  );

  for (let i = 0; i < unravelCount; i++) {
    const pointIndex = random(0, points.length - 1, true);
    const point = points[pointIndex];
    fastRemove(points, pointIndex);
    current.grid.removeItem(point);

    const constraintsToRemove = pointToConstraints.get(point);
    pointToConstraints.delete(point);

    if (constraintsToRemove) {
      for (const constraint of constraintsToRemove) {
        impartForceOnConnectedConstraints(config, current, constraint);
        const constraintIndex = constraints.indexOf(constraint);
        if (constraintIndex !== -1) {
          fastRemove(constraints, constraintIndex);
          for (const p of constraint.points) {
            // Update this cache
            const list = pointToConstraints.get(p);
            if (list) {
              fastRemove(list, list.indexOf(constraint));
            }
          }
        }
      }
    }
  }
}

function impartForceOnConnectedConstraints(
  config: Config,
  current: Current,
  constraint: VerletConstraint
): void {
  const { random, breakingForce } = config;
  const { pointToConstraints } = current;
  for (const point of constraint.points) {
    const otherConstraints = pointToConstraints.get(point);
    if (!otherConstraints) {
      continue;
    }
    for (const otherConstraint of otherConstraints) {
      for (const otherPoint of otherConstraint.points) {
        const theta = random(TAU);
        const distance = random(breakingForce);
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
function fastRemove<T>(list: T[], index: Index): void {
  if (index === -1) {
    return;
  }
  if (list.length === 0) {
    return;
  }

  if (index === list.length - 1) {
    list.pop();
  } else {
    // We know that this item exists through our real-time check.
    list[index] = (list.pop() as T | undefined) as T;
  }
}

function addConstraintToSystem(
  current: Current,
  config: Config,
  pointA: VerletPoint,
  pointB: VerletPoint
): void {
  const { constraintConfig } = config;
  const { pointToConstraints } = current;
  const constraint = createConstraint([pointA, pointB], constraintConfig);
  insertIntoList(pointToConstraints, pointA, constraint);
  insertIntoList(pointToConstraints, pointB, constraint);
  current.constraints.push(constraint);
}

function updateRandomConnection(config: Config, current: Current): void {
  const { random, maxConstraintsPerPoint } = config;
  const { points, constraints, pointToConnectionCount } = current;

  if (points.length < 5) {
    return;
  }

  const count = Math.max(5, points.length / 10);

  for (let i = 0; i < count; i++) {
    const point = points[random(0, points.length, true)];
    const connectionCount = pointToConnectionCount.get(point) || 0;
    if (connectionCount >= maxConstraintsPerPoint) {
      return;
    }
    const neighbor = current.grid.getNearestNeighbor(point);
    if (neighbor) {
      const neighborConnectionCount = pointToConnectionCount.get(neighbor) || 0;
      if (!(neighborConnectionCount >= maxConstraintsPerPoint)) {
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
          pointToConnectionCount.set(point, connectionCount + 1);
          pointToConnectionCount.set(neighbor, neighborConnectionCount + 1);
          addConstraintToSystem(current, config, point, neighbor);
        }
      }
    }
  }
}

function insertIntoList<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  let list = map.get(key);
  if (!list) {
    list = [];
    map.set(key, list);
  }
  list.push(value);
}

function setupMouseMove(config: Config, current: Current): void {
  window.addEventListener("touchmove", event => {
    const { pageX, pageY } = event.touches[0];
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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createGrid(config: Config) {
  const { gridCellSize } = config;
  const w = Math.max(1, Math.floor(innerWidth / gridCellSize));
  const h = Math.max(1, Math.floor(innerHeight / gridCellSize));
  const itemToCoordinate = new Map();

  type Grid = Set<VerletPoint>[][];

  const grid: Grid = [];
  for (let i = 0; i < w; i++) {
    grid.push([]);
    for (let j = 0; j < h; j++) {
      grid[i][j] = new Set();
    }
  }

  function update(current: Current): void {
    for (const point of current.points) {
      updateItem(point, point.position[0], point.position[1]);
    }
  }

  function removeItem(item: VerletPoint): void {
    const coord = itemToCoordinate.get(item);
    if (!coord) {
      throw new Error("Could not find that item in the grid");
    }
    grid[coord.x][coord.y].delete(item);
  }

  function updateItem(
    item: VerletPoint,
    pixelX: CssPixels,
    pixelY: CssPixels
  ): void {
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

  function getNeighbors(item: VerletPoint): Set<VerletPoint> {
    const coord = itemToCoordinate.get(item);
    if (!coord) {
      throw new Error("Could not find the item's coordinate. Was it updated?");
    }
    return grid[coord.x][coord.y];
  }

  function getDistSq(a: VerletPoint, b: VerletPoint): number {
    const dx = a.position[0] - b.position[0];
    const dy = a.position[1] - b.position[1];
    return dx * dx + dy * dy;
  }

  function getNearestNeighbor(item: VerletPoint): VerletPoint | undefined {
    let closest;
    let distSq = Infinity;
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
    removeItem,
    getNeighbors,
    getNearestNeighbor,
  };
}

function drawClearScreen({ ctx }: Config): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, innerWidth, innerHeight);
}

function updateVerlet(config: Config, current: Current): void {
  const { verletSystem, points, constraints, dt } = current;

  // Update the size of the simulation.
  verletSystem.max = [innerWidth, innerHeight];

  // Solve the system.
  verletSystem.integrate(points, dt);
  for (const constraint of constraints) {
    constraint.solve();
  }
}

function drawMouse(config: Config, current: Current): void {
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
  if (mouseX !== null && mouseY !== null) {
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

function drawConstraints(config: Config, current: Current): void {
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

function drawPoints(config: Config, current: Current): void {
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

function getPerpendicularUnitVector(
  aX: number,
  aY: number,
  bX: number,
  bY: number
): Vec2 {
  const dx = aX - bX;
  const dy = aY - bY;
  const length = Math.sqrt(dx * dx + dy * dy);
  return { x: dy / length, y: -dx / length };
}

function updatePointGeneraton(config: Config, current: Current): void {
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

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function drawIntroText(config: Config, current: Current): void {
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
