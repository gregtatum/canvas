import { type DanceDatabase } from "lib/posecam";
import type { Timeline, TimelineRecord } from "lib/timeline/types";
import {
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
  width: CssPixels = 0;
  prevNow: Seconds | null = null;
  time: Seconds = 0;
  startPosition: Seconds = 0;
  mouseAtTime: CssPixels = 0;
  pressedMouseTime: Seconds | null = null;

  constructor(
    db: DanceDatabase,
    timelineName: string,
    timelineRecord: TimelineRecord,
    closeTimeline: () => void,
    shadowRoot: ShadowRoot
  ) {
    this.db = db;
    this.timelineName = timelineName;
    this.timelineRecord = timelineRecord;
    this.closeTimeline = closeTimeline;

    this.elements = TimelineView.createElements();
    this.setupHandlers();
    this.ctx = ensureExists(
      this.elements.canvas.getContext("2d", { alpha: false })
    );

    this.secondsRange = [0, this.timelineRecord.duration];

    this.reactive();
    shadowRoot.appendChild(this.elements.container);
  }

  static createElements() {
    const { container, get } = createHTML(/* html */ `
      <div class="view">
        <div class="view-header">
          <div class="_controls">
            <div class="_time">00:10:00</div>
            <button class="_add" title="Add" type="button">
              <img src="../html/plus.svg" />
            </button>
            <button class="_play" title="Play" type="button">
              <img src="../html/play.svg" />
            </button>
            <button class="_record" title="Record" type="button">
              <div />
            </button>
            <button class="_close" tile="Close" type="button">
              <img src="../html/xmark.svg" />
            </button>
          </div>
          <div class="_tickmarks">
            <canvas></canvas>
            <div class="_zoom"></div>
            <div class="_scrubberStart"></div>
            <div class="_scrubberTime"></div>
          </div>
        </div>
        <div class="view-rows">
          <!-- Timeline rows get appended here. -->
        </div>
      </div>
    `);

    return {
      container,
      addButton: get<HTMLButtonElement>("._add"),
      playButton: get<HTMLButtonElement>("._play"),
      playButtonImg: get<HTMLImageElement>("._play img"),
      recordButton: get<HTMLButtonElement>("._record"),
      closeButton: get<HTMLButtonElement>("._close"),
      tickmarks: get<HTMLDivElement>("._tickmarks"),
      canvas: get<HTMLCanvasElement>("._tickmarks canvas"),
      scrubberStart: get<HTMLCanvasElement>("._scrubberStart"),
      scrubberTime: get<HTMLCanvasElement>("._scrubberTime"),
      rows: get(".view-rows"),
      time: get<HTMLElement>("._time"),
    };
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

    // Properly size the canvas.
    this.prevWindowWidth = window.innerWidth;
    const rect = this.elements.canvas.getBoundingClientRect();
    this.width = rect.width;
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;

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
    const { closeButton, container, addButton, playButton, tickmarks } =
      this.elements;
    closeButton.addEventListener("click", this.closeTimeline);
    container.addEventListener("wheel", this.wheelHandler, {
      passive: false,
    });

    addButton.addEventListener("click", this.addNewRow);
    playButton.addEventListener("click", this.togglePlay);
    container.addEventListener("mousemove", this.mouseMoveHandler);
    tickmarks.addEventListener("mousedown", this.tickmarksMouseDown);
    window.addEventListener("mouseup", this.tickmarksMouseUp);
    window.addEventListener("blur", this.tickmarksMouseUp);
    window.addEventListener("keydown", this.keydown);
  }

  keydown = (event: KeyboardEvent) => {
    let key = event.code.toLowerCase();
    if (event.shiftKey) {
      key = `shift-${key}`;
    }
    if (event.ctrlKey || event.metaKey) {
      key = `ctrl-${key}`;
    }
    switch (key) {
      case "space": {
        this.togglePlay();
        break;
      }
      case "ctrl-arrowleft": {
        event.preventDefault();
        this.time = 0;
        this.startPosition = 0;
        this.wasScrubbed = true;
        break;
      }
      case "arrowright":
      case "arrowleft":
      case "shift-arrowright":
      case "shift-arrowleft": {
        const direction = key.endsWith("right") ? 1 : -1;
        const amount = key.startsWith("shift") ? 5 : 1;
        this.time += direction * amount;
        // Keep the time in bounds.
        this.time = Math.min(
          Math.max(0, this.time),
          this.timelineRecord.duration
        );
        this.wasScrubbed = true;
        if (!this.isPlaying) {
          this.startPosition = this.time;
        }
        break;
      }
      default:
        break;
    }
  };

  mouseMoveHandler = (event: MouseEvent) => {
    const timelineLeft: CssPixels =
      event.clientX - window.innerWidth + this.width;
    const [start, end] = this.secondsRange;
    const duration: Seconds = end - start;
    const rangeRatio = timelineLeft / this.width;
    this.mouseAtTime = start + duration * rangeRatio;
  };

  tickmarksMouseDown = () => {
    this.pressedMouseTime = this.mouseAtTime;
  };

  tickmarksMouseUp = () => {
    if (this.pressedMouseTime === this.mouseAtTime) {
      this.time = this.mouseAtTime;
      this.startPosition = this.mouseAtTime;
      this.wasScrubbed = true;
    }
    this.pressedMouseTime = null;
  };

  wheelHandler = (event: WheelEvent) => {
    const { canvas } = this.elements;
    const timelineDuration = this.timelineRecord.duration; // End time, implied start is always 0
    const [start, end] = this.secondsRange;
    const rangeDuration = end - start;
    let newStart = 0;
    let newEnd = 0;
    const minimumRange: Seconds = Math.min(timelineDuration, 4);

    const canvasRect = canvas.getBoundingClientRect();

    if (event.shiftKey) {
      // Zoom in.
      event.preventDefault(); // Prevent default scrolling when zooming

      const deltaY = getNormalizedScrollDelta(event, "deltaY");
      const zoomFactor = 1 / 50;
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
      this.time = this.startPosition;
      playButtonImg.src = "../html/play.svg";
    } else {
      // Play the timeline
      this.time = this.startPosition;
      this.prevNow = null;
      this.wasScrubbed = true;
      playButtonImg.src = "../html/pause.svg";
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
    const rowsElements = this.elements.rows;
    for (let i = 0; i < this.timelineRecord.timeline.length; i++) {
      const timeline = this.timelineRecord.timeline[i];
      const element: Element | undefined = rowsElements.children[i];
      const nextElement: Element | undefined = rowsElements.children[i - 1];
      let rowView = this.rowViews.get(timeline);
      if (element && element === rowView?.container) {
        continue;
      }
      if (!rowView) {
        rowView = createTimelineRow(timeline, this);
        this.rowViews.set(timeline, rowView);
      }
      if (nextElement) {
        rowsElements.insertBefore(rowView.container, nextElement);
      } else {
        while (rowsElements.childElementCount > i) {
          rowsElements.lastElementChild?.remove();
        }
        rowsElements.appendChild(rowView.container);
      }
    }
    // Ensure there are no extra elements left over.
    while (
      rowsElements.childElementCount > this.timelineRecord.timeline.length
    ) {
      rowsElements.lastElementChild?.remove();
    }
  }

  update() {
    this.updateTiming();
    this.updateScrubbers();
    this.updateRows();
    this.wasScrubbed = false;
  }

  updateTiming() {
    if (!this.isPlaying) {
      return;
    }
    const now: Seconds = performance.now() / 1000;
    const prevNow: Seconds = this.prevNow ?? now;
    this.time += now - prevNow;
    this.prevNow = now;
    const [start, end] = this.secondsRange;
    const duration = end - start;
    if (this.time < start) {
      this.secondsRange[0] = this.time;
      this.secondsRange[1] = this.time + duration;
    }
    const step = duration / 10;
    if (this.time + step > end) {
      this.secondsRange[1] = Math.min(
        this.secondsRange[1] + step,
        this.timelineRecord.duration
      );
      this.secondsRange[0] = Math.max(0, this.secondsRange[1] - duration);
    }
    if (this.time > this.timelineRecord.duration) {
      this.togglePlay();
    }
  }

  updateRows() {
    for (const timeline of this.timelineRecord.timeline) {
      const rowView = ensureExists(
        this.rowViews.get(timeline),
        "Expected a Row view to be in the rowViews WeakMap."
      );
      rowView.update();
    }
  }

  updateScrubbers() {
    this.elements.scrubberStart.style.left = `${this.secondsToCssPixels(
      this.startPosition
    )}px`;
    this.elements.scrubberTime.style.left = `${this.secondsToCssPixels(
      this.time
    )}px`;
  }

  secondsToCssPixels(seconds: Seconds): CssPixels {
    const [start, end] = this.secondsRange;
    const rangeDuration: Seconds = end - start;
    const timeInRange: Seconds = seconds - start;
    const rangeRatio = timeInRange / rangeDuration;
    return this.width * rangeRatio;
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
