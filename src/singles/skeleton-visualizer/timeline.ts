import { type DanceDatabase } from "lib/dancecam";
import {
  AudioRecord,
  Timeline,
  TimelineAudio,
  TimelineRecord,
} from "lib/dancecam/messages";
import {
  addCSS,
  appendHTML,
  createHTML,
  ensureExists,
  LocationManager,
  reactiveInvalidator,
} from "lib/utils";
import { UnhandledCaseError } from "../../lib/utils";

/**
 * Manages adding and removing timelines
 */
export class TimelineManager {
  elements: ReturnType<typeof TimelineManager.createElements>;
  db: DanceDatabase;
  timelineName: string | null =
    LocationManager.getString("timelineName") ?? null;
  timelineRecord: TimelineRecord | null = null;
  timelineView: TimelineView | null = null;

  constructor(parent: HTMLElement, db: DanceDatabase) {
    this.db = db;
    this.elements = TimelineManager.createElements();
    this.setupHandlers();

    db.listTimelines().then((timelines) => this.updateTimelinesView(timelines));

    this.reactive();
    parent.appendChild(this.elements.container);
  }

  static createElements() {
    const { container, get } = createHTML(/* html */ `
      <div class="timeline timeline-manager">
        <div class="timeline-manager-start">
          <label for="timeline-manager-dropdown">Timelines</label>
          <select id="timeline-manager-dropdown">
            <option value="">Select a timeline</option>
          </select>
        </div>
        <div class="timeline-manager-end">
          <input type="text" placeholder="timeline name" />
          <button type="button">add timeline</button>
        </div>
      </div>
    `);

    addCSS(/* css */ `
      .timeline {
        --accent-color: #44b9ff;
        --background-color: #333;
        --background-color-outset: #444;
        --background-color-inset: #111;
        --border-color: #888;
        --border-color-focus: #000;
        --border-color-subtle: #666;
        --border-radius: 3px;
        --font-color: #fff;
        --font-color-inverted: #000;
        --font-family: system-ui, sans-serif;
        --padding: 0.3rem;

        font-family: var(--font-family);
        font-size: 0.9rem;
        font-weight: normal;
      }

      .timeline-manager {
        position: absolute;
        inset: auto 0 0 0;
        background: #fff;
        display: flex;
        padding: 0.3rem;
        border-top: 1px solid var(--border-color-subtle);
        justify-content: space-between;
        background-color: var(--background-color);
        color: var(--font-color);
        align-items: center;

        & select, & button, & input[type=text] {
          &:is(:active, :focus, :focus-visible):not(:disabled) {
            outline: 2px solid var(--accent-color);
            border: 1px solid var(--border-color-focus);
          }

          &:disabled {
            opacity: 0.5  ;
          }
        }

        & select {

        }

        & button {
          background: var(--outset-background-color);
          border: 1px solid var(--accent-color);
          padding: var(--padding);
          border-radius: 3px;
          color: var(--accent-color);

          &:hover {
            background: var(--accent-color);
            color: var(--font-color-inverted);
          }
        }

        & :is(input[type="text"], select) {
          padding: var(--padding);
          border-radius: var(--border-radius);
          border: 1px solid var(--border-color);
          width: 12rem;
          background-color: var(--background-color-inset);
          color: var(--font-color);
        }
      }
    `);

    return {
      container,
      select: get<HTMLSelectElement>("select"),
      input: get<HTMLInputElement>("input[type=text]"),
      button: get<HTMLInputElement>("button"),
    };
  }

  reactive() {
    const { select, container } = this.elements;
    select.disabled = select.childElementCount === 1;

    container.style.display = this.timelineRecord ? "none" : "flex";

    if (this.timelineRecord && this.timelineName) {
      // A timeline is loaded.
      if (
        this.timelineView &&
        this.timelineView.timelineName !== this.timelineName
      ) {
        // The timeline changed.
        this.timelineView.destroy();
        this.timelineView = null;
      }
      if (!this.timelineView) {
        // The timeline needs to be created.
        this.timelineView = new TimelineView(
          this.db,
          this.timelineName,
          this.timelineRecord,
          this.closeTimeline
        );
      }
    } else if (this.timelineView) {
      // There is no timeline loaded, but the view is still initialized.
      this.timelineView.destroy();
      this.timelineView = null;
    }

    if (this.elements.select.value !== this.timelineName) {
      this.elements.select.value = this.timelineName ?? "";
    }
  }

  closeTimeline = () => {
    this.timelineName = null;
    this.timelineRecord = null;
    LocationManager.deleteValue("timelineName");
    this.reactive();
  };

  setupHandlers() {
    const { select, input, button } = this.elements;

    input.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        this.addTimeline(input.value);
      }
    });

    button.addEventListener("click", () => {
      this.addTimeline(input.value);
    });

    select.addEventListener("change", () => {
      this.timelineName = select.value || null;

      if (this.timelineName) {
        LocationManager.updateValue("timelineName", this.timelineName);
        this.loadTimeline(this.timelineName);
      } else {
        this.timelineRecord = null;
        this.timelineName = null;
      }
      this.reactive();
    });

    document.body.addEventListener("keydown", (event) => {
      if (
        event.key === "s" &&
        (event.metaKey || event.ctrlKey) &&
        this.timelineRecord
      ) {
        event.preventDefault();
        this.db.saveTimelineRecord(this.timelineRecord);
      }
    });
  }

  loadTimeline(timelineName: string) {
    this.db.getTimeline(timelineName).then(
      (timelineRecord) => {
        if (timelineRecord) {
          this.timelineRecord = timelineRecord;
        } else {
          alert("Could not find the timeline");
        }
        this.reactive();
      },
      (error) => {
        console.error(error);
        alert("There was an error loading the timeline");
        this.reactive();
      }
    );
  }

  async addTimeline(name: string) {
    if (!name) {
      return;
    }
    try {
      const timelines = await this.db.listTimelines();

      if (timelines.includes(name)) {
        alert("That timeline already exists, please choose a new name.");
        return;
      }
      const threeMinutes = 3 * 60;
      this.timelineRecord = await this.db.addTimeline(name, threeMinutes, []);
      this.reactive();
    } catch (error) {
      console.error(error);
      alert("There was an error creating the timeline");
      this.reactive();
    }
  }

  updateTimelinesView(timelines: string[]) {
    const { select } = this.elements;

    while (select.childElementCount > 1) {
      select.lastElementChild?.remove();
    }
    let timelineName;
    for (const timeline of timelines) {
      const option = document.createElement("option");
      option.value = timeline;
      option.innerText = timeline;
      if (timeline === this.timelineName) {
        option.selected = true;
        timelineName = timeline;
      }
      select.appendChild(option);
    }

    if (timelineName) {
      this.loadTimeline(timelineName);
    } else {
      this.timelineName = null;
    }
    this.reactive();
  }

  update() {
    this.timelineView?.update();
  }

  draw() {
    this.timelineView?.draw();
  }
}

class TimelineView {
  db: DanceDatabase;
  elements: ReturnType<typeof TimelineView.createElements>;
  timelineName: string;
  timelineRecord: TimelineRecord;
  secondsRange: [number, number];
  closeTimeline: () => void;
  needsSaving = false;
  ctx: CanvasRenderingContext2D;

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
      recordButton: get<HTMLButtonElement>(".timeline-view-record"),
      closeButton: get<HTMLButtonElement>(".timeline-view-close"),
      canvas: get<HTMLCanvasElement>(".timeline-view-timeline canvas"),
      timelines: get(".timeline-view-items"),
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
    this.elements.closeButton.addEventListener("click", this.closeTimeline);
    this.elements.container.addEventListener("wheel", this.wheelHandler, {
      passive: false,
    });

    this.elements.addButton.addEventListener("click", this.addNewRow);
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

  prevTimeline: Timeline[] = [];
  rowViews = new WeakMap<Timeline, Row>();
  reactive() {
    if (this.timelineRecord.timeline !== this.prevTimeline) {
      this.rebuildTimelines();
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
      return new AudioRow(timeline, timelineView);
    case "dance":
      return new DanceRow(timeline, timelineView);
    case "keyframe":
      return new KeyframeRow(timeline, timelineView);
    default:
      throw new UnhandledCaseError(timeline, "Timeline");
  }
}

class Row {
  timeline: Timeline;
  timelineView: TimelineView;
  db: DanceDatabase;
  container: HTMLElement;
  static cssAdded = false;
  constructor(timeline: Timeline, timelineView: TimelineView) {
    this.timeline = timeline;
    this.timelineView = timelineView;
    this.db = timelineView.db;
    this.container = document.createElement("div");
    this.container.className = "timeline-row";
    if (Row.cssAdded) {
      return;
    }
    Row.cssAdded = true;
    addCSS(/* css */ `
      .timeline-row {
        display: flex;
      }
      .timeline-row-start {
        width: var(--sidebar-width);
        border-right: 1px solid var(--border-color-subtle);
        box-sizing: border-box;
        border-top: 1px solid var(--border-color-subtle);
        padding: 8px;
        display: flex;
        align-items: center;
      }
      .timeline-row-start-content {
        flex: 1;
        display: flex;
        gap: 7px;
        align-items: center;
      }
      .timeline-row-end {
        flex: 1;
      }

      .timeline-row-remove {
        background: none;
        border: none;
        padding: 6px;
        margin: -6px;
        cursor: pointer;
        opacity: 0.8;

        &:hover {
          opacity: 1;
        }

        & img {
          width: 12px;
          height: 12px;
        }
      }
    `);
  }
}

class NewRow extends Row {
  elements: ReturnType<typeof NewRow.prototype.createElements>;
  constructor(timeline: Timeline, timelineView: TimelineView) {
    super(timeline, timelineView);
    this.elements = this.createElements();
    this.addHandlers();
  }

  createElements() {
    const get = appendHTML(
      this.container,
      /* html */ `
        <div class="timeline-row-start">
          <select>
            <option value="audio">Audio</option>
            <option value="dance">Dance</option>
            <option value="keyframe">Keyframe</option>
          </select>
          <button type="button">Add</button>
        </div>
        <div class="timeline-row-end"></div>
      `
    );
    return {
      button: get<HTMLButtonElement>("button"),
      select: get<HTMLButtonElement>("select"),
    };
  }

  addHandlers() {
    this.elements.button.addEventListener("click", () => {
      this.timelineView.replaceNewRow(this.elements.select.value);
    });
  }
}

class AudioRow extends Row {
  timeline: TimelineAudio;
  audioRecord: Promise<AudioRecord> | null = null;
  elements: ReturnType<typeof AudioRow.prototype.createElements>;
  audioElement: Promise<HTMLAudioElement> | null = null;

  constructor(timeline: TimelineAudio, timelineView: TimelineView) {
    super(timeline, timelineView);
    this.elements = this.createElements();
    this.timeline = timeline;
    this.addHandlers();
    this.reactive();
  }

  createElements() {
    const get = appendHTML(
      this.container,
      /* html */ `
        <div class="timeline-row-start">
          <div class="timeline-row-start-content">
            <span class="timeline-audio-name">Audio</span>
            <input type="file"
                  accept="audio/mpeg,audio/aac,audio/ogg,audio/wav,audio/webm" />
          </div>
          <button class="timeline-row-remove" tile="Remove row" type="button">
            <img src="../html/xmark.svg">
          </button>
        </div>
        <div class="timeline-row-end">
          <div class="timeline-line timeline-audio-line"></div>
        </div>
      `
    );
    return {
      input: get<HTMLInputElement>("input[type=file]"),
      line: get<HTMLDivElement>(".timeline-line"),
      nameLabel: get<HTMLSpanElement>(".timeline-audio-name"),
      removeButton: get<HTMLButtonElement>(".timeline-row-remove"),
    };
  }

  isAudioBuilt = false;

  reactive() {
    const { input, nameLabel } = this.elements;
    if (this.timeline.hash && !this.audioRecord) {
      this.audioRecord = ensureNonNull(
        this.db.getAudioRecord(this.timeline.hash)
      );
    }
    input.style.display = this.audioRecord ? "none" : "block";

    if (this.audioRecord && !this.audioElement) {
      this.audioElement = this.audioRecord.then((record) =>
        getHTMLAudioElement(record.audio)
      );
    }

    if (this.audioRecord && this.audioElement && !this.isAudioBuilt) {
      this.isAudioBuilt = true;
      this.audioRecord.then((record) => {
        nameLabel.innerText = record.name;
      });

      this.audioElement.then((element) => {
        console.log(`!!! element`, element);
      });
    }
  }

  async handleFile(file: File) {
    const hash = await hashBlob(file);
    const record = await this.db.getAudioRecord(hash);
    if (record) {
      // This was already stored in the Audio database.
      this.audioRecord = Promise.resolve(record);
      this.timeline.hash = record.hash;
      this.audioElement = getHTMLAudioElement(record.audio);
    } else {
      this.audioRecord = this.db.addAudio(file.name, hash, file);
      this.timeline.hash = hash;
      this.audioElement = this.audioRecord.then((record) =>
        getHTMLAudioElement(record.audio)
      );
    }
    this.timelineView.needsSaving = true;

    this.audioElement.then((audioElement) => {
      const { timelineRecord } = this.timelineView;
      if (isNaN(audioElement.duration)) {
        console.error("The duration was not available", audioElement);
        return;
      }
      if (timelineRecord.duration < audioElement.duration) {
        this.timelineView.needsSaving = true;
        timelineRecord.duration = audioElement.duration;
      }
    });
    this.reactive();
  }

  addHandlers() {
    const { input, removeButton } = this.elements;

    // Handle file selection via input.
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      this.handleFile(file);
    });

    // Drag and drop support.
    this.container.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.container.classList.add("drag-over");
    });

    this.container.addEventListener("dragleave", () => {
      this.container.classList.remove("drag-over");
    });

    this.container.addEventListener("drop", (event) => {
      event.preventDefault();
      this.container.classList.remove("drag-over");

      const file = event.dataTransfer?.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("audio/")) {
        alert("Unsupported file type: " + file.type);
        return;
      }

      this.handleFile(file);
    });

    removeButton.addEventListener("click", () => {
      if (confirm("Are you sure you want to delete that row?")) {
        this.timelineView.updateTimeline((timelineRecord) => {
          timelineRecord.timeline = timelineRecord.timeline.filter(
            (timeline) => timeline !== this.timeline
          );
        });
      }
    });
  }
}

class DanceRow extends Row {}

class KeyframeRow extends Row {}

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

async function hashBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getHTMLAudioElement(blob: Blob): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);

    audio.preload = "metadata";

    audio.addEventListener("loadedmetadata", () => {
      resolve(audio);
    });

    audio.addEventListener("error", (e) => {
      URL.revokeObjectURL(url);
      reject(new Error("Error loading audio metadata"));
    });

    audio.src = url;
  });
}

function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);

    audio.preload = "metadata";

    audio.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url); // Clean up after ourselves
      if (isNaN(audio.duration)) {
        reject(new Error("Failed to read duration"));
      } else {
        resolve(audio.duration);
      }
    });

    audio.addEventListener("error", (e) => {
      URL.revokeObjectURL(url);
      reject(new Error("Error loading audio metadata"));
    });

    audio.src = url;
  });
}

function ensureNonNull<T>(promise: Promise<T | null | undefined>): Promise<T> {
  return promise.then((value) => {
    if (value === undefined) {
      return Promise.reject(new Error("The value was undefined"));
    }
    if (value === null) {
      return Promise.reject(new Error("The value was null"));
    }
    return value;
  });
}
