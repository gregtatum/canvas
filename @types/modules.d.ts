declare module "lerp" {
  const lerp: (a: number, b: number, t: number) => number;
  export default lerp;
}

declare module "simplex-noise" {
  class Simplex {
    constructor(random?: () => number);
    noise2D(x: number, y: number): number;
    noise3D(x: number, y: number, z: number): number;
    noise4D(x: number, y: number, z: number, w: number): number;
  }

  export default Simplex;
}

type RandomFn =
  (() => number) &
  ((max: number) => number) &
  ((min: number, max: number) => number) &
  ((min: number, max: number, isInteger: boolean) => number);

declare module "@tatumcreative/random" {
  const setupRandom: (...seed: Array<string | number>) => RandomFn
  export default setupRandom;
}

type EaseFn = (unitInterval: number) => number;

declare module "eases/back-in-out" {
  const backInOut: EaseFn;
  export default backInOut;
}
declare module "eases/back-in" {
  const backIn: EaseFn;
  export default backIn;
}
declare module "eases/back-out" {
  const backOut: EaseFn;
  export default backOut;
}
declare module "eases/bounce-in-out" {
  const bounceInOut: EaseFn;
  export default bounceInOut;
}
declare module "eases/bounce-in" {
  const bounceIn: EaseFn;
  export default bounceIn;
}
declare module "eases/bounce-out" {
  const bounceOut: EaseFn;
  export default bounceOut;
}
declare module "eases/circ-in-out" {
  const circInOut: EaseFn;
  export default circInOut;
}
declare module "eases/circ-in" {
  const circIn: EaseFn;
  export default circIn;
}
declare module "eases/circ-out" {
  const circOut: EaseFn;
  export default circOut;
}
declare module "eases/cubic-in-out" {
  const cubicInOut: EaseFn;
  export default cubicInOut;
}
declare module "eases/cubic-in" {
  const cubicIn: EaseFn;
  export default cubicIn;
}
declare module "eases/cubic-out" {
  const cubicOut: EaseFn;
  export default cubicOut;
}
declare module "eases/elastic-in-out" {
  const elasticInOut: EaseFn;
  export default elasticInOut;
}
declare module "eases/elastic-in" {
  const elasticIn: EaseFn;
  export default elasticIn;
}
declare module "eases/elastic-out" {
  const elasticOut: EaseFn;
  export default elasticOut;
}
declare module "eases/expo-in-out" {
  const expoInOut: EaseFn;
  export default expoInOut;
}
declare module "eases/expo-in" {
  const expoIn: EaseFn;
  export default expoIn;
}
declare module "eases/expo-out" {
  const expoOut: EaseFn;
  export default expoOut;
}
declare module "eases/linear" {
  const linear: EaseFn;
  export default linear;
}
declare module "eases/quad-in-out" {
  const quadInOut: EaseFn;
  export default quadInOut;
}
declare module "eases/quad-in" {
  const quadIn: EaseFn;
  export default quadIn;
}
declare module "eases/quad-out" {
  const quadOut: EaseFn;
  export default quadOut;
}
declare module "eases/quart-in-out" {
  const quartInOut: EaseFn;
  export default quartInOut;
}
declare module "eases/quart-in" {
  const quartIn: EaseFn;
  export default quartIn;
}
declare module "eases/quart-out" {
  const quartOut: EaseFn;
  export default quartOut;
}
declare module "eases/quint-in-out" {
  const quintInOut: EaseFn;
  export default quintInOut;
}
declare module "eases/quint-in" {
  const quintIn: EaseFn;
  export default quintIn;
}
declare module "eases/quint-out" {
  const quintOut: EaseFn;
  export default quintOut;
}
declare module "eases/sine-in-out" {
  const sineInOut: EaseFn;
  export default sineInOut;
}
declare module "eases/sine-in" {
  const sineIn: EaseFn;
  export default sineIn;
}
declare module "eases/sine-out" {
  const sineOut: EaseFn;
  export default sineOut;
}

declare module "rtree" {
  export interface RTreeRectangle {
    x: number;
    y: number;
    w: number;
    h: number;
}

  export interface RTree<T> {
    insert(bounds: RTreeRectangle, element: T): boolean;
    remove(area: RTreeRectangle, element?: T): T[];
    geoJSON(geoJSON: any): void;
    bbox(x1: any, y1: any, x2: number, y2: number): T[];
    search(area: RTreeRectangle, return_node?: boolean, return_array?: T[]): T[];
  }

  const createRTRree: <T>(maxNodeWidth?: number) => RTree<T>;
  export default createRTRree
}

declare module "verlet-system" {
  import { VerletPoint } from "verlet-point";

  export interface VerletSystem {
    integrate: (points: VerletPoint[], step: Seconds) => void
    integratePoint: (points: VerletPoint, step: Seconds) => void
    gravity?: Tuple2D<Scalar>,
    min?: BoundsTuple2D,
    max?: BoundsTuple2D,
    friction: Scalar,
    bounce: Scalar,

  }

  interface VerletSystemOptions {
    // A vector describing the gravity of this system, defaults to a zero vector
    gravity?: Tuple2D<Scalar>,
    // The minimum bounds vector, defaults to null (i.e. negative infinity)
    min?: BoundsTuple2D,
    // The maximum bounds vector, defaults to null (i.e. positive infinity)
    max?: BoundsTuple2D,
    // The air friction, defaults to 0.98
    friction?: Scalar,
    // The friction with collision edges, i.e. "bounciness", defaults to 1.0
    bounce?: Scalar,
  }

  const createVerletSystem: (options: VerletSystemOptions) => VerletSystem;

  export default createVerletSystem;
}
declare module "verlet-point" {
  export interface VerletPoint {
    position: Tuple2D<WorldSpace>;
    previous: Tuple2D<WorldSpace>;
    acceleration: Tuple2D<Scalar>;
    mass: Scalar;
    place: (position: Tuple2D<WorldSpace>) => VerletPoint;
    addForce: (force: Tuple2D<Scalar>) => void;
  }

  interface VerletPointOptions {
    // The position vector, defaults to zero.
    position: Tuple2D<WorldSpace>,
    // The previous vector, useful for creating forces. If not specified, this will default to position value.
    previous?: Tuple2D<WorldSpace>,
    // The acceleration vector of the point, defaults to zero
    acceleration?: Tuple2D<Scalar>,
    // The mass of this point, defaults to 1.0. A mass of zero is considered "unmovable."
    mass?: Scalar,
    // The radius of this point, only useful for collision testing. Defaults to zero.
    radius?: Scalar,
  }

  const createVerletPoint: (option: VerletPointOptions) => VerletPoint;
  export default createVerletPoint;
}

declare module "verlet-constraint" {
  import { VerletPoint } from "verlet-point"

  export interface VerletConstraint {
    solve: () => void,
    points: [VerletPoint, VerletPoint],
    restingDistance: WorldSpace,
    stiffness: Scalar,
  }

  interface VerletConstraintOptions {
    // The desired resting distance between the two points, defaults to using the
    // distance between the two points during construction
    restingDistance?: WorldSpace,
    // The stiffness of the constraint, defaults to 1.0
    stiffness?: Scalar,
  }

  const createVerletConstraint: (
    points: [VerletPoint, VerletPoint],
    option?: VerletConstraintOptions
  ) => VerletConstraint;

  export default createVerletConstraint;
}

declare module "delaunay-triangulate" {
  const delaunaryTrianglulate: (
    points: Tuple2D[],
    pointAtInfinite?: Tuple2D
  ) => Tuple3D<Index>[];

  export default delaunaryTrianglulate;
}


// src/@types/jest-matcher-deep-close-to/index.d.ts
declare namespace jest {
  interface Matchers<R> {
    toBeDeepCloseTo: (expected: number | number[] | object, decimals?: number) => R;
    toMatchCloseTo: (expected: number | number[] | object, decimals?: number) => R;
  }
}

declare module 'jest-matcher-deep-close-to' {
  export function toBeDeepCloseTo(
    received: number | number[] | object,
    expected: number | number[] | object,
    decimals?: number,
  ): {
    message(): string;
    pass: boolean;
  };

  export function toMatchCloseTo(
    received: number | number[] | object,
    expected: number | number[] | object,
    decimals?: number,
  ): {
    message(): string;
    pass: boolean;
  };
}
