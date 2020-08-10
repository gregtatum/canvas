import initializeShortcuts from "../lib/shortcuts";
import { setupCanvas, loop, generateSeed } from "../lib/draw";
import * as Physics from "../lib/physics";
import setupRandom from "@tatumcreative/random";
import lerp from "lerp";

type Config = ReturnType<typeof getConfig>;
type Current = ReturnType<typeof getCurrent>;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getConfig() {
  const seed = generateSeed();
  const random = setupRandom(seed);
  const ctx = setupCanvas();

  initializeShortcuts(seed);

  return {
    ctx,
    seed,
    random,
    debugDrawSpheres: false,
    gravity: { x: 100, y: 0 },
    pointGenerationPerSecond: 100,
    sphereCount: 60,
    ticksPerSecond: 60,
    sphereSize: [innerWidth * 0.01, innerWidth * 0.2],
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getCurrent(config: Config) {
  const world = Physics.create.world({
    gravity: config.gravity,
    ticksPerSecond: config.ticksPerSecond,
  });

  addSpheres(config, world);

  return {
    time: 0,
    dt: 0,
    tick: 0,
    world,
    timeElapsedSinceLastPointGeneration: 0,
    points: new Set() as Set<Physics.Point>,
  };
}

{
  const config = getConfig();
  const current = getCurrent(config);
  (window as any).current = current;

  loop((time, dt) => {
    current.dt = dt;
    current.time = time;
    current.tick++;

    generateNewPoints(config, current);
    killPointsOffscreen(current);

    current.world.integrate(dt);

    clearScreen(config);
    drawWorld(config, current);
    config.ctx.font = "20px sans-serif";
    config.ctx.fillText(String(current.world.entities.size), 10, 30);
  });
}

function addSpheres(config: Config, world: Physics.World): void {
  const { random, sphereCount, sphereSize } = config;
  const spheres: Set<Physics.Sphere> = new Set();
  for (let i = 0; i < sphereCount; i++) {
    let sphere, intersection;
    do {
      const xFactor = 1 - Math.pow(random(), 2);
      const position = {
        x: xFactor * innerWidth,
        y: random(innerHeight),
      };
      const radius =
        random(sphereSize[0], sphereSize[1]) * lerp(0.3, 1, xFactor);
      sphere = Physics.create.sphere(position, radius);
      intersection = Physics.findSingleIntersection(sphere, spheres);
    } while (intersection);
    sphere.body.fixedPosition = true;
    sphere.body.friction = 0.9;
    spheres.add(sphere);
    world.addToOneWayGroup(sphere, "to");
  }
}

function clearScreen(config: Config): void {
  const { ctx } = config;
  ctx.fillStyle = "#00000005";
  ctx.fillRect(0, 0, innerWidth, innerHeight);
}

function generateNewPoints(config: Config, current: Current): void {
  const { random, pointGenerationPerSecond } = config;
  const { dt, points, world } = current;

  current.timeElapsedSinceLastPointGeneration += dt;
  const pointsToGenerateFloat =
    current.timeElapsedSinceLastPointGeneration * pointGenerationPerSecond;
  const pointsToGenerate = Math.floor(pointsToGenerateFloat);

  current.timeElapsedSinceLastPointGeneration =
    (pointsToGenerateFloat - pointsToGenerate) / pointGenerationPerSecond;

  for (let i = 0; i < pointsToGenerate; i++) {
    const point = Physics.create.point({
      x: 0,
      y: random(innerHeight),
    });
    world.addToOneWayGroup(point, "from");
    points.add(point);
  }
}

const prevPositionMap: Map<Physics.Entity, Vec2> = new Map();
function drawWorld(config: Config, current: Current): void {
  const { world } = current;
  const { ctx } = config;
  ctx.strokeStyle = `hsl(200, 100%, 50%)`;
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (const entity of world.entities) {
    if (entity.type === "point") {
      const { position } = entity.body;
      let prevPosition = prevPositionMap.get(entity);
      if (!prevPosition) {
        prevPosition = Physics.vec2.clone(position);
        prevPositionMap.set(entity, prevPosition);
      }
      ctx.moveTo(prevPosition.x, prevPosition.y);
      ctx.lineTo(position.x, position.y);
      prevPosition.x = position.x;
      prevPosition.y = position.y;
    }
  }
  ctx.stroke();

  if (config.debugDrawSpheres) {
    ctx.fillStyle = "#333";
    ctx.beginPath();
    for (const entity of world.entities) {
      if (entity.type === "sphere") {
        const {
          body: { position },
          radius,
        } = entity;
        ctx.moveTo(position.x + radius, position.y);
        ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }
}

function killPointsOffscreen(current: Current): void {
  const { points, world } = current;
  for (const point of points) {
    const { position } = point.body;
    if (
      position.x < 0 ||
      position.x > innerWidth ||
      position.y < 0 ||
      position.y > innerHeight
    ) {
      points.delete(point);
      world.delete(point);
    }
  }
}
