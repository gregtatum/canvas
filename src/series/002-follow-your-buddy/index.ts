import Simplex from "simplex-noise";
import setupRandom from "@tatumcreative/random";
import initializeShortcuts from "lib/shortcuts";
import { setupCanvas, loop, generateSeed } from "lib/draw";
import { lerpTheta } from "lib/lerpTheta";

const TAU = Math.PI * 2;

type Config = ReturnType<typeof getConfig>;
type Current = ReturnType<typeof getCurrent>;

type Entity = {
  index: number;
  x: number;
  y: number;
  theta: number;
  speed: number;
  buddy: number | null;
};

{
  const config = getConfig();
  // Mutable state.
  const current = getCurrent(config);

  loop(now => {
    current.time = now;
    update(config, current);
    draw(config, current);
  });

  window.onhashchange = function(): void {
    location.reload();
  };
}

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
    lonelyRotation: 0.005,
    breakoutCount: 10,
    entityCount: 2000,
    entitySize: 10,
    baseSpeed: 2,
    maxSpeed: 5,
    rotateToBuddy: 0.1,
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getCurrent(config: Config) {
  return {
    time: 0,
    entities: generateEntities(config),
  };
}

function update(config: Config, current: Current): void {
  const { entities } = current;
  const { entitySize, maxSpeed, simplex3, lonelyRotation } = config;

  for (const entity of entities) {
    if (entity.buddy === null) {
      entity.theta =
        Math.PI *
        simplex3(
          entity.x * lonelyRotation,
          entity.y * lonelyRotation,
          entity.index
        );
    } else {
      applyBuddyForce(config, entity, entities[entity.buddy]);
    }

    entity.speed = Math.min(entity.speed, maxSpeed);

    // Apply the speed.
    entity.x += Math.cos(entity.theta) * entity.speed;
    entity.y += Math.sin(entity.theta) * entity.speed;

    // Keep the entities in range, but allow them to go off the screen. Using just
    // a modulo operation here means that they "jump" to the other side while still
    // on the screen.
    if (entity.x < -entitySize) {
      entity.x = innerWidth + entitySize;
    } else if (entity.x > innerWidth + entitySize) {
      entity.x = -entitySize;
    }
    if (entity.y < -entitySize) {
      entity.y = innerHeight + entitySize;
    } else if (entity.y > innerHeight + entitySize) {
      entity.y = -entitySize;
    }
  }
}

function applyBuddyForce(config: Config, entity: Entity, buddy: Entity): void {
  const { rotateToBuddy } = config;
  const dx = buddy.x - entity.x;
  const dy = buddy.y - entity.y;

  entity.theta =
    lerpTheta(entity.theta, Math.atan2(dy, dx), rotateToBuddy) % TAU;

  entity.speed += Math.min(1, 1 / (dx * dx + dy * dy));

  // Apply the speed.
  entity.x += Math.cos(entity.theta) * entity.speed;
  entity.y += Math.sin(entity.theta) * entity.speed;
}

function generateEntities(config: Config): Entity[] {
  const { entityCount, baseSpeed, random, breakoutCount } = config;
  const entities: Entity[] = [];

  for (let i = 0; i < entityCount; i++) {
    entities.push({
      index: i,
      x: random(innerWidth),
      y: random(innerHeight),
      theta: random(TAU),
      speed: baseSpeed,
      // Pick someone else random, but not yourself.
      buddy: (i + random(0, entityCount - 1, true)) % entityCount,
    });
  }

  // Create some "breakout" entities that don't follow anyone else.
  for (let i = 0; i < breakoutCount; i++) {
    // Pick the buddy of some other entity.
    const { buddy } = entities[random(0, entities.length, true)];
    if (buddy !== null) {
      // Set the entity that this one points to to null, that way it's ensured
      // that the lonely ones normally have at least one entity following them.
      // This should theoretically make them more interesting.
      entities[buddy].buddy = null;
    }
  }
  return entities;
}

function draw(config: Config, current: Current): void {
  const { ctx, entitySize } = config;
  const { entities } = current;

  // Clear out background.
  ctx.fillStyle = "#0003";
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#fff";

  // Draw each entity
  ctx.beginPath();
  const halfSize = entitySize / 2;
  for (const { x, y, theta } of entities) {
    const dx = Math.cos(theta) * halfSize;
    const dy = Math.sin(theta) * halfSize;

    ctx.moveTo(x - dx, y - dy);
    ctx.lineTo(x + dx, y + dy);
  }
  ctx.stroke();
}
