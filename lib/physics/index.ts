import * as _vec2 from "./vec2";
export const vec2 = _vec2;

export interface Point {
  type: "point";
  position: Vec2<number>;
  velocity: Vec2<number>;
  id: number;
}

export interface Sphere {
  type: "sphere";
  position: Vec2<number>;
  velocity: Vec2<number>;
  radius: number;
  radiusSq: number;
  id: number;
}

export type Entity = Sphere | Point;

export type IntersectionTuple = [Entity, Entity];

type IntersectionChecker = (a: Entity, b: Entity) => boolean;

class World {
  gravity: Vec2<number> = vec2.create();
  ticksPerSecond: Seconds = 60;
  entities: Set<Entity> = new Set();
  entityGeneration: Integer = 0;
  tick: Integer = 0;
  private intersectionFoundAtTick: Array<number | undefined> = [];

  add(entity: Entity): void {
    entity.id = this.entityGeneration++;
    this.entities.add(entity);
  }

  delete(entity: Entity): void {
    this.entities.delete(entity);
  }

  checkAllIntersections(handleIntersection: IntersectionHandler): void {
    // FYI, 9007199254740991 is the MAX_SAFE_INTEGER, so this shouldn't overflow, unless
    // the simulation is run for thousands of years or at a precision that is probably
    // ludicrous.
    this.tick++;
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

  integrate(dt: Seconds): void {
    const { entities, gravity } = this;

    for (const tickScale of integrate(this, dt)) {
      for (const entity of entities) {
        switch (entity.type) {
          case "point": {
            const { velocity, position } = entity;
            const { x, y } = position;
            // Apply gravity
            velocity.x += gravity.x * tickScale;
            velocity.y += gravity.y * tickScale;
            // Conservation of motion.
            position.x += velocity.x * tickScale;
            position.y += velocity.y * tickScale;
            // Check for intersections.
            const intersectingEntity = this.findSingleIntersection(entity);
            if (!intersectingEntity) {
              continue;
            }
            const handleCollision = collide.point[
              intersectingEntity.type
            ] as CollidesFunction;
            handleCollision(entity, intersectingEntity, x, y);
            break;
          }

          default:
            break;
        }
      }
    }
  }

  findSingleIntersection(entity: Entity): Entity | null {
    for (const otherEntity of this.entities) {
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
}

export const create = {
  point(position?: Vec2, velocity?: Vec2): Point {
    return {
      type: "point",
      position: position || vec2.create(),
      velocity: velocity || vec2.create(),
      id: 0,
    };
  },
  sphere(position?: Vec2, radius?: number, velocity?: Vec2): Sphere {
    const r = radius || 1;
    return {
      type: "sphere",
      position: position || vec2.create(),
      velocity: velocity || vec2.create(),
      radius: r,
      radiusSq: r * r,
      id: 0,
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

export function initSphere(rawSphere: {
  position: Vec2;
  radius: number;
}): Sphere {
  const { radius } = rawSphere;
  (rawSphere as Sphere).radiusSq = radius * radius;
  return rawSphere as Sphere;
}

type IntersectionHandler = (a: Entity, b: Entity) => void;

function pointIntersectsSphere(point: Point, sphere: Sphere): boolean {
  const dx = point.position.x - sphere.position.x;
  const dy = point.position.y - sphere.position.y;
  return dx * dx + dy * dy <= sphere.radiusSq;
}

function sphereIntersectsPoint(sphere: Sphere, point: Point): boolean {
  return pointIntersectsSphere(point, sphere);
}

function sphereIntersectsSphere(a: Sphere, b: Sphere): boolean {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  const distSq = dx * dx + dy * dy;
  return distSq < a.radiusSq + b.radiusSq;
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

type CollidesFunction = (
  entityA: Entity,
  entityB: Entity,
  oldX: number,
  oldY: number
) => void;

const pointCollidesSphereCache = {
  intersection: vec2.create(),
  inRay: vec2.create(),
  outRay: vec2.create(),
  old: vec2.create(),
  preCollide: vec2.create(),
  sphereSurfaceNormal: vec2.create(),
};

// TODO - Optimize the instructions here. See if vector reflection can be used
// to remove the distance calculations with expensive sqrt operations.
function pointCollidesSphere(
  point: Point,
  sphere: Sphere,
  oldX: number,
  oldY: number
): void {
  const { preCollide, old, inRay } = pointCollidesSphereCache;

  // Assign to the caches so there is no dynamic allocation.
  preCollide.x = point.position.x;
  preCollide.y = point.position.y;
  old.x = oldX;
  old.y = oldY;
  inRay.x = preCollide.x - oldX;
  inRay.y = preCollide.y - oldY;
  vec2.normalize(inRay);

  const intersection = intersectRaySphere(
    old,
    inRay,
    sphere,
    pointCollidesSphereCache.intersection
  );

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

  {
    // Adjust the point to its new position.
    const totalDistance = vec2.distance(old, preCollide);
    const preCollisionDistance = intersection.t;
    const postCollisionDistance = totalDistance - preCollisionDistance;
    point.position.x = intersection.x + outRay.x * postCollisionDistance;
    point.position.y = intersection.y + outRay.x * postCollisionDistance;
  }

  // Reflect the velocity vector so it follows its new path.
  vec2.reflect(point.velocity, sphereSurfaceNormal);
}

function sphereCollidesPoint(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sphere: Sphere,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  point: Point,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  oldX: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  oldY: number
): void {
  throw new Error("TODO");
}

function sphereCollidesSphere(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  a: Sphere,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  b: Sphere,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  oldX: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  oldY: number
): void {
  throw new Error("TODO");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function pointCollidesPoint(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  a: Point,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  b: Point,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  oldX: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  oldY: number
): void {
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

  if (t < 0) {
    throw new Error("t is negative, ray started inside sphere");
  }

  output.x = position.x + t * ray.x;
  output.y = position.y + t * ray.y;
  output.t = t;
  return output as Vec2 & { t: number };
}
