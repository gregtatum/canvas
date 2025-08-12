import type { CueDance } from "lib/timeline/types";
import { Row, type Timeline } from "lib/timeline/components";
import { appendHTML, ensureNonNull } from "lib/utils";
import {
  Dance,
  PoseCamEventsToClient,
  Pose,
  Landmark,
} from "lib/posecam/messages";
import lerp from "lerp";
import { PoseAnalysis } from "lib/posecam";

const LIVE_CAMERA = "Live Camera";

type Modes = "camera" | "saved";

export class RowPoseCam extends Row {
  elements: ReturnType<typeof RowPoseCam.prototype.createElements>;
  selectedDance: string = LIVE_CAMERA;
  id: number;
  static #lastId = 0;
  mode: Modes = "camera";
  cue: CueDance;
  isConnecting = false;
  showFrameRequested = false;
  socket: WebSocket | null = null;
  frame: HTMLImageElement | null = null;
  danceRecording: Dance = [];
  poses: Pose[] = [];
  poseLatencyMS: Milliseconds = 0;
  lastPostTimeMS: Milliseconds = 0;
  /** Flip the camera image. */
  flip = true;
  smoothedPoses: Pose[] = [];
  isCameraUrlFocused = false;
  poseAnalyses: PoseAnalysis[] = [];
  /** Show the frame from the camera. */
  showFrame = false;
  danceReplay: DanceReplay | null = null;

  constructor(cue: CueDance, timeline: Timeline) {
    super(cue, timeline);
    this.cue = cue;
    this.elements = this.createElements();
    this.id = RowPoseCam.#lastId++;
    this.reactive();
    this.addHandlers();

    // This is just a temporary mitigation
    if (!cue.poseSmoothing) {
      cue.poseSmoothing = 0.9;
    }
    if (!cue.speed) {
      cue.speed = 1.0;
    }
  }

  createElements() {
    const get = appendHTML(
      this.container,
      /* html */ `
        <div class="_start row-pose-cam">
          <div class="_content">
            <select>
              <option value="">Camera</option>
              <!-- The rest will be added here -->
            </select>
            <input type="url" list="row-pose-cam-camera-${this.id}" placeholder="ws://"></input>
            <datalist id="row-pose-cam-camera-${this.id}">
              <option value="ws://localhost:8765"></option>
              <!-- The rest will be added here -->
            </datalist>

          </div>
          <button class="_remove" tile="Remove row" type="button">
            <img src="../html/xmark.svg">
          </button>
        </div>
        <div class="_end">
          <canvas class="row-line" />
        </div>
      `
    );
    return {
      select: get<HTMLInputElement>("select"),
      line: get<HTMLDivElement>(".row-line"),
      cameraUrl: get<HTMLInputElement>("input[type=url]"),
      removeButton: get<HTMLButtonElement>("._remove"),
      canvas: get<HTMLCanvasElement>("canvas"),
    };
  }

  addHandlers() {
    const { select, removeButton, cameraUrl } = this.elements;
    select.addEventListener("change", this.changeDance);
    this.addRemoveButtonHandler(removeButton);

    cameraUrl.addEventListener("blur", this.changeWsUrl);
    cameraUrl.addEventListener("keypress", (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        this.changeWsUrl();
        this.timeline.elements.container.focus();
        this.elements.cameraUrl.blur();
      }
    });
    cameraUrl.addEventListener("focus", () => {
      this.isCameraUrlFocused = true;
    });
    cameraUrl.addEventListener("blur", () => {
      this.isCameraUrlFocused = false;
    });
  }

  changeWsUrl = () => {
    const oldUrl = this.cue.wsUrl;
    const newUrl = this.elements.cameraUrl.value;
    if (newUrl === oldUrl) {
      return;
    }

    console.log(`!!! changeWsUrl`, newUrl);

    const apply = () => {
      this.cue.wsUrl = newUrl;
      this.reactive();
    };

    const undo = () => {
      this.cue.wsUrl = oldUrl;
      this.reactive();
    };

    this.timeline.undos.apply(apply, undo);
  };

  getSelectedDance(): null | Promise<Dance> {
    if (this.selectedDance === LIVE_CAMERA) {
      return null;
    }
    return ensureNonNull(this.timeline.db.getDance(this.selectedDance));
  }

  refreshDances() {
    const { select } = this.elements;
    const previousValue = this.selectedDance;
    while (select.children.length > 1) {
      select.lastChild!.remove();
    }
    for (const name of this.timeline.poseCam.danceNames) {
      const option = document.createElement("option");
      option.innerText = name;
      select.appendChild(option);
    }
    select.value = previousValue;
    if (!select.value) {
      this.selectedDance = LIVE_CAMERA;
      this.changeDance();
    }
  }

  #prevNames: string[] = [];

  update() {
    if (!this.socket && !this.danceReplay) {
      // There is no connection, and there is no dance replay, so don't update
      // anything else.
      return;
    }

    if (this.danceReplay) {
      // Update the poses from the dance replay.
      this.poses = this.danceReplay.getCurrentPoses(
        this.timeline.time.now * 1000
      );
    }

    // TODO identify how to drop / add poses gracefully.

    // Ensure there are enough smoothed pose data available.
    if (this.poses.length > this.smoothedPoses.length) {
      this.smoothedPoses = this.poses.map((pose) => {
        return pose.map((landmark) => landmark.slice() as Landmark);
      });
    }

    this.updatePoseSmoothing();

    if (this.poses.length !== this.poseAnalyses.length) {
      this.poseAnalyses = this.poses.map(() => new PoseAnalysis());
    }
    for (let i = 0; i < this.poses.length; i++) {
      const pose = this.poses[i];
      const poseAnalysis = this.poseAnalyses[i];
      poseAnalysis.update(pose);
    }

    // Adjust the requests for showing the frame.
    if (this.socket) {
      if (this.showFrame && !this.showFrameRequested) {
        this.socket.send(JSON.stringify({ type: "show-frame", show: true }));
        this.showFrameRequested = true;
      } else if (!this.showFrame && this.showFrameRequested) {
        this.socket.send(JSON.stringify({ type: "show-frame", show: false }));
        this.showFrameRequested = false;
      }
    }
    if (!this.showFrame && this.frame) {
      this.frame.remove();
      this.frame = null;
    }
  }

  /**
   * Apply smoothing to the poses.
   */
  updatePoseSmoothing() {
    const { poses, smoothedPoses, cue } = this;
    const poseSmoothing = cue.poseSmoothing * (1 + 1 / cue.speed / 100);

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

  reactive() {
    const { cameraUrl, select } = this.elements;

    if (
      this.cue.wsUrl &&
      !this.elements.select.value &&
      !this.socket &&
      !this.isConnecting &&
      !document.hidden
      // && !this.danceReplay
    ) {
      // This is either the first update called, or the connection was dropped to the camera
      // because it was unavailable or because we tabbed out and the document was hidden.
      // Attempt to start a connection.
      this.isConnecting = true;
      this.connectClient();
    }

    if (!this.isCameraUrlFocused) {
      cameraUrl.value = this.cue.wsUrl ?? "";
    }

    if (select.value) {
      cameraUrl.style.display = "none";
      select.style.width = "";
    } else {
      select.style.width = "75px";
      cameraUrl.style.display = "block";
    }

    const { danceNames } = this.timeline.poseCam;
    if (danceNames !== this.#prevNames) {
      this.#prevNames = danceNames;
      while (select.children.length > 1) {
        select.lastChild!.remove();
      }
      for (const name of danceNames) {
        const option = document.createElement("option");
        option.innerText = name;
        select.appendChild(option);
      }
    }
  }

  changeDance = async () => {
    this.reactive();
    // this.selectedDance = danceDropdown.value;

    // Reset any smoothing.
    this.smoothedPoses = [];
    this.poses = [];

    if (this.selectedDance) {
      const dance = await this.timeline.db.getDance(this.selectedDance);
      if (dance) {
        this.danceReplay = new DanceReplay(dance);
        this.socket?.close();
      }
    } else {
      // Use the live camera.
      this.danceReplay = null;
    }

    // const previousValue = this.selectedDance;
    // select.value = previousValue;
    // if (!select.value) {
    //   this.selectedDance = LIVE_CAMERA;
    //   this.changeDance();
    // }
  };

  connectClient() {
    const { wsUrl } = this.cue;
    if (!wsUrl) {
      throw new Error(
        "Attempting to connect to a client when no wsUrl was set"
      );
    }
    console.log("[RowPoseCam] Connecting to", wsUrl);
    const socket = new WebSocket(wsUrl);

    // Close the socket when tabbing away. It will be reopened once the document is visible.
    const onVisibilityChange = () => {
      if (document.hidden) {
        removeEventListener("visibilitychange", onVisibilityChange);
        socket.close();
      }
      this.reactive();
    };
    addEventListener("visibilitychange", onVisibilityChange);

    // Connection opened
    socket.addEventListener("open", () => {
      this.isConnecting = false;
      this.showFrameRequested = false;
      console.log("[RowPoseCam] WebSocket connection established", wsUrl);
      this.socket = socket;
      socket.send(JSON.stringify({ type: "watch-poses" }));
      this.reactive();
    });

    socket.addEventListener("message", (event) => {
      const data: PoseCamEventsToClient = JSON.parse(event.data);
      switch (data.type) {
        case "models":
          console.log("[RowPoseCam] Available models:", data.models);
          break;
        case "error":
          console.error("Error:", data.message);
          break;
        case "frame": {
          if (!this.frame) {
            this.frame = new Image();
            this.frame.style.opacity = "0.5";
            this.frame.style.transform = "scaleX(-1)";
            document.body.appendChild(this.frame);
          }
          this.frame.src = "data:image/png;base64," + data.image;

          break;
        }
        case "poses": {
          const { posesFrame } = data;
          const { poses, resolution } = posesFrame;
          if (!poses.length) {
            // Ignore dropped poses
            return;
          }
          this.poses = poses;
          if (this.timeline.poseCam.isRecording) {
            this.danceRecording.push(posesFrame);
          }

          const now = performance.now();
          if (this.lastPostTimeMS) {
            this.poseLatencyMS = now - this.lastPostTimeMS;
          }
          this.lastPostTimeMS = now;

          // The landmarks come in squished from the original resolution of
          // something like 640x480 as a value between -1 and 1.
          for (const pose of poses) {
            for (const landmark of pose) {
              if (this.flip) {
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

    socket.addEventListener("close", () => {
      this.isConnecting = false;
      this.socket = null;
      if (this.frame) {
        this.frame.remove();
        this.frame = null;
      }
      this.poses = [];
      this.smoothedPoses = [];
      this.reactive();
      console.log("[RowPoseCam] WebSocket connection closed", wsUrl);
    });

    socket.addEventListener("error", (event) => {
      console.error("WebSocket error:", event);
    });
  }

  startRecording() {
    // TODO
    this.danceRecording = [];
  }
  stopRecording() {
    // TODO
    return this.danceRecording;
  }

  drawDebugInfo(ctx: CanvasRenderingContext2D, fontSize: number) {
    if (this.poseLatencyMS) {
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillText(`${this.poseLatencyMS}ms pose`, fontSize, fontSize * 2.5);
      ctx.fillText(
        `${this.poses.length} poses detected`,
        fontSize,
        fontSize * 3.5
      );
    }
  }
}

const EMPTY_POSES: Pose[] = [];

class DanceReplay {
  dance: Dance | null;
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
    if (!this.dance) {
      return EMPTY_POSES;
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
