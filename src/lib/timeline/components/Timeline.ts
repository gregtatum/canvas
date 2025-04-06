import { type DanceDatabase } from "lib/posecam";
import type { Cue, TimelineRecord } from "lib/timeline/types";
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
import { DurationEditor } from "./DurationEditor";

export class Timeline {
  db: DanceDatabase;
  elements: ReturnType<typeof Timeline.createElements>;
  durationEditor: DurationEditor;
  timelineName: string;
  record: TimelineRecord;
  range: [Seconds, Seconds];
  closeTimeline: () => void;
  ctx: CanvasRenderingContext2D;
  width: CssPixels = 0;
  time: SynchronizedTime;
  mouseAtTime: CssPixels = 0;
  pressedMouseTime: Seconds | null = null;
  undos = new UndoHistory();

  /**
   * The audio context is the source of truth for timing in order to be able to do
   * high fidelity timing. Access the seconds via audioContext.currentTime.
   */
  audioContext = new AudioContext();

  constructor(
    db: DanceDatabase,
    timelineName: string,
    record: TimelineRecord,
    closeTimeline: () => void,
    shadowRoot: ShadowRoot
  ) {
    this.db = db;
    this.timelineName = timelineName;
    this.record = record;
    this.time = new SynchronizedTime(this.audioContext);
    this.closeTimeline = closeTimeline;

    this.elements = Timeline.createElements(shadowRoot);
    this.durationEditor = new DurationEditor(
      this.elements.durationEditorMount,
      this
    );
    this.setupHandlers();
    this.ctx = ensureExists(
      this.elements.canvas.getContext("2d", { alpha: false })
    );

    this.range = [0, this.record.duration];

    this.reactive();
    shadowRoot.appendChild(this.elements.container);
    this.elements.container.focus();
  }

  static createElements(shadowRoot: ShadowRoot) {
    const { container, get } = createHTML(/* html */ `
      <div class="timeline" tabindex="0">
        <div class="header">
          <div class="_controls">
            <div class="duration-editor">
              <div class="_time"></div>
            </div>
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
          </div>
        </div>
        <div class="rows">
          <!-- Timeline rows get appended here. -->
        </div>
        <div class="scrubbers">
          <div class="_time"></div>
          <div class="_start"></div>
        </div>
      </div>
    `);

    return {
      shadowRoot,
      container,
      addButton: get<HTMLButtonElement>("._add"),
      playButton: get<HTMLButtonElement>("._play"),
      playButtonImg: get<HTMLImageElement>("._play img"),
      recordButton: get<HTMLButtonElement>("._record"),
      closeButton: get<HTMLButtonElement>("._close"),
      tickmarks: get<HTMLDivElement>("._tickmarks"),
      canvas: get<HTMLCanvasElement>("._tickmarks canvas"),
      scrubberStart: get<HTMLCanvasElement>(".scrubbers ._start"),
      scrubberTime: get<HTMLCanvasElement>(".scrubbers ._time"),
      rows: get(".rows"),
      durationEditorMount: get<HTMLElement>(".duration-editor"),
    };
  }

  prevWindowWidth = -1;
  // 1 second to 1 hour.
  tickIntervals = [1, 5, 10, 30, 60, 300, 600, 1800, 3600];
  redrawTimeline = reactiveInvalidator([
    () => this.record.duration,
    () => this.range[0],
    () => this.range[1],
    () => window.innerWidth,
  ]);
  reactiveDrawTimeline() {
    if (!this.redrawTimeline()) {
      return;
    }
    for (const cue of this.record.cues) {
      const rowView = this.rowViewsByCue.get(cue);
      rowView?.drawTimeline();
    }
    const { range: secondsRange, ctx } = this;
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
    this.record.duration;

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

    const { duration: boundsInSeconds } = this.record;
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

    container.addEventListener("wheel", this.wheelHandler, {
      passive: false,
    });

    this.clickNoFocus(closeButton, this.closeTimeline);
    this.clickNoFocus(addButton, this.addNewRow);
    this.clickNoFocus(playButton, this.togglePlay);
    container.addEventListener("mousemove", this.mouseMoveHandler);
    tickmarks.addEventListener("mousedown", this.tickmarksMouseDown);
    window.addEventListener("mouseup", this.tickmarksMouseUp);
    window.addEventListener("blur", this.tickmarksMouseUp);
    this.elements.container.addEventListener("keydown", this.keydown);
  }

  /**
   * Clicks a button but doesn't steal focus.
   */
  clickNoFocus(element: HTMLElement, handler: (ev: MouseEvent) => any) {
    let prevActiveElement: Element | null = null;
    element.addEventListener(
      "mouseup",
      (event) => {
        event.stopImmediatePropagation();
        event.stopPropagation();
        event.preventDefault();
        handler(event);
      },
      true
    );
    element.addEventListener("mousedown", (event) => {
      prevActiveElement =
        this.elements.shadowRoot.activeElement ?? this.elements.container;
      event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();
    });
    element.addEventListener("click", (event) => {
      const element = prevActiveElement;
      if (element) {
        prevActiveElement = null;
        requestAnimationFrame(() => {
          (element as HTMLElement).focus();
        });
      } else {
        handler(event);
      }
    });
  }

  isActiveElement() {
    const { container, shadowRoot } = this.elements;
    return shadowRoot.activeElement === container;
  }

  keydown = (event: KeyboardEvent) => {
    let key = event.key.toLowerCase();
    if (key === " ") {
      key = "space";
    }
    if (event.shiftKey) {
      key = `shift-${key}`;
    }
    if (event.ctrlKey || event.metaKey) {
      key = `ctrl-${key}`;
    }
    if (!this.isActiveElement()) {
      if (key === "escape" && this.elements.shadowRoot.activeElement) {
        this.elements.container.focus();
      }
      return;
    }
    switch (key) {
      case "space": {
        this.togglePlay();
        break;
      }
      case "ctrl-z": {
        this.undos.undo();
        break;
      }
      case "ctrl-shift-z": {
        this.undos.redo();
        break;
      }
      case "ctrl-arrowleft": {
        event.preventDefault();
        this.time.start = 0;
        this.time.seek(0);
        break;
      }
      case "arrowright":
      case "arrowleft":
      case "shift-arrowright":
      case "shift-arrowleft": {
        const direction = key.endsWith("right") ? 1 : -1;
        const amount = key.startsWith("shift") ? 5 : 1;
        let newTime = this.time.now + direction * amount;
        // Keep the time in bounds.
        newTime = Math.min(Math.max(0, newTime), this.record.duration);
        this.time.seek(newTime);
        break;
      }
      default:
        break;
    }
  };

  mouseMoveHandler = (event: MouseEvent) => {
    const timelineLeft: CssPixels =
      event.clientX - window.innerWidth + this.width;
    const [start, end] = this.range;
    const duration: Seconds = end - start;
    const rangeRatio = timelineLeft / this.width;
    this.mouseAtTime = start + duration * rangeRatio;
  };

  tickmarksMouseDown = () => {
    this.pressedMouseTime = this.mouseAtTime;
  };

  tickmarksMouseUp = () => {
    if (this.pressedMouseTime === this.mouseAtTime) {
      this.time.seek(this.mouseAtTime);
      this.time.start = this.mouseAtTime;
    }
    this.pressedMouseTime = null;
  };

  wheelHandler = (event: WheelEvent) => {
    if (!this.isActiveElement()) {
      return;
    }
    const { canvas } = this.elements;
    const timelineDuration = this.record.duration; // End time, implied start is always 0
    const [start, end] = this.range;
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
    this.range[0] = newStart;
    this.range[1] = newEnd;
  };

  addNewRow = () => {
    const newCue = this.record.cues.find((timeline) => timeline.type === "new");
    if (newCue) {
      this.rowViewsByCue
        .get(newCue)
        ?.container?.querySelector("select")
        ?.focus();
      // Don't add a second one here.
      return;
    }
    const oldCues = this.record.cues;
    const newCues = this.record.cues.slice();
    newCues.push({ type: "new" });

    this.undos.apply(
      () => {
        this.record.cues = newCues;
        this.reactive();
      },
      () => {
        this.record.cues = oldCues;
        this.reactive();
      }
    );
  };

  togglePlay = () => {
    const { playButtonImg } = this.elements;
    if (this.time.isPlaying) {
      // Stop the timeline.
      this.time.stop();
      playButtonImg.src = "../html/play.svg";
    } else {
      // Play the timeline
      this.time.play();
      playButtonImg.src = "../html/pause.svg";
    }
  };

  prevCues: Cue[] = [];
  rowViewsByCue = new WeakMap<Cue, Row>();
  isDurationInvalidated = reactiveInvalidator([() => this.record.duration]);
  reactive() {
    if (this.record.cues !== this.prevCues) {
      this.rebuildTimelines();
    }

    this.durationEditor.reactive();
  }

  getRowViews() {
    return this.record.cues.map((cue) => this.rowViewsByCue.get(cue));
  }

  /**
   * Synchronize the timeline views.
   */
  rebuildTimelines() {
    const rowsElements = this.elements.rows;
    for (let i = 0; i < this.record.cues.length; i++) {
      const cue = this.record.cues[i];
      const element: Element | undefined = rowsElements.children[i];
      const nextElement: Element | undefined = rowsElements.children[i - 1];
      let rowView = this.rowViewsByCue.get(cue);
      if (element && element === rowView?.container) {
        continue;
      }
      if (!rowView) {
        rowView = createTimelineRow(cue, this);
        this.rowViewsByCue.set(cue, rowView);
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
    while (rowsElements.childElementCount > this.record.cues.length) {
      rowsElements.lastElementChild?.remove();
    }
  }

  update() {
    this.time.updateStart();
    this.updateTimeRange();
    this.updateScrubbers();
    this.updateRows();
    this.durationEditor.update();
    this.time.updateEnd();
  }

  updateTimeRange() {
    if (!this.time.isPlaying) {
      return;
    }
    const [start, end] = this.range;
    const duration = end - start;
    if (this.time.now < start) {
      this.range[0] = this.time.now;
      this.range[1] = this.time.now + duration;
    }
    const step = duration / 10;
    if (this.time.now + step > end) {
      this.range[1] = Math.min(this.range[1] + step, this.record.duration);
      this.range[0] = Math.max(0, this.range[1] - duration);
    }
    if (this.time.now > this.record.duration) {
      this.togglePlay();
    }
  }

  updateRows() {
    for (const timeline of this.record.cues) {
      const rowView = ensureExists(
        this.rowViewsByCue.get(timeline),
        "Expected a Row view to be in the rowViews WeakMap."
      );
      rowView.update();
    }
  }

  updateScrubbers() {
    this.elements.scrubberStart.style.left = `${this.secondsToCssPixels(
      this.time.start
    )}px`;
    this.elements.scrubberTime.style.left = `${this.secondsToCssPixels(
      this.time.now
    )}px`;
  }

  secondsToCssPixels(seconds: Seconds): CssPixels {
    const [start, end] = this.range;
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

function createTimelineRow(cue: Cue, timeline: Timeline) {
  switch (cue.type) {
    case "new":
      return new NewRow(cue, timeline);
    case "audio":
      return new RowAudio(cue, timeline);
    case "dance":
      return new RowDance(cue, timeline);
    case "keyframe":
      return new RowKeyframe(cue, timeline);
    default:
      throw new UnhandledCaseError(cue, "Timeline");
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

/**
 * Synchronizes the Timeline time to the AudioContext time to allow for high fidelity
 * synchronziations between visuals and audio.
 */
class SynchronizedTime {
  #time: Seconds = 0;
  #audioContextOffset: Seconds = 0;
  #audioContext: AudioContext;

  /**
   * Where to start the time when playing.
   */
  start: Seconds = 0;

  /**
   * Is the time playing?
   */
  #isPlaying = false;

  /**
   * If the time was changed programmatically, mark it is as scrubbed so that Cues
   * can react.
   */
  wasScrubbed = true;

  constructor(audioContext: AudioContext) {
    this.#audioContext = audioContext;
  }

  /**
   * Called once at the top update tick.
   */
  updateStart() {
    if (this.isPlaying) {
      this.#time = this.#audioContext.currentTime - this.#audioContextOffset;
    } else {
      this.#time = this.start;
    }
  }

  /**
   * Called once at the bottom of the update tick.
   */
  updateEnd() {
    this.wasScrubbed = false;
  }

  /**
   * The time will remain stable throughout an update/draw tick. It is the seconds
   * relative to the Timeline.
   */
  get now(): Seconds {
    return this.#time;
  }

  get isPlaying(): boolean {
    return this.#isPlaying;
  }

  seek(time: Seconds) {
    if (this.isPlaying) {
      this.#audioContextOffset += this.#time - time;
    } else {
      this.start = time;
    }
    this.wasScrubbed = true;
  }

  play() {
    this.#isPlaying = true;
    this.#audioContextOffset = this.#audioContext.currentTime - this.start;
  }

  stop() {
    this.#isPlaying = false;
    this.#time = this.start;
    this.wasScrubbed = true;
  }
}

interface UndoRedo {
  undo: () => void;
  redo: () => void;
}

class UndoHistory {
  undos: Array<UndoRedo> = [];
  redos: Array<UndoRedo> = [];
  savedAt?: UndoRedo;

  undo() {
    const undoRedo = this.undos.pop();
    if (undoRedo) {
      undoRedo.undo();
      this.redos.push(undoRedo);
    }
  }

  redo() {
    const undoRedo = this.redos.pop();
    if (undoRedo) {
      undoRedo.redo();
      this.undos.push(undoRedo);
    }
  }

  /**
   * Immediately apply an action, and add it to the history.
   */
  apply(apply: () => void, undo: () => void) {
    apply();
    this.push(apply, undo);
  }

  /**
   * Just push onto the history without applying the action.
   */
  push(redo: () => void, undo: () => void) {
    if (this.redos.length) {
      this.redos.length = 0;
    }
    this.undos.push({ undo, redo });
  }

  needsSaving(): boolean {
    if (this.savedAt) {
      return this.undos[this.undos.length - 1] !== this.savedAt;
    }
    return this.undos.length !== 0;
  }

  markSaved() {
    this.savedAt = this.undos[this.undos.length - 1];
  }
}
