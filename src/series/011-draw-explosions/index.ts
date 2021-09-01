import Simplex from "simplex-noise";
import setupRandom from "@tatumcreative/random";
import initializeShortcuts from "../lib/shortcuts";
import { setupCanvas, loop, generateSeed } from "../lib/draw";
import { setupCurveDrawing, Curve } from "../lib/curve-drawing";
import createVerletSystem from "verlet-system";
import ease from "eases/cubic-in-out";
import lerp from "lerp";

type Config = ReturnType<typeof getConfig>;
type Current = ReturnType<typeof getCurrent>;

type Entity = {
  index: number;
  x: number;
  y: number;
  theta: number;
  speed: number;
  age: number;
};

{
  const config = getConfig();
  const current = getCurrent(config);

  (window as any).current = current;

  loop(now => {
    current.dt = Math.min(now - current.time, 100);
    current.time = now;
    current.color = `hsl(${60 + current.time * 20}, 100%, 50%)`;

    config.ctx.fillStyle = "#00000005";
    config.ctx.fillRect(0, 0, innerWidth, innerHeight);

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
    maxAge: 150,
    entityInitialSpeed: 10,
    entitySpeedDecay: 0.98,
    rotationSpeed: 0.005,
    entityPerSegment: 100,
    entityJitter: 0,
    entitySize: 5,
    entityThetaJitter: 0.2,
    textFadeInSpeed: 0.02,
    textFadeOutSpeed: 0.02,
    pointsPerDistance: 5,
    gravitySimplexScale: 1,
    gravityDistance: 100,
    constraintConfig: { stiffness: 0.1 },
    inProgressSimplexSpeed: 1,
    inProgressSimplexScale: 5,
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
    textFadeIn: 0,
    verletSystem: createVerletSystem({
      min: [0, 0],
      max: [innerWidth, innerHeight],
    }),
    color: "",
    curveDrawing,
    nothingDrawnYet: true,
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
        theta,
        speed: entityInitialSpeed,
        age: random(minAge, maxAge),
      });
    }
  }
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
  } = config;
  const {
    time,
    curveDrawing: { points },
  } = current;

  if (points.length) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 10;
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
  const { ctx, entitySize } = config;
  const { entities } = current;

  ctx.lineWidth = 2;
  ctx.strokeStyle = current.color;

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

function updateEntities(config: Config, current: Current): void {
  const { entities } = current;
  const {
    simplex3,
    maxAge,
    rotationSpeed,
    entityJitter,
    entitySpeedDecay,
  } = config;

  for (const entity of entities) {
    entity.age++;

    if (entity.age > maxAge) {
      entities.delete(entity);
      continue;
    }

    const y =
      (entityJitter * entity.index) / entities.size + current.time * 0.2;

    const spinTheta =
      Math.PI * simplex3(entity.x * rotationSpeed, entity.y * rotationSpeed, y);
    entity.theta = lerp(
      entity.theta,
      spinTheta,
      Math.pow(entity.age / maxAge, 2)
    );

    // Apply the speed.
    entity.x += Math.cos(entity.theta) * entity.speed;
    entity.y += Math.sin(entity.theta) * entity.speed;

    entity.speed *= entitySpeedDecay;
  }
}
