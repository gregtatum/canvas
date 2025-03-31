import { type DanceDatabase } from "lib/posecam";
import type { Timeline, TimelineRecord } from "lib/timeline/types";
import {
  addCSS,
  createHTML,
  ensureExists,
  reactiveInvalidator,
  UnhandledCaseError,
} from "lib/utils";
import {
  RowAudio,
  RowDance,
  RowKeyframe,
  NewRow,
  Row,
} from "lib/timeline/components";

export class TimelineView {
  db: DanceDatabase;
  elements: ReturnType<typeof TimelineView.createElements>;
  timelineName: string;
  timelineRecord: TimelineRecord;
  secondsRange: [number, number];
  closeTimeline: () => void;
  ctx: CanvasRenderingContext2D;
  needsSaving = false;
  wasScrubbed = true;
  isPlaying = false;
  time: Seconds = 0;
  startPosition: Seconds = 0;

  constructor(
    db: DanceDatabase,
    timelineName: string,
    timelineRecord: TimelineRecord,
    closeTimeline: () => void
  ) {
    this.db = db;
    this.timelineName = timelineName;
    this.timelineRecord = timelineRecord;
    this.closeTimeline = closeTimeline;

    TimelineView.addCSS();
    this.elements = TimelineView.createElements();
    this.setupHandlers();
    this.ctx = ensureExists(
      this.elements.canvas.getContext("2d", { alpha: false })
    );

    this.secondsRange = [0, this.timelineRecord.duration];

    this.reactive();
    document.body.appendChild(this.elements.container);
  }

  static createElements() {
    const { container, get } = createHTML(/* html */ `
      <div class="timeline timeline-view">
        <div class="timeline-view-header">
          <div class="timeline-view-controls">
            <div class="timeline-view-time">00:10:00</div>
            <button class="timeline-view-add" title="Add" type="button">
              <img src="../html/plus.svg" />
            </button>
            <button class="timeline-view-play" title="Play" type="button">
              <img src="../html/play.svg" />
            </button>
            <button class="timeline-view-record" title="Record" type="button">
              <div />
            </button>
            <button class="timeline-view-close" tile="Close" type="button">
              <img src="../html/xmark.svg" />
            </button>
          </div>
          <div class="timeline-view-timeline">
            <canvas />
            <div class="timeline-view-zoom"></div>
          </div>
        </div>
        <div class="timeline-view-items">
          <!-- Items get appended here. -->
        </div>
      </div>
    `);

    return {
      container,
      addButton: get<HTMLButtonElement>(".timeline-view-add"),
      playButton: get<HTMLButtonElement>(".timeline-view-play"),
      playButtonImg: get<HTMLImageElement>(".timeline-view-play img"),
      recordButton: get<HTMLButtonElement>(".timeline-view-record"),
      closeButton: get<HTMLButtonElement>(".timeline-view-close"),
      canvas: get<HTMLCanvasElement>(".timeline-view-timeline canvas"),
      timelines: get(".timeline-view-items"),
      time: get<HTMLElement>(".timeline-view-time"),
    };
  }

  static cssAdded = false;
  static addCSS() {
    if (TimelineView.cssAdded) {
      return;
    }
    TimelineView.cssAdded = true;

    addCSS(/* css */ `
      .timeline-view {
        position: absolute;
        inset: auto 0 0 0;
        background: #fff;
        display: flex;
        border-top: 1px solid var(--border-color-subtle);
        background-color: var(--background-color);
        color: var(--font-color);
        align-items: center;
        flex-direction: column;

        --sidebar-width: 300px;
      }

      .timeline-view-header {
        display: flex;

      }

      .timeline-view-controls {
        display: flex;
        align-items: center;
        border-right: 1px solid var(--border-color-subtle);
        width: var(--sidebar-width);
        box-sizing: border-box;
        padding: 0.7rem 0.7rem;
        gap: 0.7rem;
        justify-content: end;

        & button {
          cursor: pointer;
          opacity: 0.8;
          &:hover {
            opacity: 1;
          }
        }
      }

      .timeline-view-controls {
        & button {
          border: none;
          background: none;
          padding: 0;
          width: 20px;
          height: 20px;

          & img {
            width: 20px;
            height: 20px;
          }
        }
      }
      .timeline-view-time {
        flex: 1;
      }
      .timeline-view-play {

      }
      .timeline-view-record {
        & div {
          width: 14px;
          height: 14px;
          border-radius: 12px;
          outline: 2px solid red;
          position: relative;
          box-sizing: border-box;
          background: red;
          border: 2px solid var(--background-color);
          left: 3px;
        }
      }
      .timeline-view-close {
        
      }
      .timeline-view-timeline {
        flex: 1;
        & canvas {
          /* Override all of the default canvas styles from style.css */
          width: calc(100vw - var(--sidebar-width));
          height: 1.5rem;
          background-color: red;
          transition: none;
          position: relative;
          z-index: 0;
          /* Additional properties. */
        }
      }
      .timeline-view-zoom {

      }
      .timeline-view-items {
        width: 100%;
      }
    `);
  }

  prevWindowWidth = -1;
  // 1 second to 1 hour.
  tickIntervals = [1, 5, 10, 30, 60, 300, 600, 1800, 3600];
  redrawTimeline = reactiveInvalidator([
    () => this.timelineRecord.duration,
    () => this.secondsRange[0],
    () => this.secondsRange[1],
    () => window.innerWidth,
  ]);
  reactiveDrawTimeline() {
    if (!this.redrawTimeline()) {
      return;
    }
    for (const timeline of this.timelineRecord.timeline) {
      const rowView = this.rowViews.get(timeline);
      rowView?.drawTimeline();
    }
    const { secondsRange, ctx } = this;
    const { canvas } = this.elements;
    if (this.prevWindowWidth !== window.innerWidth) {
      // Properly size the canvas.
      this.prevWindowWidth = window.innerWidth;
      const rect = this.elements.canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
    }

    // Clear the canvas
    ctx.fillStyle = "#433";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const timeRange = secondsRange[1] - secondsRange[0];
    this.timelineRecord.duration;

    // Determine an appropriate tick interval
    const majorTickInterval =
      this.tickIntervals.find((tick) => timeRange / tick <= 10) || 3600; // Max 10 ticks

    // Define minor tick interval (divide major by 5 or 10)
    let minorTickInterval = majorTickInterval / 5;
    if (minorTickInterval < 1) minorTickInterval = 1; // Minimum 1-second interval

    // Canvas dimensions
    const width = canvas.width;
    const height = canvas.height;
    const textBottom = 12 * devicePixelRatio; // Where the bottom of the text is.
    const textMargin = 3 * devicePixelRatio; // The margin between text and the marks.
    const majorTickTop = textBottom + textMargin;
    const minorTickTop = (majorTickTop + height) / 2;
    const majorTickWidth = 1 * devicePixelRatio;
    const minorTickWidth = 0.5 * devicePixelRatio;

    // Convert time to X-coordinate
    const timeToX = (time: number) =>
      ((time - secondsRange[0]) / timeRange) * width;

    // Draw major ticks
    ctx.font = `${12 * devicePixelRatio}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = majorTickWidth;

    // Major ticks and number labels.
    ctx.beginPath();
    for (
      let t =
        Math.ceil(secondsRange[0] / majorTickInterval) * majorTickInterval;
      t <= secondsRange[1];
      t += majorTickInterval
    ) {
      const x = timeToX(t);
      ctx.moveTo(x, majorTickTop);
      ctx.lineTo(x, height);

      // Convert seconds to a readable format (MM:SS)
      const minutes = Math.floor(t / 60);
      const seconds = t % 60;
      const label =
        minutes > 0
          ? `${minutes}:${seconds.toString().padStart(2, "0")}`
          : `${seconds}s`;
      ctx.fillText(label, x, textBottom);
    }
    ctx.stroke();

    // Minor ticks
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = minorTickWidth;
    ctx.beginPath();
    for (
      let t =
        Math.ceil(secondsRange[0] / minorTickInterval) * minorTickInterval;
      t <= secondsRange[1];
      t += minorTickInterval
    ) {
      if (t % majorTickInterval === 0) continue; // Skip if it's already a major tick
      const x = timeToX(t);
      ctx.moveTo(x, minorTickTop);
      ctx.lineTo(x, height); // Minor tick size
    }
    ctx.moveTo(0, height - minorTickWidth);
    ctx.lineTo(width, height - minorTickWidth);

    ctx.stroke();

    const { duration: boundsInSeconds } = this.timelineRecord;
    // Draw progress bar (small bar at the top)
    const progressBarHeight = 5;

    ctx.fillStyle = "#ff0";
    ctx.fillRect(
      (secondsRange[0] / boundsInSeconds) * width,
      0,
      ((secondsRange[1] - secondsRange[0]) / boundsInSeconds) * width,
      progressBarHeight
    );
  }

  setupHandlers() {
    const { closeButton, container, addButton, playButton } = this.elements;
    closeButton.addEventListener("click", this.closeTimeline);
    container.addEventListener("wheel", this.wheelHandler, {
      passive: false,
    });

    addButton.addEventListener("click", this.addNewRow);
    playButton.addEventListener("click", this.togglePlay);
  }

  wheelHandler = (event: WheelEvent) => {
    const { canvas } = this.elements;
    const timelineDuration = this.timelineRecord.duration; // End time, implied start is always 0
    const [start, end] = this.secondsRange;
    const rangeDuration = end - start;
    let newStart = 0;
    let newEnd = 0;
    const minimumRange = Math.min(timelineDuration, 4); // seconds

    const canvasRect = canvas.getBoundingClientRect();

    if (event.shiftKey) {
      // Zoom in.
      event.preventDefault(); // Prevent default scrolling when zooming

      const deltaY = getNormalizedScrollDelta(event, "deltaY");
      const zoomFactor = 1 / 100;
      const zoomAmount = rangeDuration * zoomFactor * -Math.sign(deltaY);

      if (rangeDuration <= minimumRange && deltaY < 0) {
        return;
      }

      // Get mouse position relative to the timeline
      const mouseDevicePixelX = event.clientX - canvasRect.left;
      const mouseViewRatio = mouseDevicePixelX / canvasRect.width;

      // Adjust the range based on the mouse position
      newStart = start + zoomAmount * mouseViewRatio;
      newEnd = end - zoomAmount * (1 - mouseViewRatio);

      if (newStart < 0) {
        newStart = 0;
      }

      if (newEnd > timelineDuration) {
        newEnd = timelineDuration;
      }

      // Make sure it never gets too small.
      if (newEnd - newStart < minimumRange) {
        newEnd = newStart + minimumRange;
        if (newEnd > timelineDuration) {
          newStart = timelineDuration - minimumRange;
          newEnd = minimumRange;
        }
      }
    } else {
      // Pan left and right.
      const deltaX = getNormalizedScrollDelta(event, "deltaX");
      const panFactor = 1 / 100;
      const panAmount = rangeDuration * panFactor * Math.sign(deltaX);

      newStart = start + panAmount;
      newEnd = end + panAmount;

      // Ensure panning stays within bounds
      if (newStart < 0) {
        newStart = 0;
        newEnd = newStart + rangeDuration;
      }
      if (newEnd > timelineDuration) {
        newEnd = timelineDuration;
        newStart = newEnd - rangeDuration;
      }
    }
    this.secondsRange[0] = newStart;
    this.secondsRange[1] = newEnd;
  };

  updateTimeline(callback: (timelineRecord: TimelineRecord) => void) {
    callback(this.timelineRecord);
    this.needsSaving = true;
    this.reactive();
  }

  addNewRow = () => {
    const newRow = this.timelineRecord.timeline.find(
      (timeline) => timeline.type === "new"
    );
    if (newRow) {
      this.rowViews.get(newRow)?.container?.querySelector("select")?.focus();
      // Don't add a second one here.
      return;
    }
    this.timelineRecord.timeline = this.timelineRecord.timeline.slice();
    this.timelineRecord.timeline.push({ type: "new" });
    this.reactive();
  };

  replaceNewRow(timelineType: string) {
    const index = this.timelineRecord.timeline.findIndex(
      (timeline) => timeline.type === "new"
    );
    this.timelineRecord.timeline = this.timelineRecord.timeline.slice();
    this.timelineRecord.timeline[index] = createDefaultTimeline(timelineType);
    this.reactive();
  }

  togglePlay = () => {
    const { playButtonImg } = this.elements;
    if (this.isPlaying) {
      // Pause the timeline.
      playButtonImg.src = "../html/pause.svg";
      this.time = this.startPosition;
    } else {
      // Play the timeline
      this.wasScrubbed = true;
      playButtonImg.src = "../html/play.svg";
    }
    this.isPlaying = !this.isPlaying;
  };

  prevTimeline: Timeline[] = [];
  rowViews = new WeakMap<Timeline, Row>();
  isDurationInvalidated = reactiveInvalidator([
    () => this.timelineRecord.duration,
  ]);
  reactive() {
    if (this.timelineRecord.timeline !== this.prevTimeline) {
      this.rebuildTimelines();
    }

    if (this.isDurationInvalidated()) {
      const seconds = formatSecondsToTimecode(this.timelineRecord.duration);
      this.elements.time.innerText = seconds;
    }
  }

  /**
   * Synchronize the timeline views.
   */
  rebuildTimelines() {
    for (let i = 0; i < this.timelineRecord.timeline.length; i++) {
      const timeline = this.timelineRecord.timeline[i];
      const element: Element | undefined = this.elements.timelines.children[i];
      const nextElement: Element | undefined =
        this.elements.timelines.children[i - 1];
      let rowView = this.rowViews.get(timeline);
      if (element && element === rowView?.container) {
        continue;
      }
      if (!rowView) {
        rowView = createTimelineRow(timeline, this);
        this.rowViews.set(timeline, rowView);
      }
      if (nextElement) {
        this.elements.timelines.insertBefore(rowView.container, nextElement);
      } else {
        while (this.elements.timelines.childElementCount > i) {
          this.elements.timelines.lastElementChild?.remove();
        }
        this.elements.timelines.appendChild(rowView.container);
      }
    }
    // Ensure there are no extra elements left over.
    while (
      this.elements.timelines.childElementCount >
      this.timelineRecord.timeline.length
    ) {
      this.elements.timelines.lastElementChild?.remove();
    }
  }

  update() {
    // this.secondsRange[1] += 0.2;
    // this.secondsRange[0] += 0.1;
    // this.timelineRecord.boundsInSeconds = this.secondsRange[1];
  }

  draw() {
    this.reactiveDrawTimeline();
  }

  destroy() {
    this.elements.container.remove();
  }
}

function createDefaultTimeline(timelineType: string): Timeline {
  switch (timelineType) {
    case "new":
      return { type: "new" };
    case "audio":
      return { offset: 0, type: "audio", hash: null };
    case "dance":
      return { offset: 0, type: "dance" };
    case "keyframe":
      return { offset: 0, type: "keyframe", key: "", value: null };
    default:
      throw new Error("Unknown timeline " + timelineType);
  }
}

function createTimelineRow(timeline: Timeline, timelineView: TimelineView) {
  switch (timeline.type) {
    case "new":
      return new NewRow(timeline, timelineView);
    case "audio":
      return new RowAudio(timeline, timelineView);
    case "dance":
      return new RowDance(timeline, timelineView);
    case "keyframe":
      return new RowKeyframe(timeline, timelineView);
    default:
      throw new UnhandledCaseError(timeline, "Timeline");
  }
}

/**
 * Scroll wheel events can by of various types. Do the right thing by converting these
 * into CssPixels. https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent/deltaMode
 */
function getNormalizedScrollDelta(
  event: WheelEvent,
  key: "deltaY" | "deltaX"
): CssPixels {
  const delta = event[key];
  switch (event.deltaMode) {
    case 1: // DOM_DELTA_LINE
      return delta * 15;
    case 2: // DOM_DELTA_PAGE
      return delta * window.innerHeight;
    default:
  }
  // Scroll by pixel.
  return delta;
}

function formatSecondsToTimecode(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
}
