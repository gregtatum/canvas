import Simplex from "simplex-noise";
import setupRandom from "@tatumcreative/random";
import initializeShortcuts from "lib/shortcuts";
import { setupCanvas, loop, generateSeed } from "lib/draw";
import { lerpTheta } from "lib/lerpTheta";
import { DanceCamEventsToClient, Pose } from "../dancecam/messages";
import { UnhandledCaseError } from "../../lib/utils";

type Config = ReturnType<typeof getConfig>;
type Current = ReturnType<typeof getCurrent>;

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

{
  const config = getConfig();
  const current = getCurrent(config);

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
  };
}

function getCurrent(config: Config) {
  return {
    time: 0,
    // TODO -- Add UI to specify this.
    wsUrl: "ws://0.0.0.0:8765",
    isConnecting: false,
    // wsUrl: 'ws://dancecam1.local:8765'
    socket: null as null | WebSocket,
    poses: [] as Pose[],
    // Flip the camera image.
    flip: true,
    frame: null as HTMLImageElement | null,
  };
}

function update(config: Config, current: Current): void {
  if (!current.socket && !current.isConnecting && !document.hidden) {
    current.isConnecting = true;
    connectClient(current);
  }
}

function draw(config: Config, current: Current): void {
  const { ctx } = config;
  const { poses } = current;

  if (current.frame) {
    ctx.drawImage(current.frame, 0, 0);
  }

  // Clear out background.
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  // Draw the points of the poses.
  ctx.fillStyle = "#fff";
  const w = 10;
  const hw = w / 2;
  const scaleX = Math.min(innerWidth, innerHeight);
  const scaleY = Math.min(innerWidth, innerHeight);
  for (const { landmarks } of poses) {
    // Draw the connections
    ctx.beginPath();
    for (const [a, b] of poseConnections) {
      const [xa, ya] = landmarks[a];
      const [xb, yb] = landmarks[b];
      ctx.moveTo(xa * scaleX - hw, ya * scaleY);
      ctx.lineTo(xb * scaleX - hw, yb * scaleY);
    }
    ctx.strokeStyle = "#fff4";
    ctx.stroke();

    // Draw the points
    for (const [x, y, z, visibility, presence] of landmarks) {
      ctx.fillRect(x * scaleX - hw, y * scaleY - hw, w, w);
    }
  }
}

function connectClient(current: Current) {
  const { wsUrl } = current;
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
        const image = new Image();
        image.onload = function () {
          current.frame = image;
        };
        image.src = "data:image/png;base64," + data.image;
        break;
      }
      case "poses": {
        const { poses, resolution } = data;
        current.poses = data.poses;
        // Apply the camera scale.
        let scaleX = resolution[0] / resolution[1];
        let scaleY = resolution[1] / resolution[0];
        if (resolution[0] < resolution[1]) {
          scaleX = 1 / scaleX;
          scaleY = 1 / scaleY;
        }
        for (const { landmarks } of poses) {
          for (const landmark of landmarks) {
            if (current.flip) {
              landmark[0] = 1 - landmark[0];
            }
            landmark[0] *= scaleX;
            landmark[1] *= scaleY;
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
    console.log("WebSocket connection closed", wsUrl);
    wsUrl;
  });

  socket.addEventListener("error", (event) => {
    console.error("WebSocket error:", event);
  });
}
