import Simplex from "simplex-noise";
import setupRandom from "@tatumcreative/random";
import initializeShortcuts from "lib/shortcuts";
import { setupCanvas, loop, generateSeed } from "lib/draw";
import createVerletSystem from "verlet-system";
import createPoint, { VerletPoint } from "verlet-point";
import createConstraint, { VerletConstraint } from "verlet-constraint";
import { range } from "lib/range";

type Config = ReturnType<typeof getConfig>;
type Current = ReturnType<typeof getCurrent>;

const TAU = Math.PI * 2;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getConfig() {
  const seed = generateSeed();
  const random = setupRandom(seed);
  const simplex = new Simplex(random);
  const simplex3 = simplex.noise3D.bind(simplex);
  const ctx = setupCanvas();

  initializeShortcuts(seed);

  return {
    ctx,
    seed,
    random,
    simplex3,
    gridCellSize: 75,
    breakingForce: 0.05,
    webPointCount: 1000,
    webRadiusRatio: 3 / 4,
    webSpinTimes: 10,
    mouseForce: 0.1,
    webInitialShrinking: 0.8,
    restoreShapeForce: 0.05,
    restoreShapePeriod: 0.25,
    restoreShapePower: 80,
    constraintConfig: { stiffness: 0.1 / 10 },
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getCurrent(config: Config) {
  // Mutable state.
  return {
    time: (Date.now() / 1000) as Seconds,
    dt: 0,
    tick: 0,
    points: [] as VerletPoint[],
    constraints: [] as VerletConstraint[],
    grid: createGrid(config),
    pointToConstraints: new Map(),
    verletSystem: createVerletSystem({
      min: [0, 0],
      max: [innerWidth, innerHeight],
    }),
    currMouseX: null as CssPixels | null,
    currMouseY: null as CssPixels | null,
    prevMouseX: null as CssPixels | null,
    prevMouseY: null as CssPixels | null,
  };
}

{
  const config = getConfig();
  const current = getCurrent(config);
  setupWebs(config, current);

  (window as any).current = current;

  setupMouseMove(config, current);

  window.addEventListener("resize", () => {
    current.grid = createGrid(config);
  });

  loop(time => {
    try {
      current.dt = Math.min(time - current.time, 100);
      current.time = time;
      current.tick++;

      current.grid.update(current.points);
      updateVerlet(config, current);
      updateMouseForces(config, current);
      updateRestoreShape(config, current);

      drawClearScreen(config);
      drawConstraints(config, current);
      drawPoints(config, current);
      // drawTriangles(config, current);
    } catch (error) {
      document.body.style.cursor = "default";
      throw error;
    }
  });
}

function setupWebs(config: Config, current: Current): void {
  const {
    webPointCount,
    webRadiusRatio,
    webSpinTimes,
    webInitialShrinking,
  } = config;
  const { points } = current;
  const midPointX = innerWidth / 2;
  const midPointY = innerHeight / 2;
  const radius = Math.min(midPointX, midPointY) * webRadiusRatio;
  const radiusStep = radius / webPointCount;
  const thetaStep = (TAU * webSpinTimes) / webPointCount;

  let prevPoint = createPoint({ position: [midPointX, midPointY] });
  points.push(prevPoint);
  for (const i of range(1, webPointCount)) {
    const nextPoint = createPoint({
      position: [
        midPointX + Math.cos(thetaStep * i) * radiusStep * i,
        midPointY + Math.sin(thetaStep * i) * radiusStep * i,
      ],
    });
    points.push(nextPoint);
    addConstraintToSystem(config, current, prevPoint, nextPoint);
    prevPoint = nextPoint;
  }

  // Shrink it all so that it provides a bit of initial movement
  for (const constraint of current.constraints) {
    constraint.restingDistance *= webInitialShrinking;
  }
}

const _force: Tuple2 = [0, 0];
function updateRestoreShape(config: Config, current: Current): void {
  const {
    webPointCount,
    webRadiusRatio,
    webSpinTimes,
    restoreShapeForce,
    restoreShapePeriod,
    restoreShapePower,
  } = config;
  const { time, points } = current;

  const periodScalar = Math.pow(
    Math.sin(time * restoreShapePeriod),
    restoreShapePower
  );
  if (periodScalar < 0.05) {
    return;
  }
  const midPointX = innerWidth / 2;
  const midPointY = innerHeight / 2;
  const radius = Math.min(midPointX, midPointY) * webRadiusRatio;
  const radiusStep = radius / webPointCount;
  const thetaStep = (TAU * webSpinTimes) / webPointCount;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const targetX = midPointX + Math.cos(thetaStep * i) * radiusStep * i;
    const targetY = midPointY + Math.sin(thetaStep * i) * radiusStep * i;
    _force[0] =
      (targetX - point.position[0]) * restoreShapeForce * periodScalar;
    _force[1] =
      (targetY - point.position[1]) * restoreShapeForce * periodScalar;
    point.addForce(_force);
  }
}

function setupMouseMove(config: Config, current: Current): void {
  function setPrev(): void {
    current.prevMouseX = current.currMouseX;
    current.prevMouseY = current.currMouseY;
  }

  function stopMouseTracking(): void {
    current.prevMouseX = null;
    current.prevMouseY = null;
    current.currMouseX = null;
    current.currMouseY = null;
  }

  window.addEventListener("touchend", stopMouseTracking);
  window.addEventListener("mouseout", stopMouseTracking);

  window.addEventListener("touchmove", event => {
    const { pageX, pageY } = event.touches[0];
    setPrev();
    current.currMouseX = pageX;
    current.currMouseY = pageY;
  });

  window.addEventListener("mousemove", event => {
    setPrev();
    current.currMouseX = event.pageX;
    current.currMouseY = event.pageY;
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

  function update(points: Iterable<VerletPoint>): void {
    for (const point of points) {
      updateItem(point, point.position[0], point.position[1]);
    }
  }

  function removeItem(item: VerletPoint): void {
    const coord = itemToCoordinate.get(item);
    if (!coord) {
      throw new Error("Could not find that item in the grid to remove.");
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
    let coord = itemToCoordinate.get(item);
    if (!coord) {
      updateItem(item, item.position[0], item.position[1]);
    }
    coord = itemToCoordinate.get(item);
    if (!coord) {
      throw new Error(
        "Could not find the item's coordinate when getting the neighbors."
      );
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

const _mousePoint = createPoint({ position: [0, 0] });
const _forcePoint: Tuple2 = [0, 0];

function updateMouseForces(config: Config, current: Current): void {
  const { mouseForce } = config;
  const { grid, currMouseX, currMouseY, prevMouseX, prevMouseY } = current;
  if (
    currMouseX === null ||
    currMouseY === null ||
    prevMouseX === null ||
    prevMouseY === null
  ) {
    return;
  }
  _mousePoint.position[0] = currMouseX;
  _mousePoint.position[1] = currMouseY;

  const neighbor = grid.getNearestNeighbor(_mousePoint);
  if (!neighbor) {
    return;
  }
  _forcePoint[0] = (currMouseX - prevMouseX) * mouseForce;
  _forcePoint[1] = (currMouseY - prevMouseY) * mouseForce;
  neighbor.addForce(_forcePoint);
}

function updateVerlet(config: Config, current: Current): void {
  const { verletSystem, points, constraints, dt } = current;

  // Update the size of the simulation.
  const max = verletSystem.max;
  if (max) {
    max[0] = innerWidth;
    max[1] = innerHeight;
  }

  // Solve the system.
  verletSystem.integrate(points, dt);
  for (const constraint of constraints) {
    constraint.solve();
  }
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

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function addConstraintToSystem(
  config: Config,
  current: Current,
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

function insertIntoList<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  let list = map.get(key);
  if (!list) {
    list = [];
    map.set(key, list);
  }
  list.push(value);
}
