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
    baseSphereSpeed: 30,
    baseSphereAngularVelocity: 0.1,
    ticksPerSecond: 60,
    sphereCount: 500,
    sphereSizes: [2, 100],
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getCurrent(config: Config) {
  const world = Physics.create.world({
    ticksPerSecond: config.ticksPerSecond,
  });

  return {
    time: 0,
    dt: 0,
    tick: 0,
    world,
    spheres: createSpheres(config, world),
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

    current.world.integrate(dt);

    for (const { body } of current.spheres) {
      const keepInBoundsForce = 0.1;
      if (body.position.x < 0) {
        Physics.vec2.reflect(body.velocity, Physics.vec2.create(1, 0));
        body.velocity.x += keepInBoundsForce;
      } else if (body.position.y < 0) {
        Physics.vec2.reflect(body.velocity, Physics.vec2.create(0, 1));
        body.velocity.y += keepInBoundsForce;
      } else if (body.position.y > innerHeight) {
        Physics.vec2.reflect(body.velocity, Physics.vec2.create(0, -1));
        body.velocity.y -= keepInBoundsForce;
      } else if (body.position.x > innerWidth) {
        Physics.vec2.reflect(body.velocity, Physics.vec2.create(-1, 0));
        body.velocity.x -= keepInBoundsForce;
      }
      // Add some energy to the system
      if (Math.random() < 0.5) {
        Physics.vec2.multiplyScalar(body.velocity, 2);
      }
    }

    clearScreen(config);
    drawWorld(config, current);
  });
}

function createSpheres(
  config: Config,
  world: Physics.World
): Set<Physics.Sphere> {
  const {
    random,
    sphereCount,
    sphereSizes,
    baseSphereSpeed,
    baseSphereAngularVelocity,
  } = config;
  const spheres: Set<Physics.Sphere> = new Set();
  for (let i = 0; i < sphereCount; i++) {
    let sphere, intersection;

    do {
      const position = {
        x: random(innerWidth),
        y: random(innerHeight),
      };
      const [min, max] = sphereSizes;
      const radius = Math.pow(random(), 4) * (max - min) + min;
      sphere = Physics.create.sphere(position, radius);
      sphere.body.mass = Math.PI * radius * radius;
      intersection = Physics.findSingleIntersection(sphere, spheres);
    } while (intersection);
    const { body } = sphere;

    body.fixedPosition = true;
    body.friction = 0.9;
    body.velocity.x = random(-baseSphereSpeed, baseSphereSpeed);
    body.velocity.y = random(-baseSphereSpeed, baseSphereSpeed);
    body.rotation = random(-Math.PI, Math.PI);
    body.angularVelocity = random(baseSphereAngularVelocity);
    body.restitution = 1;
    spheres.add(sphere);
    world.addToAllGroup(sphere);
  }
  return spheres;
}

function clearScreen(config: Config): void {
  const { ctx } = config;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, innerWidth, innerHeight);
}

function drawWorld(config: Config, current: Current): void {
  const { world } = current;
  const { ctx } = config;
  ctx.strokeStyle = `hsl(100, 100%, 50%)`;
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.lineCap = "square";
  for (const entity of world.entities) {
    if (entity.type === "sphere") {
      const {
        radius,
        body: { position, rotation },
      } = entity;
      ctx.moveTo(position.x, position.y);
      ctx.arc(
        position.x,
        position.y,
        radius,
        rotation,
        rotation + Math.PI * 1.8
      );
    }
  }
  ctx.stroke();
}
