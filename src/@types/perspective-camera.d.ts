declare module "perspective-camera" {
  /**
   * https://github.com/Jam3/ray-3d
   */
  export class Ray3d {
    // Defaults to [0, 0, 0].
    direction: Tuple3;
    // Defaults to [0, 0, -1].
    origin: Tuple3;

    constructor(origin?: Tuple3, direction?: Tuple3);
    // Assigns this ray's origin and direction to the given values.
    set(origin: Tuple3, direction: Tuple3): void;
    // Copies the origin and direction from the otherRay into this ray.
    copy(other: Ray3d): void;
    // Deep clones this ray into a new Ray instance.
    clone(): Ray3d;
    // Whether this ray intersects with the sphere at center [x, y, z] and radius.
    intersectsSphere(center: Tuple3, radius: number): Tuple3 | null;
    // Whether this ray intersects the plane with the unit normal [x, y, z] and distance from origin.
    intersectsPlane(normal: Tuple3, distance: number): Tuple3 | null;
    // Whether this ray intersects with the triangle:
    // [ [x1, y1, z1], [x2, y2, z2], [x3, y3, z3] ]
    intersectsTriangle(triange: Triangle): Tuple3 | null;
    // Whether this ray intersects with the triangle cell, where cell is a face like so:
    // [ a, b, c ]
    // Where [ a, b, c ] are indices into the positions array:
    // [ [x1, y1, z1], [x2, y2, z2] ... ]
    intersectsTriangleCell(
      cell: Tuple3<Index>,
      positions: Tuple3[]
    ): Tuple3 | null;
    //   Whether this ray intersects with the Axis-Aligned Bounding Box aabb:
    // [ [x1, y1, z1], [x2, y2, z2] ]
    intersectsAABB(aabb: [Tuple3, Tuple3]): Tuple3 | null;
  }

  export interface PerspectiveCamera {
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
    createPickingRay(vec2: Tuple2): Ray3d;

    // A [x, y, width, height] array defining the viewport in screen space.
    viewport: [number, number, number, number];

    // The 4x4 projection and view matrices, computed after a call to update().
    projection: MatrixTuple4x4;
    view: MatrixTuple4x4;
    // The combined projection and view matrix.
    projView: MatrixTuple4x4;
    // The inverted combined projection and view matrix.
    invProjView: MatrixTuple4x4;

    // field of view in radians, default Math.PI / 4
    fov: Radian;
    // The current position, direction, and up vectors.
    position: Tuple3;
    // The current position, direction, and up vectors.
    direction: Tuple3;
    // The current position, direction, and up vectors.
    up: Tuple3;
  }

  export interface PerspectiveCameraConfig {
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
  const createCamera: (config: Partial<PerspectiveCameraConfig>) => PerspectiveCamera;

  export default createCamera;
}
