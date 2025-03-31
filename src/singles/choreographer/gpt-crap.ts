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
