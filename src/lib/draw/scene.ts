import { Regl, DefaultContext, DrawCommand } from "lib/regl";
import { vec3, mat3, mat4 } from "lib/vec-math";
import createControls, {
  OrbitControls,
  OrbitControlsConfig,
} from "orbit-controls";
import createCamera, {
  PerspectiveCamera,
  PerspectiveCameraConfig,
} from "perspective-camera";

const TAU = 6.283185307179586;
const FOV = TAU * 0.1;

export type SceneContext = ApplyDynamicConfig<ReturnType<typeof getContext>> &
  DefaultContext;

interface SceneConfig {
  orbit?: Partial<OrbitControlsConfig>;
  perspective?: Partial<PerspectiveCameraConfig>;
}

function getUniforms(camera: PerspectiveCamera, controls: OrbitControls) {
  let prevTick: Integer;
  function update<T>(callback: () => T) {
    return ({ tick, viewportWidth, viewportHeight }: DefaultContext): T => {
      if (tick !== prevTick) {
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

function getContext(camera: PerspectiveCamera, controls: OrbitControls) {
  return {
    fov: FOV,
    camera,
    controls,
    view: () => camera.view,
  };
}

export function createSetupScene(
  regl: Regl,
  config: SceneConfig = {}
): DrawCommand {
  const camera = createCamera({
    fov: FOV,
    near: 0.1,
    far: 10,
    position: [0, 0, 1],
    ...(config.perspective || {}),
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
    ...(config.orbit || {}),
  });

  return regl({
    name: "setupScene",
    uniforms: getUniforms(camera, controls),
    context: getContext(camera, controls),
  });
}
