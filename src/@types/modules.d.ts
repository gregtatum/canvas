declare module "lerp" {
  const lerp: (a: number, b: number, t: number) => number;
  export default lerp;
}

declare module "resl" {
  type ManifestTypes = "text" | "image" | "video" | "binary" | "audio";
  interface ManifestItem<Type extends ManifestTypes, ParsedResult> {
    // The type declares the type of the asset
    type: Type;
    // Declares the URL of the asset.
    src: string;
    // Setting the streaming flag specifies that the done() callback will fire as
    // soon as the asset has started loading
    stream?: boolean;
    // e.g. JSON.parse
    parser?: (item: LoadedManifestItem[Type]) => ParsedResult;
    // If set to true, then pass credentials to cross origin requests.
    credentials?: boolean;
  }

  interface LoadedManifestItem {
    text: string;
    image: HTMLImageElement;
    video: HTMLVideoElement;
    audio: HTMLAudioElement;
    binary: ArrayBuffer;
  }

  interface Manifest<Type extends ManifestTypes, ParsedResult> {
    [key: string]: ManifestItem<Type, ParsedResult>;
  }

  interface Options<
    Type extends ManifestTypes,
    ParsedResult,
    M extends Manifest<Type, ParsedResult>
  > {
    manifest: M;
    onDone: (
      assets: {
        [Property in keyof M]: M[Property]["parser"] extends Function
          ? ReturnType<M[Property]["parser"]>
          : LoadedManifestItem[M[Property]["type"]];
      }
    ) => void;
    // As assets are preloaded the progress callback gets fired
    onProgress?: (progress: number, message: string) => void;
    // Called when there is an error.
    onError?: (err: Error) => void;
  }

  const resl: <
    Type extends ManifestTypes,
    ParsedResult,
    M extends Manifest<Type, ParsedResult>
  >(
    options: Options<Type, ParsedResult, M>
  ) => void;
  export default resl;
}

declare module "orbit-controls" {
  interface Controls {
    // Update the internal position, direction, and up vectors that represent the camera.
    update(): void;

    // Apply the control's current state to a target camera. This is purely for
    // convenience; you can also copy the controls.position and other members manually.
    copyInto(position: Tuple3, direction: Tuple3, up: Tuple3): void;

    // Enables the DOM events and input, attaching new mouse and touch events. If already
    // enabled, this function does nothing.
    enable(): void;

    // Disables the DOM events and input, detaching all events. If already disabled,
    // this function does nothing.
    disable(): void;

    // Vector arrays [x, y, z] that represent the camera controls. These are typically
    // copied into your camera interface with:
    //
    //   var camera = new MyPerspectiveCamera()
    //   controls.copyInto(camera.position, camera.direction, camera.up)
    position: Tuple3;
    direction: Tuple3;
    up: Tuple3;

    // The vec3 center of the orbit
    target: Tuple3;

    // The initial rotation in radians, in spherical coordinates. Changing either will re-calculate the direction.
    phi: Radian;
    theta: Radian;

    // The distance from the target, default 1
    distance: number;

    // How fast the controls slow down, between 0 and 1, default 0.25
    damping: UnitInterval;

    // The rotation speed of the controls.
    rotateSpeed: number;
    // The zoom speed of the controls.
    zoomSpeed: number;
    // The pinch speed of the controls.
    pinchSpeed: number;

    // Enables pinch.
    pinch: boolean;
    // Enables zoom.
    zoom: boolean;
    // Enables rotation.
    rotate: boolean;

    // The bounds of the controls
    phiBounds: Radian;
    thetaBounds: Radian;
    distanceBounds: number;

    // Returns true if the user is currently dragging the controls.
    readonly dragging: boolean;

    // Returns true if the user is currently pinching (zooming on mobile) the controls.
    readonly pinching: boolean;
  }

  interface Config {
    //  the initial position of the camera, default [0, 0, 1]
    position: Tuple3;
    //  the initial direction of the camera, default [0, 1, 0]
    up: Tuple3;
    //  the center of the orbit, default [0, 0, 0]
    target: Tuple3;
    //  the initial rotation in radians, phi in spherical coordinates, default Math.PI/2
    phi: Radian;
    //  the initial rotation in radians, theta in spherical coordinates, default 0
    theta: Radian;
    //  the distance from the target, default 1
    distance: number;
    //  how fast the controls slow down, between 0 and 1, default 0.25
    damping: UnitInterval;
    //  the speed of the rotation, default 0.28
    rotateSpeed: number;
    //  the speed of the zoom, default 0.0075
    zoomSpeed: number;
    //  (coming soon) the speed of the pinch, default 0.0075
    pinchSpeed: number;
    //  (coming soon) enable pinching, default true
    pinch: boolean;
    //  enable zooming, default true
    zoom: boolean;
    //  enable rotating, default true
    rotate: boolean;
    //  the bounds of the phi rotation, default [0, Math.PI]
    phiBounds: [Radian, Radian];
    //  the bounds of the theta rotation, default [-Infinity, Infinity]
    thetaBounds: [Radian, Radian];
    //  the bounds of the distance, default [0, Infinity]
    distanceBounds: [number, number];
    //  the parent element, default window
    parent: HTMLElement;
    //  the element, default window
    element: HTMLElement;
  }

  /**
   * Generic controls for orbiting a target in 3D. Can be used to control a camera, a
   * 3D ray, or anything with { position, direction }.
   */
  const createControls: (config: Partial<Config>) => Controls;

  export default createControls;
}

declare module "perspective-camera" {
  interface Camera {
    // Updates the camera projection and view matrices from the camera's current state (position, direction, viewport, etc).
    update(): void;
    // Resets the position, direction, up, projection and view values to their identity; the defaults described in the constructor.
    identity(): void;
    // Translates this camera's position by the given vec3.
    translate(vec3: Tuple3): void;
    // Updates the direction and up to look at the given vec3 target.
    lookAt(vec3: Tuple3): void;
    // Projects the world space 3D point vec3 into 2D screen-space based on this camera's viewport bounds. Returns a new vec4 point with z and w components representing the computed depth (similar to gl_FragCoord).
    project(vec3: Tuple3): void;
    // Unprojects the screen-space point into 3D world-space. The Z of the screen-space point is between 0 (near plane) and 1 (far plane).
    unproject(vec3: Tuple3): void;
    // Creates a new picking ray from the 2D screen-space vec2 point (i.e. the mouse).
    // The ray is an instance of ray-3d, and it can be used for hit-testing
    createPickingRay(vec2: Tuple2): void;

    // A [x, y, width, height] array defining the viewport in screen space.
    viewport: [number, number, number, number];

    // The 4x4 projection and view matrices, computed after a call to update().
    projection: MatrixTuple4x4;
    view: MatrixTuple4x4;
    // The combined projection and view matrix.
    projView: MatrixTuple4x4;
    // The inverted combined projection and view matrix.
    invProjView: MatrixTuple4x4;

    // The current position, direction, and up vectors.
    position: Tuple3;
    // The current position, direction, and up vectors.
    direction: Tuple3;
    // The current position, direction, and up vectors.
    up: Tuple3;
  }

  interface Config {
    // field of view in radians, default Math.PI / 4
    fov: Radian;
    // the far range, default 100
    far: number;
    // the near range, default 1 / 100
    near: number;
    // the camera position, default [0, 0, 0]
    position: Tuple3;
    // the camera direction, default [0, 0, -1]
    direction: Tuple3;
    // the camera up vector, default [0, 1, 0]
    up: Tuple3;
    // the screen-space viewport bounds, default [-1, -1, 1, 1]
    viewport: Tuple4;
  }

  /**
   *
   */
  const createCamera: (config: Partial<Config>) => Camera;

  export default createCamera;
}

type RandomFn = (() => number) &
  ((max: number) => number) &
  ((min: number, max: number) => number) &
  ((min: number, max: number, isInteger: boolean) => number);

declare module "@tatumcreative/random" {
  const setupRandom: (...seed: Array<string | number>) => RandomFn;
  export default setupRandom;
}

declare module "glslify" {
  const glslify: (strings: TemplateStringsArray, ...rest: unknown[]) => string;
  export default glslify;
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
    search(
      area: RTreeRectangle,
      // eslint-disable-next-line @typescript-eslint/camelcase
      return_node?: boolean,
      // eslint-disable-next-line @typescript-eslint/camelcase
      return_array?: T[]
    ): T[];
  }

  const createRTRree: <T>(maxNodeWidth?: number) => RTree<T>;
  export default createRTRree;
}

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

declare module "delaunay-triangulate" {
  const delaunaryTrianglulate: (
    points: Tuple2[],
    pointAtInfinite?: Tuple2
  ) => Tuple3<Index>[];

  export default delaunaryTrianglulate;
}

// src/@types/jest-matcher-deep-close-to/index.d.ts
declare namespace jest {
  interface Matchers<R> {
    toBeDeepCloseTo: (
      expected: number | number[] | object,
      decimals?: number
    ) => R;
    toMatchCloseTo: (
      expected: number | number[] | object,
      decimals?: number
    ) => R;
  }
}

declare module "jest-matcher-deep-close-to" {
  export function toBeDeepCloseTo(
    received: number | number[] | object,
    expected: number | number[] | object,
    decimals?: number
  ): {
    message(): string;
    pass: boolean;
  };

  export function toMatchCloseTo(
    received: number | number[] | object,
    expected: number | number[] | object,
    decimals?: number
  ): {
    message(): string;
    pass: boolean;
  };
}
