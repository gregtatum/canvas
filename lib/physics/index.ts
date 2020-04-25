import * as _vec2 from "./vec2";
export const vec2 = _vec2;

interface BaseEntity {
  position: Vec2<number>;
  prevPosition: Vec2<number>;
  velocity: Vec2<number>;
  // A generational id for this entity, used for optimizations.
  id: number;
  // Set fixed to true to stop gravity from affecting this object.
  fixed: boolean;
  friction: Scalar;
}

export interface Point extends BaseEntity {
  type: "point";
}

export interface Sphere extends BaseEntity {
  type: "sphere";
  radius: number;
  radiusSq: number;
}

export type Entity = Sphere | Point;
export type IntersectionTuple = [Entity, Entity];
type IntersectionChecker = (a: Entity, b: Entity) => boolean;
type AllInteractionGroup = { entities: Set<Entity> };
type OneWayInteractionGroup = { from: Set<Entity>; to: Set<Entity> };

type InteractionGroups = {
  all: Map<string, AllInteractionGroup>;
  oneWay: Map<string, OneWayInteractionGroup>;
};

export class World {
  gravity: Vec2<number> = vec2.create();
  ticksPerSecond: Seconds = 60;
  entities: Set<Entity> = new Set();
  interactionGroups: InteractionGroups = {
    all: new Map(),
    oneWay: new Map(),
  };
  defaultInteractionGroup: AllInteractionGroup | null = null;
  entityGeneration: Integer = 0;
  tick: Integer = 0;
  private intersectionFoundAtTick: Array<number | undefined> = [];

  /**
   * Add something to the physics simulation, but do not have it collide with
   * anything else.
   */
  addNonInteracting(entity: Entity): void {
    entity.id = this.entityGeneration++;
    this.entities.add(entity);
  }

  /**
   * These entities will collide with every other one of the entities in the group.
   * An optional "groupName" can be provided, which will create a separate collision
   * group.
   */
  addToAllGroup(entity: Entity, groupName = "default"): void {
    const { all } = this.interactionGroups;
    let group = all.get(groupName);
    if (!group) {
      group = { entities: new Set() };
      all.set(groupName, group);
    }
    group.entities.add(entity);
    this.addNonInteracting(entity);
  }

  /**
   * The "one way" group is a group that will only collide with one other group, but
   * will not self-collide.
   */
  addToOneWayGroup(
    entity: Entity,
    fromOrTo: "from" | "to",
    groupName = "default"
  ): void {
    const { oneWay } = this.interactionGroups;
    let group = oneWay.get(groupName);
    if (!group) {
      group = { from: new Set(), to: new Set() };
      oneWay.set(groupName, group);
    }
    this.addNonInteracting(entity);
    if (fromOrTo === "from") {
      group.from.add(entity);
    } else {
      group.to.add(entity);
    }
  }

  delete(entity: Entity): void {
    this.entities.delete(entity);

    for (const { entities } of this.interactionGroups.all.values()) {
      entities.delete(entity);
    }
    for (const { from, to } of this.interactionGroups.oneWay.values()) {
      from.delete(entity);
      to.delete(entity);
    }
  }

  checkAllIntersections(handleIntersection: IntersectionHandler): void {
    const { entities, tick, intersectionFoundAtTick, entityGeneration } = this;

    for (const a of entities) {
      for (const b of entities) {
        if (a === b) {
          continue;
        }
        // Compute an intersection index based on both entities' generational ids.
        const intersectionIndex =
          a.id < b.id
            ? a.id * entityGeneration + b.id
            : b.id * entityGeneration + a.id;

        if (intersectionFoundAtTick[intersectionIndex] === tick) {
          // This match was already found, don't double report.
          continue;
        }

        const checkIntersection = intersect[a.type][b.type];
        if ((checkIntersection as IntersectionChecker)(a, b)) {
          intersectionFoundAtTick[intersectionIndex] = tick;
          handleIntersection(a, b);
        }
      }
    }
  }

  gcHeavyCheckAllIntersections(): Array<[Entity, Entity]> {
    const intersections: Array<[Entity, Entity]> = [];
    this.checkAllIntersections((a, b) => {
      intersections.push([a, b]);
    });
    return intersections;
  }

  integrationIntersections = [];

  handlePhysicsStep(entity: Entity, tickScale: number): void {
    const { gravity } = this;
    const { velocity, position, prevPosition, fixed } = entity;
    prevPosition.x = position.x;
    prevPosition.y = position.y;
    // Apply gravity
    if (!fixed) {
      velocity.x += gravity.x * tickScale;
      velocity.y += gravity.y * tickScale;
    }
    // Conservation of motion.
    position.x += velocity.x * tickScale;
    position.y += velocity.y * tickScale;
  }

  handleCollisionStep(entity: Entity, collisionGroup: Set<Entity>): void {
    switch (entity.type) {
      case "point": {
        const intersectingEntity = findSingleIntersection(
          entity,
          collisionGroup
        );
        if (!intersectingEntity) {
          return;
        }
        const handleCollision = collide.point[
          intersectingEntity.type
        ] as CollidesFunction;
        handleCollision(entity, intersectingEntity);
        break;
      }
      default:
        break;
    }
  }

  integrate(dt: Seconds): void {
    const { interactionGroups } = this;
    for (const tickScale of integrate(this, dt)) {
      // FYI, 9007199254740991 is the MAX_SAFE_INTEGER, so this shouldn't overflow, unless
      // the simulation is run for thousands of years or at a precision that is probably
      // ludicrous.
      this.tick++;

      const mark = `PhysicsWorld.integrate ${this.tick}-mark`;
      const measure = `PhysicsWorld.integrate ${this.tick}`;
      if ((performance as any).mark) {
        performance.mark(mark);
      }
      for (const entity of this.entities) {
        this.handlePhysicsStep(entity, tickScale);
      }
      for (const { entities } of interactionGroups.all.values()) {
        for (const entity of entities) {
          this.handleCollisionStep(entity, entities);
        }
      }
      for (const { from, to } of interactionGroups.oneWay.values()) {
        for (const entity of from) {
          this.handleCollisionStep(entity, to);
        }
      }
      if ((performance as any).mark) {
        performance.measure(measure, mark);
        performance.clearMarks();
        performance.clearMeasures();
      }
    }
  }
}

export function findSingleIntersection(
  entity: Entity,
  entities: Set<Entity>
): Entity | null {
  for (const otherEntity of entities) {
    if (otherEntity === entity) {
      continue;
    }
    if (
      (intersect[entity.type][otherEntity.type] as IntersectionChecker)(
        entity,
        otherEntity
      )
    ) {
      return otherEntity;
    }
  }
  return null;
}

export const create = {
  point(position?: Vec2, velocity?: Vec2): Point {
    return {
      type: "point",
      position: position || vec2.create(),
      prevPosition: position ? vec2.clone(position) : vec2.create(),
      velocity: velocity || vec2.create(),
      id: 0,
      fixed: false,
      friction: 1,
    };
  },
  sphere(position?: Vec2, radius?: number, velocity?: Vec2): Sphere {
    const r = radius || 1;
    return {
      type: "sphere",
      position: position || vec2.create(),
      prevPosition: position ? vec2.clone(position) : vec2.create(),
      velocity: velocity || vec2.create(),
      radius: r,
      radiusSq: r * r,
      fixed: false,
      id: 0,
      friction: 1,
    };
  },
  world(options?: Partial<World>): World {
    const world = new World();
    if (!options) {
      return world;
    }
    const { ticksPerSecond, gravity, entities } = options;
    if (ticksPerSecond !== undefined) world.ticksPerSecond = ticksPerSecond;
    if (gravity !== undefined) world.gravity = gravity;
    if (entities !== undefined) world.entities = entities;
    return world;
  },
};

export function updatePoints(
  dt: Seconds,
  world: World,
  points: Iterable<Point>
): void {
  const { gravity } = world;
  for (const tickScale of integrate(world, dt)) {
    for (const { position, velocity } of points) {
      velocity.x += gravity.x * tickScale;
      velocity.y += gravity.y * tickScale;
      // Conservation of motion.
      position.x += velocity.x * tickScale;
      position.y += velocity.y * tickScale;
    }
  }
}

function integrate(world: World, dt: Seconds): IntegrationIterator {
  return new IntegrationIterator(world.ticksPerSecond, dt);
}

/**
 * Integrated be a single change in time (dt) is not stable. This can lead in
 * jumps in the physics system based on the frame rate. One long dt will make the
 * physics jump a large distance. Instead, integrate a fixed number of steps between
 * each frame. This iterator handles the math for it.
 */
export class IntegrationIterator {
  tickStep: Seconds;
  target: Seconds;
  ticksPerSecond: Seconds;
  dt: Seconds;
  time: Seconds;
  result: { done: boolean; value: number };

  constructor(ticksPerSecond: Seconds, dt: Seconds) {
    this.tickStep = 1 / ticksPerSecond;
    this.target = ticksPerSecond * dt;
    this.ticksPerSecond = ticksPerSecond;
    this.dt = dt;
    this.time = 0;
    this.result = { done: false, value: this.tickStep };
  }

  [Symbol.iterator](): IntegrationIterator {
    return this;
  }

  next(): { done: boolean; value: number } {
    const { time, dt, tickStep, result } = this;

    if (time >= dt) {
      result.done = true;
      return result;
    }

    const nextTime = time + tickStep;

    if (nextTime > dt) {
      // This is a partial result.
      result.value = dt - time;
      this.time = dt;
      return result;
    }

    this.time = nextTime;
    return result;
  }
}

type IntersectionHandler = (a: Entity, b: Entity) => void;

function pointIntersectsSphere(point: Point, sphere: Sphere): boolean {
  return vecIntersectsSphere(point.position, sphere);
}

function vecIntersectsSphere(position: Vec2, sphere: Sphere): boolean {
  const dx = position.x - sphere.position.x;
  const dy = position.y - sphere.position.y;
  return dx * dx + dy * dy <= sphere.radiusSq;
}

function sphereIntersectsPoint(sphere: Sphere, point: Point): boolean {
  return pointIntersectsSphere(point, sphere);
}

function sphereIntersectsSphere(a: Sphere, b: Sphere): boolean {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  const distSq = dx * dx + dy * dy;
  const radii = a.radius + b.radius;
  return distSq < radii * radii;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function pointIntersectsPoint(a: Point, b: Point): boolean {
  // Points have 0 radius and cannot collide together.
  return false;
}

/**
 * Wire together the intersection checks.
 */
export const intersect = {
  point: {
    sphere: pointIntersectsSphere,
    point: pointIntersectsPoint,
  },
  sphere: {
    point: sphereIntersectsPoint,
    sphere: sphereIntersectsSphere,
  },
};

type CollidesFunction = (entityA: Entity, entityB: Entity) => void;

const pointCollidesSphereCache = {
  intersection: vec2.create(),
  intersection2: vec2.create(),
  inRay: vec2.create(),
  inRay2: vec2.create(),
  outRay: vec2.create(),
  sphereSurfaceNormal: vec2.create(),
};

// TODO - Optimize the instructions here. See if vector reflection can be used
// to remove the distance calculations with expensive sqrt operations.
function pointCollidesSphere(point: Point, sphere: Sphere): void {
  const { inRay, inRay2 } = pointCollidesSphereCache;
  const { position, prevPosition, velocity } = point;
  // Assign to the caches so there is no dynamic allocation.
  inRay.x = position.x - prevPosition.x;
  inRay.y = position.y - prevPosition.y;
  vec2.normalize(inRay);

  const intersection = intersectRaySphere(
    prevPosition,
    inRay,
    sphere,
    pointCollidesSphereCache.intersection
  );

  const friction = Math.min(point.friction, sphere.friction);
  velocity.x *= friction;
  velocity.y *= friction;

  if (intersection.t < 0) {
    // This point is inside the sphere. Flip the ray around, and get another
    // intersection to test which way to send the point.
    inRay2.x = -inRay2.x;
    inRay2.y = -inRay2.y;
    const intersection2 = intersectRaySphere(
      prevPosition,
      inRay2,
      sphere,
      pointCollidesSphereCache.intersection2
    );
    if (intersection2.t > intersection.t) {
      // This point is already mostly through the sphere. Use the other intersection
      // point and let it continue on.
      position.x = intersection2.x;
      position.y = intersection2.y;
      return;
    }
  }

  // The intersection is on the surface of the sphere, compute the normal from it.
  const sphereSurfaceNormal = vec2.normalize(
    vec2.subtract(
      intersection,
      sphere.position,
      pointCollidesSphereCache.sphereSurfaceNormal
    )
  );

  const outRay = vec2.reflect(
    inRay,
    sphereSurfaceNormal,
    pointCollidesSphereCache.outRay
  );

  // Reflect the velocity vector so it follows its new path.
  vec2.reflect(point.velocity, sphereSurfaceNormal);

  // Adjust the point to its new position.
  if (intersection.t < 0) {
    // The point's current position and previous position are both inside the sphere.
    // Return it to the surface only.
    position.x = intersection.x;
    position.y = intersection.y;
  } else {
    const totalDistance = vec2.distance(prevPosition, position);
    const preCollisionDistance = intersection.t;
    const postCollisionDistance = totalDistance - preCollisionDistance;
    position.x = intersection.x + outRay.x * postCollisionDistance;
    position.y = intersection.y + outRay.x * postCollisionDistance;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function sphereCollidesPoint(sphere: Sphere, point: Point): void {
  throw new Error("TODO");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function sphereCollidesSphere(a: Sphere, b: Sphere): void {
  throw new Error("TODO");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function pointCollidesPoint(a: Point, b: Point): void {
  throw new Error("This collision type does not happen.");
}

export const collide = {
  point: {
    sphere: pointCollidesSphere,
    point: pointCollidesPoint,
  },
  sphere: {
    point: sphereCollidesPoint,
    sphere: sphereCollidesSphere,
  },
};

export function intersectRaySphere(
  position: Vec2,
  ray: Vec2,
  sphere: Sphere,
  output: Vec2 & { t?: number } = vec2.create()
): Vec2 & { t: number } {
  const pointToSphere: Vec2 = {
    x: position.x - sphere.position.x,
    y: position.y - sphere.position.y,
  };
  const b: number = vec2.dot(pointToSphere, ray);
  const c: number = vec2.dot(pointToSphere, pointToSphere) - sphere.radiusSq;

  // Ray now found to intersect sphere, compute smallest t value of intersection
  const discriminant = b * b - c;
  const t = -b - Math.sqrt(discriminant);

  if (c > 0 && b > 0) {
    throw new Error(
      "The’s origin outside s (c > 0) and r pointing away from s (b > 0)"
    );
  }

  if (discriminant < 0) {
    throw new Error(
      "A negative discriminant means the ray is missing sphere, which shouldn't happen at this point."
    );
  }

  // if (t < 0) {
  //   throw new Error("t is negative, ray started inside sphere");
  // }

  output.x = position.x + t * ray.x;
  output.y = position.y + t * ray.y;
  output.t = t;
  return output as Vec2 & { t: number };
}
