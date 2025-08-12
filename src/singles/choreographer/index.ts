import { GUI } from "dat.gui";
import createControls from "orbit-controls";
import createCamera from "perspective-camera";

import initializeShortcuts from "lib/shortcuts";
import { setupCanvas, loop, generateSeed } from "lib/draw";
import {
  Dance,
  PoseCamEventsToClient,
  Landmark,
  Pose,
} from "lib/posecam/messages";
import lerp from "lerp";
import {
  BezierOnPath,
  PoseCam,
  DanceDatabase,
  LandmarkNames as LandmarkName,
  landmarks,
  LerpOnPath,
  PoseAnalysis,
} from "lib/posecam";
import { ensureExists, exposeAsGlobal, LocationManager } from "lib/utils";
import { mat3, mat4, vec3, vec4 } from "lib/vec-math";
import * as Timeline from "lib/timeline";

type Config = ReturnType<typeof getConfig>;
type Current = Awaited<ReturnType<typeof getCurrent>>;

// prettier-ignore
const poseConnections = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5],
  [5, 6], [6, 8], [9, 10], [11, 12], [11, 13],
  [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
  [18, 20], [11, 23], [12, 24], [23, 24], [23, 25],
  [24, 26], [25, 27], [26, 28], [27, 29], [28, 30],
  [29, 31], [30, 32], [27, 31], [28, 32]
];

main();

async function main() {
  const config = getConfig();
  const current = await getCurrent(config);
  exposeAsGlobal("current", current);
  exposeAsGlobal("config", config);

  loop((now) => {
    const nextTime = now * config.speed;
    current.dt = nextTime - current.time;
    current.time = nextTime;
    update(config, current);
    draw(config, current);
  });
}

function getConfig() {
  const seed = generateSeed();
  const ctx = setupCanvas();

  initializeShortcuts(seed);

  const landmarksByName: Record<string, LandmarkName[]> = {
    footToHandR2L: [
      "right heel",
      "right ankle",
      "right knee",
      "right hip",
      "left shoulder",
      "left elbow",
      "left wrist",
      "left index knuckle",
    ],
    footToHandL2R: [
      "left heel",
      "left ankle",
      "left knee",
      "left hip",
      "right shoulder",
      "right elbow",
      "right wrist",
      "right index knuckle",
    ],
  };

  return {
    ctx,
    seed,
    speed: 0.1,
    pointPathConfig: {
      speed: 0.001,
      pointCount: 50,
      landmarksByName,
    },
    poseSmoothing: LocationManager.getNumber("poseSmoothing", 0.9),
    showFrame: LocationManager.getBoolean("showFrame", false),
    showDebugInfo: LocationManager.getBoolean("showDebugInfo", false),
  };
}

async function getCurrent(config: Config) {
  const gui = new GUI();
  const danceDB = await DanceDatabase.create();
  const folder = gui.addFolder("Config");
  folder
    .add(config, "poseSmoothing", 0, 1)
    .onChange((value) => LocationManager.updateNumber("poseSmoothing", value));
  folder
    .add(config, "speed", 0, 1)
    .onChange((value) => LocationManager.updateNumber("speed", value));
  folder
    .add(config, "showFrame")
    .onChange((value) => LocationManager.updateValue("showFrame", value));
  folder
    .add(config, "showDebugInfo")
    .onChange((value) => LocationManager.updateValue("showDebugInfo", value));

  const controls = createControls({
    phi: Math.PI * 0.4,
    theta: 0.2,
    distanceBounds: [0.5, 1.5],
    phiBounds: [Math.PI * 0.4, Math.PI * 0.6],
    zoomSpeed: 0.001,
    pinchSpeed: 0.001,
    rotateSpeed: 0.025,
    damping: 0.01,
    element: config.ctx.canvas,
  });

  const camera = createCamera({
    near: 0.01,
    far: 10,
    position: [0, 0, 3],
  });

  const timelineManager = await Timeline.Manager.create(danceDB);
  document.body.appendChild(timelineManager);

  return {
    gui,
    camera,
    controls,
    danceDB,
    pointPathsMap: new WeakMap<PoseAnalysis, PointPaths>(),
    lerpOnPath: new LerpOnPath(),
    bezierOnPath: new BezierOnPath(),
    time: 0,
    dt: 0,
    timelineManager,
  };
}

function update(config: Config, current: Current): void {
  current.timelineManager.update();

  const { timeline } = current.timelineManager;
  if (timeline) {
    for (const poseCamRow of timeline.getPoseCamRows()) {
      for (const poseAnalysis of poseCamRow.poseAnalyses) {
        let pointPaths = current.pointPathsMap.get(poseAnalysis);
        if (!pointPaths) {
          pointPaths = new PointPaths(config);
          current.pointPathsMap.set(poseAnalysis, pointPaths);
        }
        pointPaths.update(config, current, poseAnalysis);
      }
    }
  }

  {
    // Update the camera.
    const { controls, camera } = current;
    controls.update();
    controls.copyInto(camera.position, camera.direction, camera.up);
    camera.update();

    camera.view;
    camera.projection;
  }
}

/**
 * Move points along a path.
 */
interface PointPath {
  name: string;
  path: Tuple3[];
  landmarkNames: LandmarkName[];

  /**
   * The random points moving around the path.
   */
  points: Tuple3[];

  /**
   * How far the point is along the unit interval of the length of the path, this is
   * the "t" value.
   */
  tValues: number[];
}

class PointPaths {
  pointPaths: PointPath[] = [];

  constructor({ pointPathConfig }: Config) {
    for (const [pathName, landmarks] of Object.entries(
      pointPathConfig.landmarksByName
    )) {
      const points: Tuple3[] = [];
      const tValues: number[] = [];
      this.pointPaths.push({
        name: pathName,
        landmarkNames: landmarks,
        // Starts out as (0,0,0) and the pose gets copied over during update.
        path: landmarks.map(() => vec3.create()),
        tValues,
        points,
      });

      for (let i = 0; i < pointPathConfig.pointCount; i++) {
        points.push(vec3.create());
        tValues.push(i / pointPathConfig.pointCount);
      }
    }
  }

  update(config: Config, current: Current, poseAnalysis: PoseAnalysis) {
    const { bezierOnPath } = current;
    const { pointPathConfig } = config;

    // Copy over the paths from the pose.
    for (const { path, landmarkNames } of this.pointPaths) {
      for (let i = 0; i < path.length; i++) {
        const landmarkName = landmarkNames[i];
        vec3.copy(path[i], poseAnalysis.getTuple3(landmarkName));
      }
    }

    // Move the paths more forward along the path.
    for (const { path, points, tValues } of this.pointPaths) {
      bezierOnPath.setPath(path);
      for (let i = 0; i < points.length; i++) {
        tValues[i] = (tValues[i] + pointPathConfig.speed * current.dt) % 1;
        bezierOnPath.getValue(tValues[i], points[i]);
      }
    }
  }

  draw(config: Config, current: Current) {
    const { ctx } = config;
    const { bezierOnPath } = current;

    // Draw the points of the poses.
    ctx.fillStyle = "#ff00ff99";
    const w = 7;
    const hw = w / 2;
    const midScreen = innerWidth / 2;
    const scaleX = innerHeight;
    const scaleY = innerHeight;
    for (const { points } of this.pointPaths) {
      for (const [x, y] of points) {
        ctx.fillRect(x * scaleX - hw + midScreen, y * scaleY - hw, w, w);
      }
    }

    if (config.showDebugInfo) {
      // Draw the connections
      ctx.lineWidth = 1 * devicePixelRatio;
      ctx.beginPath();
      ctx.strokeStyle = "#0ff4";

      for (
        let segmentIndex = 0;
        segmentIndex < bezierOnPath.path.length - 1;
        segmentIndex++
      ) {
        const [xa, ya] = bezierOnPath.path[segmentIndex];
        const [xb, yb] = bezierOnPath.path[segmentIndex + 1];
        ctx.moveTo(xa * scaleX - hw + midScreen, ya * scaleY);
        ctx.lineTo(xb * scaleX - hw + midScreen, yb * scaleY);
      }
      ctx.stroke();

      ctx.fillStyle = "#ffff0099";
      for (let i = 0; i < bezierOnPath.controlPointsStart.length; i++) {
        const [x, y] = bezierOnPath.controlPointsStart[i];
        ctx.fillText(String(i), x * scaleX - hw + midScreen, y * scaleY - hw);
        ctx.fillRect(x * scaleX - hw + midScreen, y * scaleY - hw, w, w);
      }
      ctx.fillStyle = "#00ffff99";
      for (let i = 0; i < bezierOnPath.controlPointsEnd.length; i++) {
        const [x, y] = bezierOnPath.controlPointsEnd[i];
        ctx.fillRect(x * scaleX - hw + midScreen, y * scaleY - hw, w, w);
        ctx.fillText(String(i), x * scaleX - hw + midScreen, y * scaleY - hw);
      }
    }
  }
}

function draw(config: Config, current: Current): void {
  const { ctx } = config;

  current.timelineManager.draw();

  // Clear out background.
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  const fontSize = Math.round(8 * devicePixelRatio);
  if (config.showDebugInfo) {
    ctx.fillStyle = "#fff";
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillRect(
      fontSize + Math.sin(current.time * 3) * fontSize * 2 + fontSize,
      fontSize * 0.5,
      fontSize * 0.5,
      fontSize * 0.5
    );
  }

  const { timeline } = current.timelineManager;
  if (timeline) {
    // Draw the points of the poses.
    ctx.fillStyle = "#fff";
    const w = 10;
    const hw = w / 2;
    const midScreen = innerWidth / 2;
    const scaleX = innerHeight;
    const scaleY = innerHeight;
    for (const poseCamRow of timeline.getPoseCamRows()) {
      for (const pose of poseCamRow.smoothedPoses) {
        ctx.lineWidth = 1 * devicePixelRatio;
        // Draw the connections
        ctx.beginPath();
        for (const [a, b] of poseConnections) {
          const [xa, ya] = pose[a];
          const [xb, yb] = pose[b];
          ctx.moveTo(xa * scaleX - hw + midScreen, ya * scaleY);
          ctx.lineTo(xb * scaleX - hw + midScreen, yb * scaleY);
        }
        ctx.strokeStyle = "#fff4";
        ctx.stroke();

        drawLine(config, current, pose, [
          "right index knuckle",
          "right wrist",
          "right elbow",
          "right shoulder",
          "left shoulder",
          "left elbow",
          "left wrist",
          "left index knuckle",
        ]);

        // Draw the points
        for (const [x, y] of pose) {
          ctx.fillRect(x * scaleX - hw + midScreen, y * scaleY - hw, w, w);
        }
      }
      if (config.showDebugInfo) {
        for (const poseAnalysis of poseCamRow.poseAnalyses) {
          drawPoseAnalysis(config, poseAnalysis);
        }
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillText(
          `${poseCamRow.poseLatencyMS}ms pose`,
          fontSize,
          fontSize * 2.5
        );
        ctx.fillText(
          `${poseCamRow.poses.length} poses detected`,
          fontSize,
          fontSize * 3.5
        );
      }
    }
    for (const poseCamRow of timeline.getPoseCamRows()) {
      for (const poseAnalysis of poseCamRow.poseAnalyses) {
        const pointsPath = ensureExists(
          current.pointPathsMap.get(poseAnalysis),
          "Expected a PointPaths object from a poseAnalysis"
        );
        pointsPath.draw(config, current);
      }
    }
  }
}

function drawLine(
  config: Config,
  current: Current,
  pose: Pose | Tuple3[],
  line: LandmarkName[]
) {
  const { ctx } = config;
  const w = 10;
  const hw = w / 2;
  const midScreen = innerWidth / 2;
  const scaleX = innerHeight;
  const scaleY = innerHeight;
  ctx.beginPath();
  for (let i = 1; i < line.length; i++) {
    const [xa, ya] = pose[landmarks[line[i - 1]]];
    const [xb, yb] = pose[landmarks[line[i]]];
    ctx.moveTo(xa * scaleX - hw + midScreen, ya * scaleY);
    ctx.lineTo(xb * scaleX - hw + midScreen, yb * scaleY);
  }
  ctx.lineWidth = 2 * devicePixelRatio;
  ctx.strokeStyle = "#f00";
  ctx.stroke();
}

const poseAngles = [
  "upperArmAngleLeft",
  "upperArmAngleRight",
  "forearmAngleLeft",
  "forearmAngleRight",
  // "elbowForwardBackLeft",
  // "elbowForwardBackRight",
] as const;

function drawPoseAnalysis(config: Config, poseAnalysis: PoseAnalysis) {
  const { ctx } = config;

  ctx.fillStyle = "#fff";
  const size = 30;
  ctx.font = `${size}px system-ui`;
  for (let i = 0; i < poseAngles.length; i++) {
    const key = poseAngles[i];
    ctx.fillText(
      `${key} : ${poseAnalysis[key].toFixed(2)}`,
      5,
      size * i * 1.5 + size
    );
  }
  poseAnalysis.getTuple3("left shoulder"),
    poseAnalysis.getTuple3("left elbow"),
    poseAnalysis.getTuple3("left wrist");
}
