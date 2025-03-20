import { type DanceDatabase } from "lib/dancecam";
import { TimelineRecord } from "lib/dancecam/messages";
import {
  addCSS,
  appendHTML,
  createHTML,
  ensureExists,
  LocationManager,
  reactiveInvalidator,
} from "lib/utils";

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

    this.reactiveUpdate();
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

  reactiveUpdate() {
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
    this.reactiveUpdate();
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
      this.reactiveUpdate();
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
        this.reactiveUpdate();
      },
      (error) => {
        console.error(error);
        alert("There was an error loading the timeline");
        this.reactiveUpdate();
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
      this.reactiveUpdate();
    } catch (error) {
      console.error(error);
      alert("There was an error creating the timeline");
      this.reactiveUpdate();
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
    this.reactiveUpdate();
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

    document.body.appendChild(this.elements.container);
  }

  static createElements() {
    const { container, get } = createHTML(/* html */ `
      <div class="timeline timeline-view">
        <div class="timeline-view-header">
          <div class="timeline-view-controls">
            <div class="timeline-view-time">00:10:00</div>
            <button class="timeline-view-play" type="button">
              <img src="../html/play.svg" />
            </button>
            <button class="timeline-view-record" type="button">
              <div />
            </button>
            <button class="timeline-view-close" type="button">
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
      closeButton: get<HTMLButtonElement>(".timeline-view-close"),
      canvas: get<HTMLCanvasElement>(".timeline-view-timeline canvas"),
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
        justify-content: space-between;
        background-color: var(--background-color);
        color: var(--font-color);
        align-items: center;

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
        box-sizing: content-box;
        padding: 0.7rem 0.7rem;
        gap: 0.7rem;
        justify-content: end;
      }

      .timeline-view-controls {
        & button {
          border: none;
          background: none;
          padding: 0;
          width: 24px;
          height: 24px;

          & img {
            width: 24px;
            height: 24px;
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
          width: 18px;
          height: 18px;
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

  reactiveUpdate() {}

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

export class TimelineManager2 {
  #danceDB: DanceDatabase;
  #danceNames: string[] = [];
  mount: HTMLElement;
  selectedTimeline: string | null;
  isRecording = false;
  elements: ReturnType<typeof TimelineManager2.getElements>;

  static async create(
    danceDB: DanceDatabase,
    mount: HTMLElement,
    selectedTimeline: string | null
  ) {
    const timelineNames = await danceDB.listTimelines();
    return new TimelineManager2(
      danceDB,
      timelineNames,
      mount,
      selectedTimeline
    );
  }

  constructor(
    danceDB: DanceDatabase,
    danceNames: string[],
    mount: HTMLElement,
    selectedTimeline: string | null
  ) {
    this.#danceDB = danceDB;
    this.#danceNames = danceNames;
    this.mount = mount;
    this.selectedTimeline = selectedTimeline;

    const parser = new DOMParser();
    const parsedHTML = parser.parseFromString(
      /* html */ `
      <div id="timeline">
        <div class="timeline-controls">
          <button id="timeline-discard">Discard</button>
          <button id="timeline-save">Save</button>
          <button id="timeline-delete">Delete</button>
          <button id="timeline-download">Download</button>
          <button id="timeline-record">Record</button>
          <select id="timeline-dropdown"></select>
        </div>
      </div>
    `,
      "text/html"
    );

    addCSS(/* css */ `
      #timeline {
        position: absolute;
        bottom: 0;
        width: 100%;
      }
      .timeline-controls {
        display: flex;
        justify-content: end;
        margin: 5px;
        gap: 5px;
      }
      .hide-ui #timeline {
        display: none;
      }
    `);

    const root = ensureExists(parsedHTML.body.firstElementChild);
    this.mount.appendChild(root);
    this.elements = TimelineManager2.getElements(root);

    this.addHandlers();
    this.refreshDances(danceNames);
    this.updateVisibility();
  }

  getSelectedTimeline() {
    if (!this.selectedTimeline) {
      return null;
    }
    return this.#danceDB.getDance(this.selectedTimeline);
  }

  static getElements(root: Element) {
    const getElement = <T extends HTMLElement>(selector: string): T => {
      const element = root.querySelector(selector);
      if (!element) {
        throw new Error(`Could not find element by selector "${selector}"`);
      }
      return element as T;
    };

    return {
      danceDropdown: getElement<HTMLSelectElement>("#timeline-dropdown"),
      recordButton: getElement<HTMLButtonElement>("#timeline-record"),
      saveButton: getElement<HTMLButtonElement>("#timeline-save"),
      discardButton: getElement<HTMLButtonElement>("#timeline-discard"),
      deleteButton: getElement<HTMLButtonElement>("#timeline-delete"),
      downloadButton: getElement<HTMLButtonElement>("#timeline-download"),
    };
  }

  addHandlers() {
    const {
      recordButton,
      danceDropdown,
      saveButton,
      discardButton,
      deleteButton,
      downloadButton,
    } = this.elements;

    danceDropdown.addEventListener("change", this.changeDance);
    recordButton.addEventListener("click", this.startRecording);
    saveButton.addEventListener("click", this.saveRecording);
    discardButton.addEventListener("click", this.discardRecording);
    deleteButton.addEventListener("click", this.deleteDance);
    downloadButton.addEventListener("click", this.downloadDance);
  }

  updateVisibility() {
    const {
      discardButton,
      recordButton,
      danceDropdown,
      deleteButton,
      saveButton,
      downloadButton,
    } = this.elements;

    // if (danceDropdown.value === LIVE_CAMERA) {
    //   hide(deleteButton);
    //   hide(downloadButton);
    //   if (this.isRecording) {
    //     hide(recordButton);
    //     hide(danceDropdown);
    //     show(discardButton);
    //     show(saveButton);
    //   } else {
    //     show(recordButton);
    //     show(danceDropdown);
    //     hide(discardButton);
    //     hide(saveButton);
    //   }
    // } else {
    //   hide(recordButton);
    //   hide(saveButton);
    //   hide(discardButton);
    //   show(deleteButton);
    //   show(downloadButton);
    // }
  }

  startRecording = () => {
    console.log("Start recording");
    // Start recording
    this.isRecording = true;
    this.updateVisibility();
    this.onStartRecording();
  };

  saveRecording = async () => {
    // Stop recording
    this.isRecording = false;
    this.updateVisibility();
    const dance = this.onStopRecording();
    if (dance.length) {
      const danceName = prompt("Enter a name for the new dance:") || "untitled";
      await this.#danceDB.addDance(danceName, dance);
      this.refreshDances(await this.#danceDB.listDances());
      this.elements.danceDropdown.value = danceName;
      this.selectedTimeline = danceName;
      this.elements.danceDropdown.value = danceName;
      this.changeDance();
      console.log("[TimelineManager2] saved", danceName, dance);
    } else {
      this.onDiscardRecording();
    }
  };

  discardRecording = () => {
    this.isRecording = false;
    this.updateVisibility();
    this.onDiscardRecording();
  };

  changeDance = async () => {
    const { danceDropdown } = this.elements;
    this.updateVisibility();
    this.selectedTimeline = danceDropdown.value;

    if (!this.selectedTimeline || this.selectedTimeline === LIVE_CAMERA) {
      this.onChangeDance(null);
    } else {
      const dance = await this.#danceDB.getDance(this.selectedTimeline);
      if (dance) {
        this.onChangeDance(dance);
      }
    }
  };

  deleteDance = async () => {
    if (
      !confirm(`Are you sure you want to delete "${this.selectedTimeline}"?`)
    ) {
      return;
    }
    const { danceDropdown } = this.elements;
    if (this.selectedTimeline) {
      const danceName = this.selectedTimeline;

      danceDropdown.selectedIndex += 1;
      this.selectedTimeline = danceDropdown.value;
      if (!danceDropdown.value) {
        this.selectedTimeline = LIVE_CAMERA;
        danceDropdown.value = LIVE_CAMERA;
      }
      this.changeDance();

      await this.#danceDB.deleteDance(danceName);
      console.log("[TimelineManager2] deleted", danceName);
      this.refreshDances(await this.#danceDB.listDances());
    }
  };

  downloadDance = async () => {
    if (this.selectedTimeline) {
      await this.#danceDB.downloadDance(this.selectedTimeline);
    }
  };

  refreshDances(danceNames: string[]) {
    this.#danceNames = danceNames;
    const { danceDropdown } = this.elements;
    const previousValue = this.selectedTimeline;
    while (danceDropdown.children.length > 1) {
      danceDropdown.lastChild!.remove();
    }
    for (const name of this.#danceNames) {
      const option = document.createElement("option");
      option.innerText = name;
      danceDropdown.appendChild(option);
    }
    danceDropdown.value = previousValue;
    if (!danceDropdown.value) {
      this.selectedTimeline = LIVE_CAMERA;
      this.changeDance();
    }
  }
}

export class AudioTimeline {
  name: string;
  audio: HTMLAudioElement | null;
  isPlaying = false;
  isActivePlayer = false;
  elements: ReturnType<typeof AudioTimeline.createElements>;
  blob: Promise<Blob | undefined>;

  constructor(name: string, container: Element, db: DanceDatabase) {
    this.name = name;
    this.blob = db.getAudioBlob(name);
    this.audio = null;
    this.blob.then(this.onBlobLoad, this.onBlobError);

    this.elements = AudioTimeline.createElements();

    container.appendChild(this.elements.container);
  }

  onBlobLoad = (blob: Blob | undefined) => {
    if (!blob) {
      this.showError(`The audio file "${this.name}" could not be found.`);
      return;
    }
    const audio = new Audio();
    {
      // Create the audio element.
      const url = URL.createObjectURL(blob);
      audio.src = url;
      audio.addEventListener("ended", () => URL.revokeObjectURL(url));
      this.audio = audio;
    }

    {
      // Setup the event listeners
      this.elements.playButton.addEventListener("click", () =>
        this.togglePlay()
      );
      audio.addEventListener("timeupdate", () => {
        this.elements.durationDisplay.textContent = this.formatTime(
          audio.currentTime
        );
      });
    }

    new AudioWaveform(this.audio, this.elements.waveformCanvas, blob);
    new Scrubbers(this.audio, this.elements.waveformWrapper);
  };

  onBlobError = (error: unknown) => {
    console.error(error);
    this.showError(
      `There was an error accessing the media file "${this.name}".`
    );
  };

  showError(error: string) {
    // eslint-disable-next-line no-alert
    alert(error);
  }

  static createElements() {
    const parser = new DOMParser();
    const html = `
      <div class="mediaAudio">
        <div class="mediaAudioWave" data-waveform>
          <canvas class="waveformCanvas"></canvas>
        </div>
        <div class="mediaAudioControls">
          <button class="mediaAudioControlsPlay" type="button" aria-label="Play">
            <span class="icon-mask" data-icon-mask="play"></span>
          </button>
          <div class="mediaAudioControlsSpacer"></div>
          <div class="mediaAudioControlsName">${this.name}</div>
          <div class="mediaAudioControlsDuration">0:00</div>
        </div>
      </div>
    `;
    const doc = parser.parseFromString(html, "text/html");
    const container = doc.body.firstChild as HTMLElement;

    function get<T extends Element>(querySelector: string): T {
      return ensureExists(container.querySelector<T>(querySelector));
    }

    return {
      container,
      playButton: get<HTMLButtonElement>(".mediaAudioControlsPlay"),
      durationDisplay: get<HTMLDivElement>(".mediaAudioControlsDuration"),
      waveformCanvas: get<HTMLCanvasElement>(".waveformCanvas"),
      waveformWrapper: get<HTMLDivElement>("[data-waveform]"),
      iconMask: get<HTMLSpanElement>(".icon-mask"),
    };
  }

  togglePlay() {
    if (this.isPlaying) {
      this.audio?.pause();
      this.elements.iconMask.setAttribute("data-icon-mask", "play");
    } else {
      this.audio?.play();
      this.elements.iconMask.setAttribute("data-icon-mask", "pause");
    }
    this.isPlaying = !this.isPlaying;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
}

class AudioWaveform {
  audio: HTMLAudioElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  blob: Blob;

  constructor(audio: HTMLAudioElement, canvas: HTMLCanvasElement, blob: Blob) {
    this.audio = audio;
    this.canvas = canvas;
    this.blob = blob;
    {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not load the canvas context.");
      }
      this.ctx = ctx;
    }

    this.initCanvas();
    this.audio.addEventListener("loadedmetadata", () => this.drawWaveform());
  }

  initCanvas() {
    let { width, height } = this.canvas.getBoundingClientRect();
    width *= devicePixelRatio;
    height *= devicePixelRatio;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  async drawWaveform() {
    const { width, height } = this.canvas;
    const audioContext = new AudioContext();
    const arrayBuffer = await this.blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const { waveform, maxWaveHeight } = this.getWaveform(audioBuffer, width);

    // Draw the waveform
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = "#aaa";
    waveform.forEach((value, x) => {
      const y = (1 - value / maxWaveHeight) * height;
      this.ctx.fillRect(x, y, 1, height);
    });
  }

  getWaveform(audioBuffer: AudioBuffer, size: number) {
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    const waveform: number[] = [];
    const window = Math.floor(leftChannel.length / size);
    let sum = 0;
    let maxWaveHeight = 0;

    for (let i = 0; i < leftChannel.length; i++) {
      sum += Math.abs(leftChannel[i]) + Math.abs(rightChannel[i]);
      if (i % window === window - 1) {
        const value = sum / window;
        waveform.push(value);
        maxWaveHeight = Math.max(maxWaveHeight, value);
        sum = 0;
      }
    }
    return { waveform, maxWaveHeight };
  }
}

class Scrubbers {
  audio: HTMLAudioElement;
  container: HTMLDivElement;
  elements: ReturnType<typeof Scrubbers.createElements>;

  constructor(audio: HTMLAudioElement, container: HTMLDivElement) {
    this.audio = audio;
    this.container = container;

    this.elements = Scrubbers.createElements(container);
    this.attachEvents();
  }

  static createElements(container: Element) {
    const get = appendHTML(
      container,
      /* html */ `
      <div
        className="mediaAudioScrubberPlayPosition"
        ref={playPositionRef}
      ></div>
      <div className="mediaAudioScrubberHorizontalLine">
        <div ref={horizontalLineRef}></div>
      </div>
      <div
        className="mediaAudioScrubberHoverPosition"
        ref={hoverPositionRef}
      ></div>
    `
    );

    return {
      playPosition: get<HTMLDivElement>("mediaAudioScrubberPlayPosition"),
      hoverPosition: get<HTMLDivElement>("mediaAudioScrubberHoverPosition"),
      horizontalLine: get<HTMLDivElement>("mediaAudioScrubberHorizontalLine"),
    };
  }

  attachEvents() {
    this.container.addEventListener("mousedown", (event) =>
      this.adjustAudioTime(event.clientX)
    );
    this.container.addEventListener("mousemove", (event) =>
      this.moveHover(event.clientX)
    );
    this.container.addEventListener("mouseup", (event) =>
      this.adjustAudioTime(event.clientX)
    );
    this.audio.addEventListener("timeupdate", () => this.updatePlayPosition());
  }

  toSongRatio(clientX: number): number {
    const { width, left } = this.container.getBoundingClientRect();
    const ratio = (clientX - left) / width;
    return Math.max(0, Math.min(1, ratio));
  }

  moveHover(clientX: number) {
    this.elements.hoverPosition.style.left = `${
      this.toSongRatio(clientX) * 100
    }%`;
  }

  adjustAudioTime(clientX: number) {
    this.audio.currentTime = this.audio.duration * this.toSongRatio(clientX);
  }

  updatePlayPosition() {
    const ratio = this.audio.currentTime / this.audio.duration;
    this.elements.playPosition.style.left = `${ratio * 100}%`;
    this.elements.horizontalLine.style.width = `${ratio * 100}%`;
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
