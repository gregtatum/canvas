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
    margin: 0.25,
    baseSphereSpeed: 30,
    baseSphereAngularVelocity: 0.1,
    /** Determines the Math.pow value to distribute sphere sizes */
    gravity: 3,
    sphereDistributionPower: 5,
    keepInBoundsImpulse: 2,
    ticksPerSecond: 60,
    sphereCount: 500,
    restitution: 0.7,
    /** Create spheres sized according to a ratio of the diagonal of the screen */
    sphereSizes: [0.001, 0.08],
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getCurrent(config: Config) {
  const world = Physics.create.world({
    ticksPerSecond: config.ticksPerSecond,
    gravity: Physics.vec2.create(0, config.gravity),
  });

  return {
    time: 0,
    dt: 0,
    tick: 0,
    world,
    mouseX: null as number | null,
    mouseY: null as number | null,
    spheres: createSpheres(config, world),
  };
}

function setupMouseHandlers(current: Current): void {
  window.addEventListener("touchmove", event => {
    const { pageX, pageY } = event.touches[0];
    current.mouseX = pageX;
    current.mouseY = pageY;
  });

  window.addEventListener("mousemove", event => {
    current.mouseX = event.pageX;
    current.mouseY = event.pasgeY;
  });
}

{
  const config = getConfig();
  const current = getCurrent(config);
  (window as any).current = current;
  setupMouseHandlers(current);

  loop((time, dt) => {
    current.dt = dt;
    current.time = time;
    current.tick++;

    current.world.integrate(dt);

    const { margin, keepInBoundsImpulse } = config;
    const { mouseX, mouseY } = current;
    const forceX = 0.3 * (mouseX ? mouseX - innerWidth / 2 : 0);
    const forceY = 0.3 * (mouseY ? mouseY - innerHeight / 2 : 0);
    const left = forceX + innerWidth * margin;
    const right = forceX + innerWidth * (1 - margin);
    const bottom = forceY + innerHeight * (1 - margin);
    const top = forceY + innerHeight * margin;

    for (const { body } of current.spheres) {
      if (body.position.x < left) {
        // Physics.vec2.reflect(body.velocity, Physics.vec2.create(1, 0));
        body.velocity.x += keepInBoundsImpulse;
      } else if (body.position.y < top) {
        // Physics.vec2.reflect(body.velocity, Physics.vec2.create(0, 1));
        body.velocity.y += keepInBoundsImpulse;
      } else if (body.position.y > bottom) {
        // Physics.vec2.reflect(body.velocity, Physics.vec2.create(0, -1));
        body.velocity.y -= keepInBoundsImpulse;
      } else if (body.position.x > right) {
        // Physics.vec2.reflect(body.velocity, Physics.vec2.create(-1, 0));
        body.velocity.x -= keepInBoundsImpulse;
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
    sphereDistributionPower,
    margin,
    restitution,
  } = config;
  const spheres: Set<Physics.Sphere> = new Set();
  for (let i = 0; i < sphereCount; i++) {
    let sphere, intersection;
    const screenDiameter = Math.sqrt(
      innerWidth * innerWidth + innerHeight * innerHeight
    );
    const min = sphereSizes[0] * screenDiameter;
    const max = sphereSizes[1] * screenDiameter;

    do {
      const position = {
        x: random(innerWidth * margin, innerWidth * (1 - margin)),
        y: random(innerHeight * margin, innerHeight * (1 - margin)),
      };

      const radius =
        Math.pow(random(), sphereDistributionPower) * (max - min) + min;
      sphere = Physics.create.sphere(position, radius);
      sphere.body.mass = Math.PI * radius * radius;
      intersection = Physics.findSingleIntersection(sphere, spheres);
    } while (intersection);
    const { body } = sphere;

    body.velocity.x = random(-baseSphereSpeed, baseSphereSpeed);
    body.velocity.y = random(-baseSphereSpeed, baseSphereSpeed);
    body.rotation = random(-Math.PI, Math.PI);
    body.angularVelocity = random(baseSphereAngularVelocity);
    body.restitution = restitution;
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
  const { world, time } = current;
  const { ctx } = config;
  ctx.strokeStyle = `hsl(${60 + time * 10}, 100%, 50%)`;
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
