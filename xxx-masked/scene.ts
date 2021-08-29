import { Regl, DefaultContext, DrawCommand } from "regl";
import { vec3, mat3, mat4 } from "vec-math";
import createControls from "orbit-controls";
import createCamera from "perspective-camera";

const simplex = new (require("simplex-noise"))();

const TAU = 6.283185307179586;
const FOV = TAU * 0.1;

export type SceneContext = ApplyDynamicConfig<ReturnType<typeof getContext>> & DefaultContext;

function getUniforms(regl: Regl) {
  const camera = createCamera({
    fov: FOV,
    near: 0.1,
    far: 10,
    position: [0, 0, 1],
  });

  const controls = createControls({
    phi: Math.PI * 0.4,
    theta: 0.2,
    distanceBounds: [0.5, 1.5],
    phiBounds: [Math.PI * 0.4, Math.PI * 0.6],
    zoomSpeed: 0.00001,
    pinchSpeed: 0.00001,
    rotateSpeed: 0.0025,
    damping: 0.01,
    parent: regl._gl.canvas as HTMLElement,
    element: regl._gl.canvas as HTMLElement,
  });

  camera.update();

  let prevTick: Integer;
  function update<T>(callback: () => T) {
    return ({ tick, viewportWidth, viewportHeight }: DefaultContext): T => {
      if (tick !== prevTick) {
        // vec3.rotateY(controls.position, controls.position, ORIGIN, 0.001)
        controls.update();
        controls.copyInto(camera.position, camera.direction, camera.up);
        camera.viewport[2] = viewportWidth;
        camera.viewport[3] = viewportHeight;
        camera.update();
        prevTick = tick;
      }
      return callback();
    };
  }

  return {
    projection: update(() => camera.projection),
    view: () => camera.view,
    projView: () => camera.projView,
    inverseProjection: () => mat4.invert([], camera.projection),
    inverseView: () => mat4.invert([], camera.view),
    viewNormal: () => mat3.normalFromMat4([], camera.view),
    projectionViewNormal: () => mat3.normalFromMat4([], camera.projView),
    light0: vec3.normalize([], [0, 1, 0.1]),
    light1: vec3.normalize([], [0.5, -1, 0.5]),
    light2: vec3.normalize([], [-0.5, 0.2, 0.8]),
    lightColor0: vec3.scale([], [1.0, 0.9, 0.9], 0.6 * 0),
    lightColor1: vec3.scale([], [0.8, 1.0, 1.0], 0.6 * 0),
    lightColor2: vec3.scale([], [0.8, 0.8, 1.0], 0.6 * 0),
    time: ({ time }: DefaultContext) => time,
    cameraPosition: () => camera.position,
  };
}

function getContext() {
  return {
    fov: FOV,
    headModel: (() => {
      const out = mat4.create();
      const eye: Tuple3 = [0, 0, -1];
      const center: Tuple3 = [0, 0, 0];
      const up: Tuple3 = [0, 1, 0];
      return ({ time }: DefaultContext) => {
        center[0] = simplex.noise2D(time * 0.1, 0) * 0.05;
        center[1] = simplex.noise2D(time * 0.1, 10) * 0.025;
        up[0] = simplex.noise2D(time * 0.1, 10) * 0.25;

        eye[0] = simplex.noise2D(time * 0.05, 0) * 0.25;
        // return mat4.identity(out)
        return mat4.lookAt(out, center, eye, up);
      };
    })(),
  };
}

export default function draw(regl: Regl): DrawCommand {
  return regl({
    uniforms: {
      uniforms: getUniforms(regl),
      context: getContext(),
    },
  });
}
