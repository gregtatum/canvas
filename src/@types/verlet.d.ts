declare module "verlet-system" {
  import { VerletPoint } from "verlet-point";

  export interface VerletSystem {
    integrate: (points: VerletPoint[], step: Seconds) => void;
    integratePoint: (points: VerletPoint, step: Seconds) => void;
    gravity?: Tuple2<Scalar>;
    min?: BoundsTuple2D;
    max?: BoundsTuple2D;
    friction: Scalar;
    bounce: Scalar;
  }

  interface VerletSystemOptions {
    // A vector describing the gravity of this system, defaults to a zero vector
    gravity?: Tuple2<Scalar>;
    // The minimum bounds vector, defaults to null (i.e. negative infinity)
    min?: BoundsTuple2D;
    // The maximum bounds vector, defaults to null (i.e. positive infinity)
    max?: BoundsTuple2D;
    // The air friction, defaults to 0.98
    friction?: Scalar;
    // The friction with collision edges, i.e. "bounciness", defaults to 1.0
    bounce?: Scalar;
  }

  const createVerletSystem: (options: VerletSystemOptions) => VerletSystem;

  export default createVerletSystem;
}
declare module "verlet-point" {
  export interface VerletPoint {
    position: Tuple2<WorldSpace>;
    previous: Tuple2<WorldSpace>;
    acceleration: Tuple2<Scalar>;
    mass: Scalar;
    place: (position: Tuple2<WorldSpace>) => VerletPoint;
    addForce: (force: Tuple2<Scalar>) => void;
  }

  interface VerletPointOptions {
    // The position vector, defaults to zero.
    position: Tuple2<WorldSpace>;
    // The previous vector, useful for creating forces. If not specified, this will default to position value.
    previous?: Tuple2<WorldSpace>;
    // The acceleration vector of the point, defaults to zero
    acceleration?: Tuple2<Scalar>;
    // The mass of this point, defaults to 1.0. A mass of zero is considered "unmovable."
    mass?: Scalar;
    // The radius of this point, only useful for collision testing. Defaults to zero.
    radius?: Scalar;
  }

  const createVerletPoint: (option: VerletPointOptions) => VerletPoint;
  export default createVerletPoint;
}

declare module "verlet-constraint" {
  import { VerletPoint } from "verlet-point";

  export interface VerletConstraint {
    solve: () => void;
    points: [VerletPoint, VerletPoint];
    restingDistance: WorldSpace;
    stiffness: Scalar;
  }

  interface VerletConstraintOptions {
    // The desired resting distance between the two points, defaults to using the
    // distance between the two points during construction
    restingDistance?: WorldSpace;
    // The stiffness of the constraint, defaults to 1.0
    stiffness?: Scalar;
  }

  const createVerletConstraint: (
    points: [VerletPoint, VerletPoint],
    option?: VerletConstraintOptions
  ) => VerletConstraint;

  export default createVerletConstraint;
}
