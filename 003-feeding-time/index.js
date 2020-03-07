const Simplex = require("simplex-noise");
const setupRandom = require("@tatumcreative/random");
const initializeShortcuts = require("../lib/shortcuts");
const { setupCanvas, loop, generateSeed, lerpTheta } = require("../lib/draw");
const createRtree = require("rtree");
const TAU = Math.PI * 2;
const lerp = require("lerp");

{
  const seed = generateSeed();
  const random = setupRandom(seed);
  const simplex = new Simplex(random);
  const simplex3 = simplex.noise3D.bind(simplex);
  const ctx = setupCanvas();

  initializeShortcuts(seed);

  const config = {
    ctx,
    seed,
    random,
    simplex3,
    rtree: createRtree(),
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
  };

  // Mutable state.
  const current = {
    entities: generateEntities(config),
    foods: generateFood(config),
    now: Date.now(),
    dt: 0,
  };

  loop(now => {
    current.dt = now - current.time;
    current.time = now;
    updateFoods(config, current);
    updateEntities(config, current);
    draw(config, current);
  });

  window.addEventListener("resize", () => {});

  window.current = current;
  window.config = config;
}

function updateFoods(config, current) {
  for (const food of current.foods) {
    food.quantity = Math.min(food.quantity + food.growthRate, food.maxQuantity);
  }
}

function updateEntities(config, current) {
  const { entities } = current;
  const {
    ctx,
    rtree,
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
  const { width, height } = ctx.canvas;

  for (const entity of entities) {
    const { x, y } = entity;

    const nearbyFoods = rtree.bbox(
      x - searchRadius,
      y - searchRadius,
      x + searchRadius,
      y + searchRadius
    );

    let food;
    let distSq;
    if (nearbyFoods.length > 0) {
      // Look for the closest food with the most quantity.
      let oldFood;
      let oldDistSq;

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
    entity.theta = lerpTheta(entity.theta, thetaTarget, 0.1);

    entity.speed = Math.min(entity.speed, maxSpeed);

    // Apply the speed.
    entity.x += Math.cos(entity.theta) * entity.speed;
    entity.y += Math.sin(entity.theta) * entity.speed;

    // Keep the entities in range, but allow them to go off the screen. Using just
    // a modulo operation here means that they "jump" to the other side while still
    // on the screen.
    if (entity.x < -entitySize) {
      entity.x = width + entitySize;
    } else if (entity.x > width + entitySize) {
      entity.x = -entitySize;
    }
    if (entity.y < -entitySize) {
      entity.y = height + entitySize;
    } else if (entity.y > height + entitySize) {
      entity.y = -entitySize;
    }
  }
}

function generateEntities(config) {
  const { entityCount, ctx, baseEntitySpeed, baseEntityFood, random } = config;
  const { width, height } = ctx.canvas;
  const entities = [];

  for (let i = 0; i < entityCount; i++) {
    entities.push({
      index: i,
      x: random(width),
      y: random(height),
      food: baseEntityFood,
      theta: random(TAU),
      speed: baseEntitySpeed,
    });
  }

  return entities;
}

function draw(config, current) {
  const { ctx, entitySize, foodSize, foodSteps } = config;
  const { entities, foods } = current;

  // Clear out background.
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw the foods
  ctx.fillStyle = "#07f6";
  for (const { quantity, x, y } of foods) {
    const width = quantity * foodSize;
    for (let i = 1; i <= foodSteps; i++) {
      const widthStepped = width * Math.pow(i / foodSteps, 2);
      ctx.fillRect(
        x - widthStepped * 0.5,
        y - widthStepped * 0.5,
        widthStepped,
        widthStepped
      );
    }
  }

  ctx.lineWidth = 2 * devicePixelRatio;
  ctx.strokeStyle = "#fff";

  // Draw each entity
  ctx.beginPath();
  const size = entitySize * devicePixelRatio;
  for (const { x, y, theta } of entities) {
    const dx = Math.cos(theta) * size;
    const dy = Math.sin(theta) * size;

    ctx.moveTo(x, y);
    ctx.lineTo(x - dx, y - dy);
  }
  ctx.stroke();
}

function generateFood(config) {
  const {
    minQuantity,
    maxQuantity,
    minGrowthRate,
    maxGrowthRate,
    random,
    foodCount,
    rtree,
    ctx: {
      canvas: { width, height },
    },
  } = config;

  const foods = [];
  for (let foodIndex = 0; foodIndex < foodCount; foodIndex++) {
    const max = random(minQuantity, maxQuantity, true);
    const food = {
      maxQuantity: max,
      quantity: random(max),
      x: random() * width,
      y: random() * height,
      growthRate: random(minGrowthRate, maxGrowthRate),
    };

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

    foods.push(food);
  }
  return foods;
}
