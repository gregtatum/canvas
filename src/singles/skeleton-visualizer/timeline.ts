import { type DanceDatabase } from "lib/dancecam";
import { TimelineRecord } from "lib/dancecam/messages";
import {
  addCSS,
  appendHTML,
  createHTML,
  ensureExists,
  LocationManager,
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
}

class TimelineView {
  db: DanceDatabase;
  elements: ReturnType<typeof TimelineView.createElements>;
  timelineName: string;
  timelineRecord: TimelineRecord;
  closeTimeline: () => void;

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

    document.body.appendChild(this.elements.container);
  }

  static createElements() {
    const { container, get } = createHTML(/* html */ `
      <div class="timeline timeline-view">
        timeline view
        <button class="timeline-view-close" type="button">Close</button>
      </div>
    `);

    return {
      container,
      closeButton: get<HTMLButtonElement>(".timeline-view-close"),
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
        padding: 0.3rem;
        border-top: 1px solid var(--border-color-subtle);
        justify-content: space-between;
        background-color: var(--background-color);
        color: var(--font-color);
        align-items: center;
      }
    `);
  }

  setupHandlers() {
    this.elements.closeButton.addEventListener("click", this.closeTimeline);
  }

  reactiveUpdate() {}

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
