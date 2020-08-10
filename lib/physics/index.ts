import * as _vec2 from "./vec2";
export const vec2 = _vec2;

/**
 * Every entity in the physics system shares these values.
 */
interface Body {
  position: Vec2<number>;
  prevPosition: Vec2<number>;
  /** The current rotation in radians. */
  rotation: Scalar;
  velocity: Vec2<number>;
  /** The friction on the position, where 1 means none, and 0 means full. */
  friction: Scalar;
  /** The velocity of rotation, in radians */
  angularVelocity: Scalar;
  /** The friction on the angular velocity, where 1 means none, and 0 means full. */
  angularFriction: Scalar;
  /** A generational id for this entity, used for optimizations. */
  id: Integer;
  /** Set this to true to stop gravity from affecting this object. */
  fixedPosition: boolean;
  /** Set this to true to stop the entity from rotating */
  fixedRotation: boolean;
  /** This values is how much bounce an object has, where 1 is full bounce, and 0 is none. */
  restitution: Scalar;
  mass: Scalar;
}

export interface Point {
  type: "point";
  body: Body;
}

export interface Sphere {
  type: "sphere";
  radius: number;
  radiusSq: number;
  body: Body;
}

export interface Box {
  type: "box";
  width: number;
  height: number;
  body: Body;
}

export interface Bounds {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export type Entity = Sphere | Point | Box;
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
    entity.body.id = this.entityGeneration++;
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
          a.body.id < b.body.id
            ? a.body.id * entityGeneration + b.body.id
            : b.body.id * entityGeneration + a.body.id;

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
    const {
      velocity,
      position,
      prevPosition,
      angularVelocity,
      fixedPosition,
    } = entity.body;
    prevPosition.x = position.x;
    prevPosition.y = position.y;
    // Apply gravity
    if (!fixedPosition) {
      velocity.x += gravity.x * tickScale;
      velocity.y += gravity.y * tickScale;
    }
    // Conservation of motion.
    position.x += velocity.x * tickScale;
    position.y += velocity.y * tickScale;
    entity.body.rotation += angularVelocity * tickScale;
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
      case "sphere": {
        const intersectingEntity = findSingleIntersection(
          entity,
          collisionGroup
        );
        if (!intersectingEntity) {
          return;
        }
        const handleCollision = collide.sphere[
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

function createBody(position?: Vec2, velocity?: Vec2): Body {
  return {
    position: position || vec2.create(),
    prevPosition: position ? vec2.clone(position) : vec2.create(),
    rotation: 0,
    velocity: velocity || vec2.create(),
    angularVelocity: 0,
    id: 0,
    fixedPosition: false,
    fixedRotation: false,
    friction: 1,
    angularFriction: 1,
    restitution: 0.5,
    mass: 1,
  };
}

export const create = {
  point(position?: Vec2, velocity?: Vec2): Point {
    return {
      type: "point",
      body: createBody(position, velocity),
    };
  },
  sphere(position?: Vec2, radius?: number, velocity?: Vec2): Sphere {
    const r = radius || 1;
    return {
      type: "sphere",
      radius: r,
      radiusSq: r * r,
      body: createBody(position, velocity),
    };
  },
  box(
    position: Vec2 = vec2.create(),
    width = 1,
    height = 1,
    velocity: Vec2 = vec2.create()
  ): Box {
    return {
      type: "box",
      width,
      height,
      body: createBody(position, velocity),
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
    for (const {
      body: { position, velocity },
    } of points) {
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

/** Sphere */

function sphereIntersectsBox(sphere: Sphere, box: Box): boolean {
  return boxIntersectsSphere(box, sphere);
}

function sphereIntersectsPoint(sphere: Sphere, point: Point): boolean {
  return pointIntersectsSphere(point, sphere);
}

function sphereIntersectsSphere(a: Sphere, b: Sphere): boolean {
  const dx = a.body.position.x - b.body.position.x;
  const dy = a.body.position.y - b.body.position.y;
  const distSq = dx * dx + dy * dy;
  const radii = a.radius + b.radius;
  return distSq < radii * radii;
}

/** Box */

function boxIntersectsBox(a: Box, b: Box): boolean {
  return (
    Math.abs(a.body.position.x - b.body.position.x) * 2 < a.width + b.width &&
    Math.abs(a.body.position.y - b.body.position.y) * 2 < a.height + b.height
  );
}

function boxIntersectsPoint(box: Box, point: Point): boolean {
  return pointIntersectsBox(point, box);
}

function boxIntersectsSphere(box: Box, sphere: Sphere): boolean {
  let d = 0;
  const boxPosition = box.body.position;
  const spherePosition = sphere.body.position;
  const halfW = box.width / 2;
  const halfH = box.height / 2;
  const left = boxPosition.x - halfW;
  const right = boxPosition.x + halfW;
  const bottom = boxPosition.y - halfH;
  const top = boxPosition.y + halfH;

  if (spherePosition.x < left) {
    const s = spherePosition.x - left;
    d += s * s;
  } else if (spherePosition.x > right) {
    const s = spherePosition.x - right;
    d += s * s;
  }
  if (spherePosition.y < bottom) {
    const s = spherePosition.y - bottom;
    d += s * s;
  } else if (spherePosition.y > top) {
    const s = spherePosition.y - top;
    d += s * s;
  }

  return d <= sphere.radiusSq;
}

/** Point **/

function pointIntersectsBox(point: Point, box: Box): boolean {
  return vecIntersectsBox(point.body.position, box);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function pointIntersectsPoint(a: Point, b: Point): boolean {
  // Points have 0 radius and cannot collide together.
  return false;
}

function pointIntersectsSphere(point: Point, sphere: Sphere): boolean {
  return vecIntersectsSphere(point.body.position, sphere);
}

function vecIntersectsBox(v: Vec2, box: Box): boolean {
  const {
    body: {
      position: { x, y },
    },
    width,
    height,
  } = box;
  const halfW = width / 2;
  const halfH = height / 2;
  const left = x - halfW;
  const right = x + halfW;
  const bottom = y - halfH;
  const top = y + halfH;
  return v.x >= left && v.x <= right && v.y >= bottom && v.y <= top;
}

function vecIntersectsSphere(position: Vec2, sphere: Sphere): boolean {
  const dx = position.x - sphere.body.position.x;
  const dy = position.y - sphere.body.position.y;
  return dx * dx + dy * dy <= sphere.radiusSq;
}

/**
 * Wire together the intersection checks.
 */
export const intersect = {
  box: {
    box: boxIntersectsBox,
    point: boxIntersectsPoint,
    sphere: boxIntersectsSphere,
  },
  point: {
    box: pointIntersectsBox,
    point: pointIntersectsPoint,
    sphere: pointIntersectsSphere,
  },
  sphere: {
    box: sphereIntersectsBox,
    point: sphereIntersectsPoint,
    sphere: sphereIntersectsSphere,
  },
};

type CollidesFunction = (entityA: Entity, entityB: Entity) => void;

/**
 * These vectors can be used only in collision functions, and are used
 * to cache some short lived values to avoid any GC.
 */
const collisionCache = {
  intersection: vec2.create(),
  intersection2: vec2.create(),
  inRay: vec2.create(),
  inRay2: vec2.create(),
  outRay: vec2.create(),
  sphereSurfaceNormal: vec2.create(),
  normalA: vec2.create(),
  collisionNormal: vec2.create(),
  offsetAmount: vec2.create(),
};

// TODO - Optimize the instructions here. See if vector reflection can be used
// to remove the distance calculations with expensive sqrt operations.
function pointCollidesSphere(point: Point, sphere: Sphere): void {
  const { inRay, inRay2 } = collisionCache;
  const { position, prevPosition, velocity } = point.body;
  // Assign to the caches so there is no dynamic allocation.
  inRay.x = position.x - prevPosition.x;
  inRay.y = position.y - prevPosition.y;
  vec2.normalize(inRay);

  const intersection = intersectRaySphere(
    prevPosition,
    inRay,
    sphere,
    collisionCache.intersection
  );

  const friction = Math.min(point.body.friction, sphere.body.friction);
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
      collisionCache.intersection2
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
      sphere.body.position,
      collisionCache.sphereSurfaceNormal
    )
  );

  const outRay = vec2.reflect(
    inRay,
    sphereSurfaceNormal,
    collisionCache.outRay
  );

  // Reflect the velocity vector so it follows its new path.
  vec2.reflect(point.body.velocity, sphereSurfaceNormal);

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
function sphereCollidesBox(sphere: Sphere, box: Box): void {
  throw new Error("TODO");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function sphereCollidesPoint(sphere: Sphere, point: Point): void {
  throw new Error("TODO");
}

/**
 * TODO - This gets called twice, once for each sphere, it would be better
 * to figure out a solution where it only gets called once.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function sphereCollidesSphere(a: Sphere, b: Sphere): void {
  const distanceBetweenCenters = vec2.distance(
    a.body.position,
    b.body.position
  );
  const overlap = a.radius + b.radius - distanceBetweenCenters;

  const { collisionNormal } = collisionCache;

  // Compute the sphere surface normals.
  vec2.subtract(b.body.position, a.body.position, collisionNormal);
  vec2.normalize(collisionNormal);

  updateCollisionVelocity(a.body, b.body, collisionNormal);
  updateOverlap(a.body, b.body, collisionNormal, overlap);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function pointCollidesBox(point: Point, box: Box): void {
  throw new Error("TODO");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function pointCollidesPoint(a: Point, b: Point): void {
  throw new Error("This collision type does not happen.");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function boxCollidesBox(a: Box, b: Box): void {
  throw new Error("TODO");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function boxCollidesPoint(box: Box, point: Point): void {
  throw new Error("TODO");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function boxCollidesSphere(box: Box, sphere: Sphere): void {
  throw new Error("TODO");
}

export const collide = {
  box: {
    box: boxCollidesBox,
    point: boxCollidesPoint,
    sphere: boxCollidesSphere,
  },
  point: {
    box: pointCollidesBox,
    point: pointCollidesPoint,
    sphere: pointCollidesSphere,
  },
  sphere: {
    box: sphereCollidesBox,
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
    x: position.x - sphere.body.position.x,
    y: position.y - sphere.body.position.y,
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

/**
 * Terms:
 * 𝝉 - Tau, torque (similar to force)
 * I - moment of inertia (similar to mass)
 * ⍺ - alpha, angular acceleration
 * r - The ray from the center of mass to the place where the force is being applied.
 *
 * Formula: 𝝉 = I⍺
 *
 * Torque can be computed as the cross product of r and f:
 * 𝝉 = r x f
 *
 * In 2d this simplifies to:
 * 𝝉 = rx * fy - ry * fx;
 */
function updateAngularVelocity(
  body: Body,
  momentOfInertia: Scalar,
  pointOfForce: Vec2,
  force: Vec2
): void {
  const rx = pointOfForce.x - body.position.x;
  const ry = pointOfForce.y - body.position.y;
  const torque = rx * force.y - ry * force.x;
  const angularAcceleration = momentOfInertia / torque;
  body.angularVelocity += angularAcceleration;
}

/**
 * Compute the impulsive collision response.
 *
 * p := Linear momentum
 * p̂ := Δp, impulse, an infinitesimal collision force.
 * p̂ˢ:= The scalar value of the impulse, projected onto the normal
 * n := collision surface normal of body A.
 * m := mass
 * v := velocity
 * ε := Co-efficient of restitution - Scalar value representing the loss of energy in
 *      the collision, based on the relative velocities.
 *      ε = 1; perfectly elastic, no energy lost.
 *      ε = 0; perfectly in-elastic, both objects continue in the same direction.
 *
 * Given:
 *
 * 1: p = mv
 * 2: p̂ = p̂ˢn
 * 3: (v'₂ - v'₁) = ε(v₂ - v₁)
 * 4: p'₁ = p₁ + p̂;
 *    p'₂ = p₂ + p̂;
 *
 * Solve equation 4 in terms of the next velocity, which is what we are interested
 * in computing. At this point, we have formulae for all the terms except p̂ˢ.
 *
 * 5: m₁v'₁ = m₁v₁ + p̂;          m₂v'₂ = m₂v₂ + p̂;
 * 6:   v'₁ =   v₁ + (p̂ˢ/m₁)n;    v'₂  =   v₂ + (p̂ˢ/m₂)n;
 *
 * Now substitute in equations 6 into equation 3, and solve for p̂ˢ. This formula has
 * all the terms we need to compute impulse.
 *
 * 7: p̂ˢ = (ε + 1)(v₂•n - v₁•n)
 *         --------------------
 *            (1/m₁ + 1/m₂)
 *
 * TODO - Research how to apply angular forces as well.
 * https://www.chrishecker.com/images/e/e7/Gdmphys3.pdf
 */
function updateCollisionVelocity(a: Body, b: Body, normal: Vec2): void {
  const collisionVelocity = vec2.subtract(b.velocity, a.velocity, _ucv1);
  const collisionVelocityMagnitude = vec2.dot(collisionVelocity, normal);

  if (collisionVelocityMagnitude > 0) {
    // The objects are moving away from each other.
    return;
  }
  const aInvMass = 1 / a.mass;
  const bInvMass = 1 / b.mass;

  const restitution = Math.min(b.restitution, a.restitution);

  // Apply formula 7.
  // p̂ˢ = (ε + 1)(v₂•n - v₁•n)
  //      --------------------
  //         (1/m₁ + 1/m₂)
  const impulseScalar =
    // prettier-ignore
    (
      (restitution + 1) *
      (vec2.dot(b.velocity, normal) - vec2.dot(a.velocity, normal))
    )
    / (aInvMass + bInvMass);

  // Apply formula 2.
  // p̂ = p̂ˢn
  const impulse = vec2.multiplyScalar(normal, impulseScalar, _ucv2);

  // Apply formula 6.
  // v'₁ = v₁ + (p̂/m₁)n
  vec2.add(
    a.velocity,
    vec2.multiplyScalar(impulse, aInvMass, _ucv3),
    a.velocity
  );

  // Apply formula 6.
  // v'₂ = v₂ + (p̂/m₂)n
  vec2.subtract(
    b.velocity,
    vec2.multiplyScalar(impulse, bInvMass, _ucv4),
    b.velocity
  );
}
// Temporary vecs, pre-allocated.
const _ucv1 = vec2.create();
const _ucv2 = vec2.create();
const _ucv3 = vec2.create();
const _ucv4 = vec2.create();

function updateOverlap(a: Body, b: Body, normal: Vec2, overlap: Scalar): void {
  const ratio = b.mass / (a.mass + b.mass);
  const aOverlap = overlap * ratio;
  const bOverlap = overlap * (1 - ratio);
  // Adjust the overlap based on a ratio of each mass.
  vec2.add(a.position, vec2.multiplyScalar(normal, aOverlap, _uo), a.position);
  vec2.add(b.position, vec2.multiplyScalar(normal, bOverlap, _uo), b.position);
}
const _uo = vec2.create();
