import { GUI } from "dat.gui";
import createControls from "orbit-controls";
import createCamera from "perspective-camera";

import initializeShortcuts from "lib/shortcuts";
import { setupCanvas, loop, generateSeed } from "lib/draw";
import {
  Dance,
  DanceCamEventsToClient,
  Landmark,
  Pose,
} from "lib/dancecam/messages";
import lerp from "lerp";
import {
  BezierOnPath,
  DanceCam,
  DanceDatabase,
  LandmarkNames as LandmarkName,
  landmarks,
  LerpOnPath,
  PoseAnalysis,
} from "lib/dancecam";
import { exposeAsGlobal, LocationManager } from "lib/utils";
import { mat3, mat4, vec3, vec4 } from "lib/vec-math";
import { TimelineManager } from "./timeline";

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

  current.danceCam.onStartRecording = () => {
    current.danceRecording = [];
  };
  current.danceCam.onStopRecording = () => {
    return current.danceRecording;
  };
  current.danceCam.onChangeDance = (dance) => {
    LocationManager.updateValue("dance", current.danceCam.selectedDance);
    // Reset any smoothing.
    current.smoothedPoses = [];
    current.poses = [];
    if (dance) {
      current.danceReplay = new DanceReplay(dance);
      current.socket?.close();
    } else {
      current.danceReplay = null;
    }
  };

  loop((now) => {
    const nextTime = now * config.speed;
    current.dt = nextTime - current.time;
    current.time = nextTime;
    update(config, current);
    draw(config, current);
  });
}

class DanceReplay {
  dance: Dance;
  duration: number;
  startTime: number;
  endTime: number;
  scrubberTime: number;
  lastTimestamp: number | null;

  constructor(dance: Dance) {
    this.dance = dance;

    let startTime = Infinity;
    let endTime = -Infinity;
    for (const poseFrame of dance) {
      startTime = Math.min(startTime, poseFrame.timestamp);
      endTime = Math.max(endTime, poseFrame.timestamp);
    }
    this.duration =
      endTime -
      startTime +
      // Add on a bit of time for the last frame.
      (endTime - startTime) / dance.length;

    this.startTime = startTime;
    this.endTime = endTime;
    this.scrubberTime = 0;
    this.lastTimestamp = 0;
  }

  getCurrentPoses(now: number): Pose[] {
    if (this.lastTimestamp === null) {
      this.lastTimestamp = now;
    }
    // Advance the scrubberTime.
    const nextTimestamp = now;
    const dt = nextTimestamp - this.lastTimestamp;
    this.lastTimestamp = nextTimestamp;
    this.scrubberTime = (this.scrubberTime + dt) % this.duration;

    // Find the poseFrame for the scrubber time.
    let targetPoseFrame = this.dance[0];
    const scrubberTimestamp = this.scrubberTime + this.startTime;
    for (const poseFrame of this.dance) {
      if (poseFrame.timestamp > scrubberTimestamp) {
        break;
      }
      targetPoseFrame = poseFrame;
    }

    return targetPoseFrame.poses;
  }
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

  const danceCam = await DanceCam.create(
    danceDB,
    document.body,
    LocationManager.getString("dance")
  );

  const dance = await danceCam.getSelectedDance();
  const danceReplay = dance ? new DanceReplay(dance) : null;

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

  return {
    gui,
    camera,
    controls,
    danceDB,
    danceCam,
    danceReplay,
    pointPaths: new PointPaths(config),
    lerpOnPath: new LerpOnPath(),
    bezierOnPath: new BezierOnPath(),
    danceRecording: [] as Dance,
    time: 0,
    dt: 0,
    // TODO -- Add UI to specify this.
    wsUrl: "ws://localhost:8765",
    // wsUrl: "ws://dancecam1.local:8765",
    isConnecting: false,
    // wsUrl: 'ws://dancecam1.local:8765'
    socket: null as null | WebSocket,
    poses: [] as Pose[],
    poseAnalysis: new PoseAnalysis(),
    smoothedPoses: [] as Pose[],
    transformedPoses: [] as Array<Tuple3[]>,
    // Flip the camera image.
    flip: true,
    frame: null as HTMLImageElement | null,
    poseLatencyMS: 0,
    lastPostTimeMS: 0,
    showFrameRequested: false,
    timelineManager: new TimelineManager(document.body, danceDB),
  };
}

function update(config: Config, current: Current): void {
  if (
    !current.socket &&
    !current.isConnecting &&
    !document.hidden &&
    !current.danceReplay
  ) {
    // This is either the first update called, or the connection was dropped to the camera
    // because it was unavailable or because we tabbed out and the document was hidden.
    // Attempt to start a connection.
    current.isConnecting = true;
    connectClient(current);
  }

  if (!current.socket && !current.danceReplay) {
    // There is no connection, and there is no dance replay, so don't update
    // anything else.
    return;
  }

  if (current.danceReplay) {
    // Update the poses from the dance replay.
    current.poses = current.danceReplay.getCurrentPoses(current.time * 1000);
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

  // Adjust the requests for showing the frame.
  if (current.socket) {
    if (config.showFrame && !current.showFrameRequested) {
      current.socket.send(JSON.stringify({ type: "show-frame", show: true }));
      current.showFrameRequested = true;
    } else if (!config.showFrame && current.showFrameRequested) {
      current.socket.send(JSON.stringify({ type: "show-frame", show: false }));
      current.showFrameRequested = false;
    }
  }
  if (!config.showFrame && current.frame) {
    current.frame.remove();
    current.frame = null;
  }

  // TODO identify how to drop / add poses gracefully.
  if (current.poses.length > current.smoothedPoses.length) {
    current.smoothedPoses = current.poses.map((pose) => {
      return pose.map((landmark) => landmark.slice() as Landmark);
    });
  }

  updatePoseSmoothing(config, current);
  if (current.smoothedPoses.length) {
    current.poseAnalysis.update(current.smoothedPoses[0]);
  }

  current.pointPaths.update(config, current);

  current.transformedPoses = current.smoothedPoses.map((pose) =>
    pose.map((landmark) =>
      vec3.rotateY(vec3.create(), landmark as any as Tuple3, [0, 0, 0], 0)
    )
  );
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

  update(config: Config, current: Current) {
    const { bezierOnPath } = current;
    const { pointPathConfig } = config;

    // Copy over the paths from the pose.
    const { poseAnalysis } = current;
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

/**
 * Apply smoothing to the poses.
 */
function updatePoseSmoothing(config: Config, current: Current) {
  const { poses, smoothedPoses } = current;
  const poseSmoothing = config.poseSmoothing * (1 + 1 / config.speed / 100);

  for (let i = 0; i < poses.length; i++) {
    const pose = poses[i];
    const smoothedPose = smoothedPoses[i];

    for (let j = 0; j < pose.length; j++) {
      const landmark1 = pose[j];
      const landmark2 = smoothedPose[j];

      landmark2[0] = lerp(landmark1[0], landmark2[0], poseSmoothing); // x
      landmark2[1] = lerp(landmark1[1], landmark2[1], poseSmoothing); // y
      landmark2[2] = lerp(landmark1[2], landmark2[2], poseSmoothing); // z
      landmark2[3] = lerp(landmark1[3], landmark2[3], poseSmoothing); // visibility
      landmark2[4] = lerp(landmark1[4], landmark2[4], poseSmoothing); // presence

      // The depth is totally busted.
      // landmark2[2] *= 0.0; // z

      // landmark2[0] = landmark1[0];
      // landmark2[1] = landmark1[1];
      // landmark2[2] = landmark1[2];
      // landmark2[3] = landmark1[3];
      // landmark2[4] = landmark1[4];
    }
  }
}

function draw(config: Config, current: Current): void {
  const { ctx } = config;
  const poses = current.transformedPoses;

  // Clear out background.
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  if (config.showDebugInfo) {
    ctx.fillStyle = "#fff";
    const size = Math.round(8 * devicePixelRatio);
    ctx.fillRect(
      size + Math.sin(current.time * 3) * size * 2 + size,
      size * 0.5,
      size * 0.5,
      size * 0.5
    );
    if (current.poseLatencyMS) {
      ctx.font = `${size}px sans-serif`;
      ctx.fillText(`${current.poseLatencyMS}ms pose`, size, size * 2.5);
      ctx.fillText(`${current.poses.length} poses detected`, size, size * 3.5);
    }
  }

  // Draw the points of the poses.
  ctx.fillStyle = "#fff";
  const w = 10;
  const hw = w / 2;
  const midScreen = innerWidth / 2;
  const scaleX = innerHeight;
  const scaleY = innerHeight;
  for (const pose of poses) {
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
    drawPoseAnalysis(config, current);
  }

  current.pointPaths.draw(config, current);
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

function drawPoseAnalysis(config: Config, current: Current) {
  const { poseAnalysis } = current;

  const { ctx } = config;

  ctx.fillStyle = "#fff";
  const size = 30;
  ctx.font = `${size}px sans-serif`;
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

function connectClient(current: Current) {
  const { wsUrl } = current;
  console.log("Connecting to", current.wsUrl);
  const socket = new WebSocket(current.wsUrl);

  // Close the socket when tabbing away. It will be reopened once the document is visible.
  const onVisibilityChange = () => {
    if (document.hidden) {
      removeEventListener("visibilitychange", onVisibilityChange);
      socket.close();
    }
  };
  addEventListener("visibilitychange", onVisibilityChange);

  // Connection opened
  socket.addEventListener("open", (event) => {
    current.isConnecting = false;
    current.showFrameRequested = false;
    console.log("WebSocket connection established", wsUrl);
    current.socket = socket;
    socket.send(JSON.stringify({ type: "watch-poses" }));
  });

  socket.addEventListener("message", (event) => {
    const data: DanceCamEventsToClient = JSON.parse(event.data);
    switch (data.type) {
      case "models":
        console.log("Available models:", data.models);
        break;
      case "error":
        console.error("Error:", data.message);
        break;
      case "frame": {
        if (!current.frame) {
          current.frame = new Image();
          current.frame.style.opacity = "0.5";
          current.frame.style.transform = "scaleX(-1)";
          document.body.appendChild(current.frame);
        }
        current.frame.src = "data:image/png;base64," + data.image;

        break;
      }
      case "poses": {
        const { posesFrame } = data;
        const { poses, resolution } = posesFrame;
        if (!poses.length) {
          // Ignore dropped poses
          return;
        }
        current.poses = poses;
        if (current.danceCam.isRecording) {
          current.danceRecording.push(posesFrame);
        }

        const now = performance.now();
        if (current.lastPostTimeMS) {
          current.poseLatencyMS = now - current.lastPostTimeMS;
        }
        current.lastPostTimeMS = now;

        // The landmarks come in squished from the original resolution of
        // something like 640x480 as a value between -1 and 1.
        for (const pose of poses) {
          for (const landmark of pose) {
            if (current.flip) {
              landmark[0] = 1 - landmark[0];
            }
            landmark[0] -= 0.5;
            landmark[0] *= resolution[0] / resolution[1];
          }
        }
        break;
      }
      default:
      // Do nothing
    }
  });

  socket.addEventListener("close", (event) => {
    current.isConnecting = false;
    current.socket = null;
    if (current.frame) {
      current.frame.remove();
      current.frame = null;
    }
    current.poses = [];
    current.smoothedPoses = [];
    console.log("WebSocket connection closed", wsUrl);
  });

  socket.addEventListener("error", (event) => {
    console.error("WebSocket error:", event);
  });
}

function transformPointWithProjViewMatrix(
  point: Tuple3,
  projViewMatrix: MatrixTuple4x4
): Tuple3 {
  // Convert the 3D point to a 4D vector (homogeneous coordinates)
  const point4D = vec4.fromValues(point[0], point[1], point[2], 1);

  // Transform the point by the projection-view matrix
  const transformedPoint = vec4.create();
  vec4.transformMat4(transformedPoint, point4D, projViewMatrix);

  // Convert the result back to a 3D point (divide by w)
  const w = transformedPoint[3];
  if (w !== 0) {
    return [
      transformedPoint[0] / w,
      transformedPoint[1] / w,
      transformedPoint[2] / w,
    ];
  }
  throw new Error("Transformation resulted in w = 0, point is at infinity.");
}
