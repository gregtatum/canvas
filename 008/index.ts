import initializeShortcuts from "../lib/shortcuts";
import { setupCanvas, loop, generateSeed } from "../lib/draw";
import * as Physics from "../lib/physics";
import setupRandom from "@tatumcreative/random";

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
    gravity: { x: 0, y: 200 },
    pointGenerationPerSecond: 100,
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getCurrent(config: Config) {
  const world = Physics.create.world({
    gravity: config.gravity,
    ticksPerSecond: 2000,
  });

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

    updatePointGeneration(config, current);
    killPointsOffscreen(current.points);

    current.world.integrate(dt);

    clearScreen(config);
    drawPoints(config, current);
  });
}

function clearScreen(config: Config): void {
  const { ctx } = config;
  ctx.fillStyle = "#0001";
  ctx.fillRect(0, 0, innerWidth, innerHeight);
}

function updatePointGeneration(config: Config, current: Current): void {
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
      x: random(innerWidth),
      y: random(innerHeight),
    });
    world.add(point);
    points.add(point);
  }
}

function drawPoints(config: Config, current: Current): void {
  const { points } = current;
  const { ctx } = config;
  ctx.fillStyle = "#0f0";
  const w = 4;
  for (const {
    position: { x, y },
  } of points) {
    ctx.fillRect(x - w, y - w, w, w);
  }
}

function killPointsOffscreen(points: Set<Physics.Point>): void {
  for (const point of points) {
    const { position } = point;
    if (
      position.x < 0 ||
      position.x > innerWidth ||
      position.y < 0 ||
      position.y > innerHeight
    ) {
      points.delete(point);
    }
  }
}
