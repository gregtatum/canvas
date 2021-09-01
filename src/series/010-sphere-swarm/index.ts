import Simplex from "simplex-noise";
import setupRandom from "@tatumcreative/random";
import initializeShortcuts from "../lib/shortcuts";
import { setupCanvas, loop, generateSeed } from "../lib/draw";

const TAU = Math.PI * 2;

type Config = ReturnType<typeof getConfig>;
type Current = ReturnType<typeof getCurrent>;

type Entity = {
  index: number;
  x: number;
  y: number;
  theta: number;
  speed: number;
  life: number;
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
    rotationSpeed: 0.005,
    entityCount: 2000,
    entitySize: 20,
    entityJitter: 0.0,
    speedRange: [1.5, 2.5],
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
  const { simplex3, rotationSpeed, entityJitter } = config;

  for (const entity of entities) {
    entity.life++;

    const radius = Math.min(innerWidth, innerHeight) * 0.45;
    entity.x -= innerWidth / 2;
    entity.y -= innerHeight / 2;
    if (entity.x * entity.x + entity.y * entity.y > radius * radius) {
      const theta = Math.random() * Math.PI * 2;
      entity.x = Math.cos(theta) * radius;
      entity.y = Math.sin(theta) * radius;
      entity.life = 0;
    }
    entity.x += innerWidth / 2;
    entity.y += innerHeight / 2;

    const y =
      (entityJitter * entity.index) / entities.length + current.time * 0.2;

    entity.theta =
      Math.PI * simplex3(entity.x * rotationSpeed, entity.y * rotationSpeed, y);

    // Apply the speed.
    entity.x += Math.cos(entity.theta) * entity.speed;
    entity.y += Math.sin(entity.theta) * entity.speed;
  }
}

function generateEntities(config: Config): Entity[] {
  const { entityCount, speedRange, random } = config;
  const entities: Entity[] = [];

  for (let i = 0; i < entityCount; i++) {
    entities.push({
      index: i,
      x: random(innerWidth),
      y: random(innerHeight),
      theta: random(TAU),
      speed: random(speedRange[0], speedRange[1]),
      life: 0,
    });
  }

  return entities;
}

function draw(config: Config, current: Current): void {
  const { ctx, entitySize } = config;
  const { entities } = current;

  // Clear out background.
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  ctx.lineWidth = 4;
  ctx.strokeStyle = "#fff";

  // Draw each entity
  ctx.beginPath();
  const halfSize = entitySize / 2;
  for (const { x, y, theta, life } of entities) {
    if (life < 2) {
      continue;
    }
    const dx = Math.cos(theta) * halfSize;
    const dy = Math.sin(theta) * halfSize;

    ctx.moveTo(x - dx, y - dy);
    ctx.lineTo(x + dx, y + dy);
  }
  ctx.stroke();
}
