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
