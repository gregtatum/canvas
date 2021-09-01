import Simplex from "simplex-noise";
import setupRandom from "@tatumcreative/random";
import initializeShortcuts from "lib/shortcuts";
import { setupCanvas, loop, generateSeed } from "lib/draw";
import { lerpTheta } from "lib/lerpTheta";
import lerp from "lerp";
import createRtree, { RTree } from "rtree";
import ease from "eases/sine-in-out";
const TAU = Math.PI * 2;

type Config = ReturnType<typeof getConfig>;
type Current = ReturnType<typeof getCurrent>;

type Food = {
  maxFoodQuantity: number;
  quantity: number;
  x: number;
  y: number;
  growthRate: number;
};

type Entity = {
  index: number;
  x: number;
  y: number;
  energy: number;
  theta: number;
  speed: number;
  thetaJitter: number;
};

type RecentlyDead = {
  x: number;
  y: number;
  theta: number;
  speed: number;
  energy: number;
  energyAtDeath: number;
  age: number;
};

{
  const config = getConfig();
  const current = getCurrent(config);

  loop(now => {
    current.dt = now - current.time;
    current.time = now;
    updateFoods(config, current);
    updateEntities(config, current);
    updateRecentlyDead(config, current);
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

    entityWanderSimplexRatio: 0.0001,
    maxEntityCount: 1000, // How many entities can be made?
    entityLiveCount: 30, // How many entities are alive initially?
    entitySize: 10,
    entitySlowDown: 0.5,
    entitySpeedUp: 0.01,
    entityThetaJitterRange: 0.05,
    entityBaseSpeed: 2,
    entitySubdivideEnergyLevel: 100, // The level at which an entities subdivides.
    entityMinLiving: 5, // Don't kill the last entities.
    entityMinSpeed: 0.5,
    entityMaxSpeed: 2.5,
    entitySearchRadius: 100,
    entityLerpThetaT: 0.05,
    entityFeedRate: 0.7,
    entityCostToMove: 0.1,

    deadTimeDecomposing: 5,
    deadSpeedSlowdown: 0.97,

    foodCount: 50,
    minFoodGrowthRate: 1.001, // Exponential factor
    maxFoodGrowthRate: 1.005, // Exponential factor
    minFoodQuantity: 20,
    maxFoodQuantity: 2000,
    foodDrawnSize: 2,
    foodDrawnSteps: 4,
    // Once food has this quantity, entities won't touch it.
    minFeedQuantity: 5,
    foodSimplexDistribution: 500,
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getCurrent(config: Config) {
  const rtree: RTree<Food> = createRtree();
  const { entities, livingEntities, deadEntities } = generateEntities(config);

  // Mutable state.
  return {
    rtree,
    entities,
    livingEntities,
    deadEntities,
    recentlyDead: new Set() as Set<RecentlyDead>,
    foods: generateFood(config, rtree),
    time: Date.now(),
    dt: 0,
  };
}

function updateFoods(config: Config, current: Current): void {
  for (const food of current.foods) {
    food.quantity = Math.min(
      (food.quantity = Math.pow(food.quantity, food.growthRate)),
      food.maxFoodQuantity
    );
  }
}

function updateEntities(config: Config, current: Current): void {
  const { livingEntities } = current;
  const { entityMaxSpeed, entityCostToMove } = config;

  for (const entity of livingEntities) {
    const food = getClosestFood(config, current, entity);

    if (food && food.quantity > 10) {
      // There is food, and there is enough to go eat. Go towards it.
      moveToFood(config, entity, food);
    } else {
      wander(config, entity);
    }

    entity.speed = Math.min(entity.speed, entityMaxSpeed);

    // Consume energy to move
    entity.energy -= entity.speed * entityCostToMove;
    entity.energy = Math.max(0, entity.energy);

    // Apply the speed.
    entity.x += Math.cos(entity.theta) * entity.speed;
    entity.y += Math.sin(entity.theta) * entity.speed;

    keepEntityInRange(config, entity);
    maybeSubdivideEntity(config, current, entity);
    maybeKillEntity(config, current, entity);
  }
}

function updateRecentlyDead(config: Config, current: Current): void {
  const { deadSpeedSlowdown, deadTimeDecomposing } = config;
  const { recentlyDead, dt } = current;
  for (const dead of recentlyDead) {
    dead.age -= dt;
    if (dead.age <= 0) {
      recentlyDead.delete(dead);
    }
    dead.speed *= deadSpeedSlowdown;
    dead.x += Math.cos(dead.theta) * dead.speed;
    dead.y += Math.sin(dead.theta) * dead.speed;
    dead.energy = dead.energyAtDeath * (dead.age / deadTimeDecomposing);
  }
}

function wander(config: Config, entity: Entity): void {
  const {
    entityLerpThetaT,
    entitySpeedUp,
    entityMinSpeed,
    simplex3,
    entityWanderSimplexRatio,
  } = config;

  entity.speed *= 1 + entitySpeedUp;
  entity.speed = Math.max(entityMinSpeed, entity.speed);

  const thetaTarget =
    Math.PI *
    simplex3(
      entity.x * entityWanderSimplexRatio,
      entity.y * entityWanderSimplexRatio,
      entity.index
    );

  entity.theta =
    lerpTheta(entity.theta, thetaTarget, entityLerpThetaT) + entity.thetaJitter;
}

function moveToFood(config: Config, entity: Entity, food: Food): void {
  const { entitySlowDown, entityLerpThetaT, entityFeedRate } = config;

  const dx = entity.x - food.x;
  const dy = entity.y - food.y;
  const distSq = dx * dx + dy * dy;

  const thetaTarget = Math.atan2(food.y - entity.y, food.x - entity.x);
  entity.speed /= 1 + (entitySlowDown * food.quantity) / distSq;
  entity.energy += entityFeedRate;
  food.quantity -= entityFeedRate;
  entity.theta = lerpTheta(entity.theta, thetaTarget, entityLerpThetaT);
}

function getClosestFood(
  config: Config,
  current: Current,
  entity: Entity
): Food | null | undefined {
  const { x, y } = entity;
  const { rtree } = current;
  const { entitySearchRadius, minFeedQuantity } = config;
  const nearbyFoods = rtree.bbox(
    x - entitySearchRadius,
    y - entitySearchRadius,
    x + entitySearchRadius,
    y + entitySearchRadius
  );

  if (nearbyFoods.length === 0) {
    return null;
  }
  // Look for the closest food with the most quantity.
  let food;
  let distSq = 0;
  for (const newFood of nearbyFoods) {
    if (newFood.quantity < minFeedQuantity) {
      // There's not enough food here to eat, leave it.
      continue;
    }

    // Compute the distance squared.
    const dx = x - newFood.x;
    const dy = y - newFood.y;
    const newDistSq = dx * dx + dy * dy;

    if (!food) {
      // No old food was found, go to this one.
      food = newFood;
      distSq = newDistSq;
      continue;
    }

    // Go to the food that is closest with the most quantity.
    if (newDistSq / newFood.quantity < distSq / food.quantity) {
      food = newFood;
    }
  }
  return food;
}

function keepEntityInRange({ entitySize }: Config, entity: Entity): void {
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

function maybeSubdivideEntity(
  config: Config,
  current: Current,
  entity: Entity
): void {
  const { entitySubdivideEnergyLevel, random } = config;
  const { deadEntities, livingEntities } = current;

  if (entity.energy < entitySubdivideEnergyLevel) {
    // Not ready to subdivide.
    return;
  }

  if (deadEntities.size === 0) {
    // There are no dead entities available. Don't add any more
    entity.energy = entitySubdivideEnergyLevel;
    return;
  }

  const [entity2] = deadEntities.entries().next().value;
  deadEntities.delete(entity2);
  livingEntities.add(entity2);

  // Reduce the energy levels.
  entity.energy = entitySubdivideEnergyLevel / random(3, 4);
  entity2.energy = entitySubdivideEnergyLevel / random(3, 4);

  // Copy the properties.
  entity2.x = entity.x;
  entity2.y = entity.y;
  entity.speed = 0;
  entity2.speed = 0;

  // Jitter the positions a bit.
  entity2.theta += random(TAU);
  entity2.x += random(-5, 5);
}

function maybeKillEntity(
  config: Config,
  current: Current,
  entity: Entity
): void {
  const { deadTimeDecomposing, entityMinLiving } = config;
  const { livingEntities, deadEntities, recentlyDead } = current;
  if (livingEntities.size <= entityMinLiving) {
    // Don't kill the last entities.
    return;
  }
  if (entity.energy <= 0) {
    deadEntities.add(entity);
    livingEntities.delete(entity);
    recentlyDead.add({
      x: entity.x,
      y: entity.y,
      theta: entity.theta,
      speed: entity.speed,
      energy: entity.energy,
      energyAtDeath: entity.energy,
      age: deadTimeDecomposing,
    });
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function generateEntities(config: Config) {
  const {
    maxEntityCount,
    entityLiveCount,
    entityBaseSpeed,
    random,
    entitySubdivideEnergyLevel,
    entityThetaJitterRange,
  } = config;
  const entities: Entity[] = [];
  const livingEntities: Set<Entity> = new Set();
  const deadEntities: Set<Entity> = new Set();

  for (let i = 0; i < maxEntityCount; i++) {
    const entity = {
      index: i,
      x: ((ease(random(1, 0)) + 0.5) % 1) * innerWidth,
      y: random(innerHeight),
      energy: random(
        entitySubdivideEnergyLevel / 2,
        entitySubdivideEnergyLevel
      ),
      theta: random(TAU),
      speed: entityBaseSpeed,
      thetaJitter: random(-entityThetaJitterRange, entityThetaJitterRange),
    };
    entities.push(entity);

    if (i < entityLiveCount) {
      livingEntities.add(entity);
    } else {
      deadEntities.add(entity);
    }
  }

  return { entities, livingEntities, deadEntities };
}

function draw(config: Config, current: Current): void {
  const { ctx } = config;
  // Clear out background.
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  drawFoods(config, current);
  ctx.strokeStyle = "#fff";
  drawEnties(config, current.livingEntities);
  ctx.strokeStyle = "#833";
  drawEnties(config, current.recentlyDead);
}

function drawFoods(config: Config, current: Current): void {
  const { ctx, foodDrawnSize, foodDrawnSteps } = config;
  const { foods } = current;
  // Draw the foods
  ctx.fillStyle = "#07f6";
  for (const { quantity, x, y } of foods) {
    const foodWidth = Math.max(2, Math.sqrt(quantity) * foodDrawnSize);
    for (let i = 1; i <= foodDrawnSteps; i++) {
      const widthStepped = foodWidth * Math.pow(i / foodDrawnSteps, 2);
      ctx.fillRect(
        x - widthStepped * 0.5,
        y - widthStepped * 0.5,
        widthStepped,
        widthStepped
      );
    }
  }
}

function drawEnties(
  config: Config,
  entities: Iterable<Entity | RecentlyDead>
): void {
  const { ctx, entitySubdivideEnergyLevel, entitySize } = config;

  ctx.lineWidth = 2;

  // Draw each entity
  ctx.beginPath();
  for (const { x, y, theta, energy } of entities) {
    const energyRatio = energy / entitySubdivideEnergyLevel;
    const size = lerp(
      entitySize / 4,
      entitySize,
      // Square the energy ratio to make it more dramatic
      energyRatio * energyRatio
    );
    const dx = Math.cos(theta) * size;
    const dy = Math.sin(theta) * size;

    ctx.moveTo(x, y);
    ctx.lineTo(x - dx, y - dy);
  }
  ctx.stroke();
}

function generateFood(config: Config, rtree: RTree<Food>): Food[] {
  const {
    minFoodQuantity,
    maxFoodQuantity,
    minFoodGrowthRate,
    maxFoodGrowthRate,
    foodSimplexDistribution,
    random,
    foodCount,
    simplex3,
  } = config;

  const foods = [];
  for (let foodIndex = 0; foodIndex < foodCount; foodIndex++) {
    const x = random() * innerWidth;
    const y = random() * innerHeight;
    const max =
      minFoodQuantity +
      (maxFoodQuantity - minFoodQuantity) *
        (simplex3(x / foodSimplexDistribution, y / foodSimplexDistribution, 0) *
          0.5 +
          0.5);
    foods.push({
      maxFoodQuantity: max,
      quantity: random() * max,
      x,
      y,
      growthRate: random(minFoodGrowthRate, maxFoodGrowthRate),
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
