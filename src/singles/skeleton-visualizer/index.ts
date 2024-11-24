import { GUI } from "dat.gui";

import initializeShortcuts from "lib/shortcuts";
import { setupCanvas, loop, generateSeed } from "lib/draw";
import {
  Dance,
  DanceCamEventsToClient,
  Landmark,
  Pose,
} from "lib/dancecam/messages";
import lerp from "lerp";
import { DanceCam, DanceDatabase } from "lib/dancecam";
import { exposeAsGlobal } from "lib/utils";

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
]

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
    updateLocationValue("dance", current.danceCam.selectedDance);
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
    current.time = now;
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
  lastTimestamp: number;

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
    this.lastTimestamp = Date.now();
  }

  getCurrentPoses(): Pose[] {
    // Advance the scrubberTime.
    const nextTimestamp = Date.now();
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

  return {
    ctx,
    seed,
    poseSmoothing: getLocationNumber("poseSmoothing", 0.9),
    showFrame: getLocationBoolean("showFrame", false),
    showDebugInfo: getLocationBoolean("showDebugInfo", false),
  };
}

async function getCurrent(config: Config) {
  const gui = new GUI();
  const danceDB = await DanceDatabase.create();
  const folder = gui.addFolder("Config");
  folder
    .add(config, "poseSmoothing", 0, 1)
    .onChange((value) => updateLocationValue("poseSmoothing", value));
  folder
    .add(config, "showFrame")
    .onChange((value) => updateLocationValue("showFrame", value));
  folder
    .add(config, "showDebugInfo")
    .onChange((value) => updateLocationValue("showDebugInfo", value));

  const danceCam = await DanceCam.create(
    danceDB,
    document.body,
    getLocationString("dance")
  );

  const dance = await danceCam.getSelectedDance();
  const danceReplay = dance ? new DanceReplay(dance) : null;

  return {
    gui,
    danceDB,
    danceCam,
    danceReplay,
    danceRecording: [] as Dance,
    time: 0,
    // TODO -- Add UI to specify this.
    wsUrl: "ws://localhost:8765",
    // wsUrl: "ws://dancecam1.local:8765",
    isConnecting: false,
    // wsUrl: 'ws://dancecam1.local:8765'
    socket: null as null | WebSocket,
    poses: [] as Pose[],
    smoothedPoses: [] as Pose[],
    // Flip the camera image.
    flip: true,
    frame: null as HTMLImageElement | null,
    poseLatencyMS: 0,
    lastPostTimeMS: 0,
    showFrameRequested: false,
  };
}

function update(config: Config, current: Current): void {
  if (
    !current.socket &&
    !current.isConnecting &&
    !document.hidden &&
    !current.danceReplay
  ) {
    current.isConnecting = true;
    connectClient(current);
  }

  if (!current.socket && !current.danceReplay) {
    return;
  }

  if (current.danceReplay) {
    current.poses = current.danceReplay.getCurrentPoses();
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
}

/**
 * Apply smoothing to the poses.
 */
function updatePoseSmoothing(config: Config, current: Current) {
  const { poses, smoothedPoses } = current;
  const { poseSmoothing } = config;

  for (let i = 0; i < poses.length; i++) {
    const pose = poses[i];
    const smoothedPose = smoothedPoses[i];

    for (let j = 0; j < pose.length; j++) {
      const landmark1 = pose[j];
      const landmark2 = smoothedPose[j];
      landmark2[0] = lerp(landmark1[0], landmark2[0], poseSmoothing);
      landmark2[1] = lerp(landmark1[1], landmark2[1], poseSmoothing);
      landmark2[2] = lerp(landmark1[2], landmark2[2], poseSmoothing);
      landmark2[3] = lerp(landmark1[3], landmark2[3], poseSmoothing);
      landmark2[4] = lerp(landmark1[4], landmark2[4], poseSmoothing);

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
  const { smoothedPoses } = current;

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
  for (const pose of smoothedPoses) {
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

    // Draw the points
    for (const [x, y, z, visibility, presence] of pose) {
      ctx.fillRect(x * scaleX - hw + midScreen, y * scaleY - hw, w, w);
    }
  }
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

function getLocationString(key: string, defaultValue?: string) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(key) ?? defaultValue;
}

function getLocationNumber(key: string, defaultValue = 0) {
  const urlParams = new URLSearchParams(window.location.search);
  const storedValue = urlParams.get(key);
  if (storedValue === null) {
    return defaultValue;
  }
  const number = Number(storedValue);
  if (Number.isNaN(number)) {
    return defaultValue;
  }
  return number;
}

function getLocationBoolean(key: string, defaultValue = false) {
  const urlParams = new URLSearchParams(window.location.search);
  const storedValue = urlParams.get(key);
  if (storedValue === null) {
    return defaultValue;
  }
  return storedValue === "true";
}

function updateLocationValue(key: string, value: string) {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set(key, value);
  const url = new URL(window.location.href);
  const newLocation = `${url.origin}${url.pathname}?${urlParams}`;
  history.replaceState(null, "", newLocation);
}
