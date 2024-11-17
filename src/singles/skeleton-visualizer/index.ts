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
import { DanceCamGUI, DanceDatabase } from "lib/dancecam/pose-db";

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

  current.danceCamGUI.onStartRecording = () => {
    current.recording = "starting";
  };
  current.danceCamGUI.onStartRecording = () => {
    current.recording = "off";
    return current.dance;
  };
  (window as any).current = current;
  (window as any).config = config;

  loop((now) => {
    current.time = now;
    update(config, current);
    draw(config, current);
  });

  window.onhashchange = function (): void {
    location.reload();
  };
}

function getConfig() {
  const seed = generateSeed();
  const ctx = setupCanvas();

  initializeShortcuts(seed);

  return {
    ctx,
    seed,
    poseSmoothing: 0.9,
    showFrame: false,
  };
}

async function getCurrent(config: Config) {
  const gui = new GUI();
  const danceDB = await DanceDatabase.create();
  const folder = gui.addFolder("Config");
  folder.add(config, "poseSmoothing", 0, 1);
  folder.add(config, "showFrame", false);

  return {
    gui,
    danceDB,
    danceCamGUI: await DanceCamGUI.create(gui, danceDB),
    recording: "off" as "off" | "starting" | "on",
    dance: [] as Dance,
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
  if (!current.socket && !current.isConnecting && !document.hidden) {
    current.isConnecting = true;
    connectClient(current);
  }
  if (!current.socket) {
    return;
  }

  // Adjust the requests for showing the frame.
  if (config.showFrame && !current.showFrameRequested) {
    current.socket.send(JSON.stringify({ type: "show-frame", show: true }));
    current.showFrameRequested = true;
  } else if (!config.showFrame && current.showFrameRequested) {
    current.socket.send(JSON.stringify({ type: "show-frame", show: false }));
    current.showFrameRequested = false;
  }
  if (!config.showFrame && current.frame) {
    current.frame.remove();
    current.frame = null;
  }

  // TODO identify how to drop / add poses gracefully.
  if (current.poses.length > current.smoothedPoses.length) {
    current.smoothedPoses = current.poses.map((pose) => {
      return {
        timestamp: pose.timestamp,
        landmarks: pose.landmarks.map(
          (landmark) => landmark.slice() as Landmark
        ),
      };
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

    for (let j = 0; j < pose.landmarks.length; j++) {
      const landmark1 = pose.landmarks[j];
      const landmark2 = smoothedPose.landmarks[j];
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

  // Draw the points of the poses.
  ctx.fillStyle = "#fff";
  const w = 10;
  const hw = w / 2;
  const midScreen = innerWidth / 2;
  const scaleX = innerHeight;
  const scaleY = innerHeight;
  for (const { landmarks } of smoothedPoses) {
    // Draw the connections
    ctx.beginPath();
    for (const [a, b] of poseConnections) {
      const [xa, ya] = landmarks[a];
      const [xb, yb] = landmarks[b];
      ctx.moveTo(xa * scaleX - hw + midScreen, ya * scaleY);
      ctx.lineTo(xb * scaleX - hw + midScreen, yb * scaleY);
    }
    ctx.strokeStyle = "#fff4";
    ctx.stroke();

    // Draw the points
    for (const [x, y, z, visibility, presence] of landmarks) {
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
        const { poses, resolution } = data;
        if (!poses.length) {
          // Ignore dropped poses
          return;
        }
        current.poses = poses;

        const now = performance.now();
        if (current.lastPostTimeMS) {
          current.poseLatencyMS = now - current.lastPostTimeMS;
        }
        current.lastPostTimeMS = now;

        // The landmarks come in squished from the original resolution of
        // something like 640x480 as a value between -1 and 1.
        for (const { landmarks } of poses) {
          for (const landmark of landmarks) {
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
