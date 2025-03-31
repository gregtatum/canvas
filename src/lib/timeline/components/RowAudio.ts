import type {
  AudioRecord,
  TimelineAudio,
  TimelineContext,
} from "lib/timeline/types";
import { Row, type TimelineView } from "lib/timeline/components";
import { appendHTML } from "lib/utils";

export class RowAudio extends Row {
  timeline: TimelineAudio;
  audioRecord?: Promise<AudioRecord>;
  elements: ReturnType<typeof RowAudio.prototype.createElements>;
  audioElementPromise?: Promise<HTMLAudioElement>;
  // This is only synchronously available
  audioElement?: HTMLAudioElement;
  audioWaveform?: AudioWaveform;
  isPlaying = true;

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
        <div class="_start">
          <div class="_content">
            <span class="_name">Audio</span>
            <input type="file"
                  accept="audio/mpeg,audio/aac,audio/ogg,audio/wav,audio/webm" />
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
      input: get<HTMLInputElement>("input[type=file]"),
      line: get<HTMLDivElement>(".row-line"),
      nameLabel: get<HTMLSpanElement>("._name"),
      removeButton: get<HTMLButtonElement>("._remove"),
      canvas: get<HTMLCanvasElement>("canvas"),
    };
  }

  isAudioBuilt = false;

  reactive() {
    const { input, nameLabel, canvas } = this.elements;

    if (this.timeline.hash && !this.audioRecord) {
      this.audioRecord = ensureNonNull(
        this.db.getAudioRecord(this.timeline.hash)
      );
    }
    input.style.display = this.audioRecord ? "none" : "block";

    if (this.audioRecord && !this.audioElementPromise) {
      this.audioElementPromise = this.audioRecord.then((record) =>
        getHTMLAudioElement(record.audio)
      );
    }

    if (this.audioRecord && this.audioElementPromise && !this.isAudioBuilt) {
      this.isAudioBuilt = true;
      this.audioRecord.then(({ name, audio }) => {
        nameLabel.innerText = name;
        AudioWaveform.create(audio, canvas, this.timelineView).then(
          (audioWaveform) => {
            this.audioWaveform = audioWaveform;
          }
        );
      });
    }
  }

  drawTimeline() {
    this.audioWaveform?.drawWaveform();
  }

  update(context: TimelineContext) {
    const { audioElement, timelineView } = this;
    const { time } = context;
    const { offset } = this.timeline;

    if (!audioElement || isNaN(audioElement.duration)) {
      return;
    }
    const inRange = time >= offset && time < time + audioElement.duration;

    if (inRange) {
      if (timelineView.wasScrubbed) {
        audioElement.currentTime = time - offset;
      }
      if (!this.isPlaying) {
        this.isPlaying = false;
        audioElement.play();
      }
    } else {
      if (this.isPlaying) {
        this.isPlaying = true;
      }
    }
  }

  async handleFile(file: File) {
    const hash = await hashBlob(file);
    const record = await this.db.getAudioRecord(hash);
    if (record) {
      // This was already stored in the Audio database.
      this.audioRecord = Promise.resolve(record);
      this.timeline.hash = record.hash;
      this.audioElementPromise = getHTMLAudioElement(record.audio);
    } else {
      this.audioRecord = this.db.addAudio(file.name, hash, file);
      this.timeline.hash = hash;
      this.audioElementPromise = this.audioRecord.then((record) =>
        getHTMLAudioElement(record.audio)
      );
    }
    this.timelineView.needsSaving = true;

    this.audioElementPromise.then((audioElement) => {
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

    audio.addEventListener("error", (error) => {
      console.error(error);
      URL.revokeObjectURL(url);
      reject(new Error("Error loading audio metadata"));
    });

    audio.src = url;
  });
}

class AudioWaveform {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  audioBuffer: AudioBuffer;
  timelineView: TimelineView;

  static async create(
    blob: Blob,
    canvas: HTMLCanvasElement,
    timelineView: TimelineView
  ): Promise<AudioWaveform> {
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(
      await blob.arrayBuffer()
    );
    return new AudioWaveform(audioBuffer, canvas, timelineView);
  }

  constructor(
    audioBuffer: AudioBuffer,
    canvas: HTMLCanvasElement,
    timelineView: TimelineView
  ) {
    this.audioBuffer = audioBuffer;
    this.canvas = canvas;
    this.timelineView = timelineView;
    {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not load the canvas context.");
      }
      this.ctx = ctx;
    }

    this.initCanvas();
    this.drawWaveform();
  }

  initCanvas() {
    let { width, height } = this.canvas.getBoundingClientRect();
    width *= devicePixelRatio;
    height *= devicePixelRatio;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  drawWaveform() {
    const { width, height } = this.canvas;
    const { audioBuffer } = this;
    const [startSec, endSec] = this.timelineView.secondsRange;
    const sampleRate = audioBuffer.sampleRate;

    const startSample = Math.floor(startSec * sampleRate);
    const endSample = Math.min(
      Math.floor(endSec * sampleRate),
      audioBuffer.length
    );
    const samplesToRender = endSample - startSample;

    if (samplesToRender <= 0) return;

    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel =
      audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;

    const samplesPerPixel = Math.floor(samplesToRender / width);
    if (samplesPerPixel < 1) return;

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = "#2593c7";

    const tempValues = new Float32Array(width);
    let maxOverall = 0;

    for (let x = 0; x < width; x++) {
      const start = startSample + x * samplesPerPixel;
      const end = Math.min(start + samplesPerPixel, endSample);

      let sum = 0;
      for (let i = start; i < end; i++) {
        sum += Math.abs(leftChannel[i]);
        if (rightChannel) sum += Math.abs(rightChannel[i]);
      }
      const value = sum / (samplesPerPixel * (rightChannel ? 2 : 1));
      tempValues[x] = value;
      if (value > maxOverall) maxOverall = value;
    }

    for (let x = 0; x < width; x++) {
      const value = tempValues[x];
      const y = (1 - value / maxOverall) * height;
      this.ctx.fillRect(x, y, 1, height);
    }
  }
}

/**
 * Helper function to convert a potential null Promise value into a Promise rejection.
 */
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
