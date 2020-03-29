import Simplex from "simplex-noise";
import setupRandom from "@tatumcreative/random";
import initializeShortcuts from "../lib/shortcuts";
import { setupCanvas, loop, generateSeed } from "../lib/draw";
import createRtree, { RTree } from "rtree";
import ease from "eases/sine-in-out";
const TAU = Math.PI * 2;

type Config = ReturnType<typeof getConfig>;
type Current = ReturnType<typeof getCurrent>;

type Food = {
  maxQuantity: number;
  quantity: number;
  x: number;
  y: number;
  growthRate: number;
};

type Entity = {
  index: Index;
  x: CssPixels;
  y: CssPixels;
  food: Scalar;
  theta: Radian;
  speed: number;
};

{
  const config = getConfig();
  const current = getCurrent(config);

  loop(now => {
    current.dt = now - current.time;
    current.time = now;
    updateFoods(config, current);
    updateEntities(config, current);
    draw(config, current);
  });

  window.addEventListener("resize", () => {
    current.rtree = createRtree();
    for (const food of current.foods) {
      food.x = config.random() * innerWidth;
      food.y = config.random() * innerHeight;
    }
    addFoodsToRtree(current.foods, current.rtree);
  });

  (window as any).current = current;
  (window as any).config = config;
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
    entityRotation: 0.5,
    entityCount: 200,
    entitySize: 10,
    baseEntitySpeed: 2,
    baseEntityFood: 10,
    minSpeed: 1,
    maxSpeed: 5,
    foodCount: 300,
    minGrowthRate: 0.1,
    maxGrowthRate: 0.5,
    minQuantity: 20,
    maxQuantity: 200,
    foodSize: 0.5,
    foodSteps: 4,
    searchRadius: 100,
    minFeedQuantity: 5,
    entitySlowDown: 0.5,
    entitySpeedUp: 0.01,
    feedRate: 0.7,
    quantityDistribution: 500,
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getCurrent(config: Config) {
  const rtree: RTree<Food> = createRtree();

  // Mutable state.
  return {
    rtree,
    entities: generateEntities(config),
    foods: generateFood(config, rtree),
    time: Date.now(),
    dt: 0,
  };
}

function updateFoods(config: Config, current: Current): void {
  for (const food of current.foods) {
    food.quantity = Math.min(food.quantity + food.growthRate, food.maxQuantity);
  }
}

function updateEntities(config: Config, current: Current): void {
  const { entities, rtree } = current;
  const {
    entitySize,
    maxSpeed,
    simplex3,
    entityRotation,
    searchRadius,
    minFeedQuantity,
    entitySlowDown,
    entitySpeedUp,
    feedRate,
    minSpeed,
  } = config;

  for (const entity of entities) {
    const { x, y } = entity;

    const nearbyFoods = rtree.bbox(
      x - searchRadius,
      y - searchRadius,
      x + searchRadius,
      y + searchRadius
    );

    let food;
    let distSq = 0;
    if (nearbyFoods.length > 0) {
      // Look for the closest food with the most quantity.
      let oldFood;
      let oldDistSq = 0;

      for (const newFood of nearbyFoods) {
        if (newFood.quantity < minFeedQuantity) {
          // There's not enough food here to eat, leave it.
          continue;
        }

        // Compute the distance squared.
        const dx = x - newFood.x;
        const dy = y - newFood.y;
        const newDistSq = dx * dx + dy * dy;

        if (!oldFood) {
          // No old food was found, go to this one.
          oldFood = newFood;
          oldDistSq = newDistSq;
          continue;
        }

        // Go to the food that is closest with the most quantity.
        if (newDistSq / newFood.quantity < oldDistSq / oldFood.quantity) {
          oldFood = newFood;
        }
      }
      food = oldFood;
      distSq = oldDistSq;
    }

    let thetaTarget;
    if (food && food.quantity > 10) {
      thetaTarget = Math.atan2(entity.y - food.y, entity.x - food.x);
      entity.speed /= 1 + (entitySlowDown * food.quantity) / distSq;
      food.quantity -= feedRate;
    } else {
      entity.speed *= 1 + entitySpeedUp;
      entity.speed = Math.max(minSpeed, entity.speed);
      // Just wander.
      thetaTarget =
        Math.PI *
        simplex3(
          entity.x * entityRotation,
          entity.y * entityRotation,
          entity.index
        );
    }
    entity.theta = buggyLerpTheta(entity.theta, thetaTarget, 0.1);

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

function generateEntities(config: Config): Entity[] {
  const { entityCount, baseEntitySpeed, baseEntityFood, random } = config;
  const entities = [];

  for (let i = 0; i < entityCount; i++) {
    entities.push({
      index: i,
      x: ((ease(random(1, 0)) + 0.5) % 1) * innerWidth,
      y: random(innerHeight),
      food: baseEntityFood,
      theta: random(TAU),
      speed: baseEntitySpeed,
    });
  }

  return entities;
}

function draw(config: Config, current: Current): void {
  const { ctx, entitySize, foodSize, foodSteps } = config;
  const { entities, foods } = current;

  // Clear out background.
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  // Draw the foods
  ctx.fillStyle = "#07f6";
  for (const { quantity, x, y } of foods) {
    const foodWidth = quantity * foodSize;
    for (let i = 1; i <= foodSteps; i++) {
      const widthStepped = foodWidth * Math.pow(i / foodSteps, 2);
      ctx.fillRect(
        x - widthStepped * 0.5,
        y - widthStepped * 0.5,
        widthStepped,
        widthStepped
      );
    }
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#fff";

  // Draw each entity
  ctx.beginPath();
  const size = entitySize;
  for (const { x, y, theta } of entities) {
    const dx = Math.cos(theta) * size;
    const dy = Math.sin(theta) * size;

    ctx.moveTo(x, y);
    ctx.lineTo(x - dx, y - dy);
  }
  ctx.stroke();
}

function generateFood(config: Config, rtree: RTree<Food>): Food[] {
  const {
    minQuantity,
    maxQuantity,
    minGrowthRate,
    maxGrowthRate,
    quantityDistribution,
    random,
    foodCount,
    simplex3,
  } = config;

  const foods = [];
  for (let foodIndex = 0; foodIndex < foodCount; foodIndex++) {
    const x = random() * innerWidth;
    const y = random() * innerHeight;
    const max =
      minQuantity +
      (maxQuantity - minQuantity) *
        (simplex3(x / quantityDistribution, y / quantityDistribution, 0) * 0.5 +
          0.5);
    foods.push({
      maxQuantity: max,
      quantity: random() * max,
      x,
      y,
      growthRate: random(minGrowthRate, maxGrowthRate),
    });
  }
  addFoodsToRtree(foods, rtree);
  return foods;
}

function addFoodsToRtree(foods: Food[], rtree: RTree<Food>): void {
  for (const food of foods) {
    const w = 1;
    rtree.insert(
      {
        x: food.x - w / 2,
        y: food.y - w / 2,
        w: w,
        h: w,
      },
      food
    );
  }
}

import lerp from "lerp";

/**
 * Funny story, this is a buggy version I accidentally introduced, but liked
 * the result in the visualization, so here it stays. I accidentally set TAU
 * to PI.
 */
function buggyLerpTheta(a: number, b: number, t: number): number {
  // Transform a and b to be between 0 and TAU. The first modulo operation could
  // result in a negative number, the second ensures it's positive.
  a = ((a % Math.PI) + Math.PI) % Math.PI;
  b = ((b % Math.PI) + Math.PI) % Math.PI;

  if (b - a > Math.PI) {
    a += Math.PI;
  }
  return lerp(a, b, t);
}

module.exports = {
  buggyLerpTheta,
};
