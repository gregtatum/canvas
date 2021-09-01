import Simplex from "simplex-noise";
import setupRandom from "@tatumcreative/random";
import initializeShortcuts from "lib/shortcuts";
import { setupCanvas, loop, generateSeed } from "lib/draw";
import { setupCurveDrawing, Curve } from "lib/curve-drawing";
import createVerletSystem from "verlet-system";
import ease from "eases/cubic-in-out";
import lerp from "lerp";

type Config = ReturnType<typeof getConfig>;
type Current = ReturnType<typeof getCurrent>;

type Entity = {
  index: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  theta: number;
  speed: number;
  age: number;
  scale: number;
};

{
  const config = getConfig();
  const current = getCurrent(config);

  (window as any).current = current;

  loop(now => {
    current.dt = Math.min(now - current.time, 100);
    current.time = now;
    current.color = `hsl(${60 +
      current.time * config.hueScale * current.hueDirection}, 100%, 50%)`;

    if (current.curveDrawing.points.length > 0) {
      // Fade out quickly.
      config.ctx.fillStyle = "#00000010";
      config.ctx.fillRect(0, 0, innerWidth, innerHeight);
    } else if (current.entities.size > current.lastDrawnEntitiesCount * 0.75) {
      // Fade out slowly
      config.ctx.fillStyle = "#00000002";
      config.ctx.fillRect(0, 0, innerWidth, innerHeight);
    }

    drawIntroText(config, current);
    drawInProgressDrawing(config, current);

    updateEntities(config, current);
    drawEntities(config, current);
  });
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
    minAge: 20,
    maxAge: 250,
    entityInitialSpeed: 0.2,
    entitySpeedDecay: 0.98,
    rotationSpeed: 0.005,
    entityPerSegment: 10,
    entitySize: 10,
    entityThetaJitter: 0.2,
    entityDivideChance: 0.02,
    entityDivideSlowdown: 0.8,
    textFadeInSpeed: 0.02,
    textFadeOutSpeed: 0.02,
    pointsPerDistance: 5,
    gravity: -0.01,
    hueScale: 35,
    inProgressSimplexSpeed: 2,
    inProgressSimplexScale: 10,
    inProgressLineWidth: 2,
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getCurrent(config: Config) {
  const curveDrawing: ReturnType<typeof setupCurveDrawing> = setupCurveDrawing({
    pointsPerDistance: config.pointsPerDistance,
    drawingTarget: document.body,
    onCurveDrawn: curve => addNewCurve(config, current, curve),
  });

  // Mutable state.
  const current = {
    time: Date.now() / 1000,
    dt: 0,
    entities: new Set() as Set<Entity>,
    lastDrawnEntitiesCount: 0,
    textFadeIn: 0,
    verletSystem: createVerletSystem({
      min: [0, 0],
      max: [innerWidth, innerHeight],
    }),
    color: "",
    curveDrawing,
    nothingDrawnYet: true,
    hueDirection: 1,
  };

  return current;
}

function drawIntroText(config: Config, current: Current): void {
  const { ctx } = config;
  const { curveDrawing } = current;

  if (curveDrawing.points.length > 0) {
    current.nothingDrawnYet = false;
  }
  if (current.nothingDrawnYet) {
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
    ctx.fillText("Draw on the screen", innerWidth / 2, innerHeight / 2);
  }
}

function addNewCurve(config: Config, current: Current, curve: Curve): void {
  const {
    random,
    minAge,
    maxAge,
    entityInitialSpeed,
    entityPerSegment,
    entityThetaJitter,
  } = config;
  const { entities } = current;
  const line = [curve.line[0]];

  // Don't allow points to share the same space. Not sure why this is happening,
  // but I should probably fix it.
  for (let i = 1; i < curve.line.length; i++) {
    const p0 = curve.line[i - 1];
    const p1 = curve.line[i];
    if (p0.x !== p1.x && p0.y !== p1.y) {
      line.push(p1);
    }
  }

  let index = 0;
  for (let i = 1; i < line.length; i++) {
    const p0 = line[i - 1];
    const p1 = line[i];
    const scale = Math.sin(((i - 1) / (line.length - 2)) * Math.PI);

    for (let j = 0; j < entityPerSegment; j++) {
      const t = j / entityPerSegment;

      // Orient the entity perpendicular to the curve.
      let theta =
        // Compute the angle of the line.
        Math.atan2(p1.y - p0.y, p1.x - p0.x) +
        // Rotate it 90º
        Math.PI * 0.5 +
        random(entityThetaJitter);

      if (random() > 0.5) {
        theta += Math.PI;
      }

      entities.add({
        index: index++,
        x: lerp(p0.x, p1.x, t),
        y: lerp(p0.y, p1.y, t),
        dx: Math.cos(theta) * entityInitialSpeed,
        dy: Math.sin(theta) * entityInitialSpeed,
        theta,
        speed: entityInitialSpeed,
        age: random(minAge, maxAge),
        scale,
      });
    }
  }
  current.lastDrawnEntitiesCount = entities.size;
}

// function getPerpendicularUnitVector(pointA: Vec2, pointB: Vec2): Vec2 {
//   const dx = pointA.x - pointB.x;
//   const dy = pointA.y - pointB.y;
//   const length = Math.sqrt(dx * dx + dy * dy);
//   return { x: dy / length, y: -dx / length };
// }

function drawInProgressDrawing(config: Config, current: Current): void {
  const {
    ctx,
    simplex3,
    inProgressSimplexSpeed,
    inProgressSimplexScale,
    inProgressLineWidth,
  } = config;
  const {
    time,
    curveDrawing: { points },
  } = current;

  if (points.length) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = inProgressLineWidth;
    ctx.beginPath();
    ctx.strokeStyle = current.color;
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

function drawEntities(config: Config, current: Current): void {
  const { ctx, maxAge } = config;
  const { entities } = current;

  ctx.fillStyle = current.color;

  // Draw each entity
  for (const { x, y, age, scale } of entities) {
    const entitySize = scale * config.entitySize * ((maxAge - age) / maxAge);
    const halfSize = entitySize / 2;
    ctx.fillRect(x - halfSize, y - halfSize, entitySize, entitySize);
  }
}

function updateEntities(config: Config, current: Current): void {
  const { entities } = current;
  const {
    maxAge,
    random,
    gravity,
    entityDivideChance,
    entityDivideSlowdown,
  } = config;

  for (const entity of entities) {
    entity.age++;

    if (entity.age > maxAge) {
      entities.delete(entity);
      if (entities.size === 0) {
        current.hueDirection *= -1;
      }
      continue;
    }

    // Apply the speed.
    entity.dx += random(-entity.speed, entity.speed);
    entity.dy += random(-entity.speed, entity.speed) - gravity;

    entity.x += entity.dx * entity.scale;
    entity.y += entity.dy * entity.scale;

    if (Math.random() < entityDivideChance) {
      entity.dx *= entityDivideSlowdown;
      entity.dy *= entityDivideSlowdown;
      entities.add({ ...entity });
    }
  }
}
