import type { AudioRecord, TimelineAudio } from "lib/timeline/types";
import { Row, type TimelineView } from "lib/timeline/components";
import { appendHTML } from "lib/utils";

export class RowAudio extends Row {
  timeline: TimelineAudio;
  audioRecord?: Promise<AudioRecord>;
  elements: ReturnType<typeof RowAudio.prototype.createElements>;
  audioElement?: SyncPromise<HTMLAudioElement>;
  audioWaveform?: AudioWaveform;
  isPlaying = true;
  currentTimeNeedsSetting = true;

  constructor(timeline: TimelineAudio, timelineView: TimelineView) {
    super(timeline, timelineView);
    this.elements = this.createElements();
    this.timeline = timeline;
    this.addHandlers();
    this.reactive();
    console.log("[RowAudio]", this);
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

    if (this.audioRecord && !this.audioElement) {
      this.audioElement = getHTMLAudioElement(
        this.audioRecord.then((record) => record.audio)
      );
    }

    if (this.audioRecord && this.audioElement && !this.isAudioBuilt) {
      this.isAudioBuilt = true;
      this.audioRecord.then(({ name, audio }) => {
        nameLabel.innerText = name;
        AudioWaveform.create(
          audio,
          canvas,
          this.timelineView,
          this.timeline
        ).then((audioWaveform) => {
          this.audioWaveform = audioWaveform;
        });
      });
    }
  }

  drawTimeline() {
    this.audioWaveform?.drawWaveform();
  }

  update() {
    const { audioElement, timelineView } = this;
    const { time, isPlaying, wasScrubbed } = timelineView;
    const { offset } = this.timeline;

    if (!isPlaying) {
      if (this.isPlaying) {
        // The timeline stopped playing, but the audio still is, stop it here.
        this.isPlaying = false;
        audioElement?.value?.pause();
      }
      return;
    }

    if (wasScrubbed) {
      // Remember that the audio's time needs setting, even if it's not availablel yet.
      this.currentTimeNeedsSetting = true;
    }

    if (!audioElement?.value || isNaN(audioElement.value.duration)) {
      // The audio element is not ready to play yet.
      return;
    }
    const inRange = time >= offset && time < time + audioElement.value.duration;

    if (inRange) {
      if (this.currentTimeNeedsSetting) {
        // Either the timeline was scrubbed, or this is the first time the audio is
        // ready to play.
        audioElement.value.currentTime = time - offset;
        this.currentTimeNeedsSetting = false;
      }
      if (!this.isPlaying) {
        // We're in range, but the audio is not playing yet. Start playing it.
        this.isPlaying = true;
        audioElement.value.play();
      }
    } else {
      // This audio is out of range.
      if (this.isPlaying) {
        this.isPlaying = false;
        this.currentTimeNeedsSetting = true;
        audioElement.value.pause();
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
      this.audioElement = getHTMLAudioElement(record.audio);
    } else {
      this.audioRecord = this.db.addAudio(file.name, hash, file);
      this.timeline.hash = hash;
      this.audioElement = getHTMLAudioElement(
        this.audioRecord.then((record) => record.audio)
      );
    }
    this.timelineView.needsSaving = true;

    this.audioElement.promise.then((audioElement) => {
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

    this.timelineView.clickNoFocus(removeButton, () => {
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

function getHTMLAudioElement(
  blob: Blob | Promise<Blob>
): SyncPromise<HTMLAudioElement> {
  const promise = Promise.resolve(blob).then((blob) => {
    return new Promise<HTMLAudioElement>((resolve, reject) => {
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
  });

  return makeSyncPromise(promise);
}

class AudioWaveform {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  audioBuffer: AudioBuffer;
  timelineView: TimelineView;
  timelineAudio: TimelineAudio;

  static async create(
    blob: Blob,
    canvas: HTMLCanvasElement,
    timelineView: TimelineView,
    timelineAudio: TimelineAudio
  ): Promise<AudioWaveform> {
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(
      await blob.arrayBuffer()
    );
    return new AudioWaveform(audioBuffer, canvas, timelineView, timelineAudio);
  }

  constructor(
    audioBuffer: AudioBuffer,
    canvas: HTMLCanvasElement,
    timelineView: TimelineView,
    timelineAudio: TimelineAudio
  ) {
    this.audioBuffer = audioBuffer;
    this.canvas = canvas;
    this.timelineView = timelineView;
    this.timelineAudio = timelineAudio;
    {
      const ctx = canvas.getContext("2d", { alpha: false });
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
    const { audioBuffer, ctx } = this;

    // Clear background
    ctx.fillStyle = "#2e2e2e";
    ctx.fillRect(0, 0, width, height);

    const { range } = this.timelineView;
    const [rangeStart, rangeEnd] = range;
    const rangeDuration = rangeEnd - rangeStart;

    const audioDuration = audioBuffer.length / audioBuffer.sampleRate;
    const audioStart = this.timelineAudio.offset;
    const audioEnd = audioStart + audioDuration;

    const visibleStart = Math.max(rangeStart, audioStart);
    const visibleEnd = Math.min(rangeEnd, audioEnd);
    const visibleDuration = visibleEnd - visibleStart;

    const startSample = Math.floor(
      (visibleStart - audioStart) * audioBuffer.sampleRate
    );
    const endSample = Math.floor(
      (visibleEnd - audioStart) * audioBuffer.sampleRate
    );
    const samplesInRange = endSample - startSample;

    if (visibleDuration <= 0 || samplesInRange <= 0) return;

    const leftChannel = audioBuffer.getChannelData(0);

    const pixelsToDraw = Math.floor((visibleDuration / rangeDuration) * width);
    const pixelsStart = Math.floor(
      ((visibleStart - rangeStart) / rangeDuration) * width
    );

    if (pixelsToDraw <= 0) return;

    // Fill background under waveform range
    ctx.fillStyle = "#74c0e4";
    ctx.fillRect(pixelsStart, 0, pixelsToDraw, height);

    // Draw waveform
    ctx.fillStyle = "#2593c7";
    const halfHeight = height / 2;

    const samplesPerPixel = samplesInRange / pixelsToDraw;

    for (let x = 0; x < pixelsToDraw; x++) {
      const sampleStart = startSample + Math.floor(x * samplesPerPixel);
      const sampleEnd = Math.min(
        startSample + Math.floor((x + 1) * samplesPerPixel),
        leftChannel.length
      );

      let min = 1;
      let max = -1;

      for (let i = sampleStart; i < sampleEnd; i++) {
        const sample = leftChannel[i];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }

      const yMin = halfHeight * (1 - min);
      const yMax = halfHeight * (1 - max);

      const drawX = pixelsStart + x;
      ctx.fillRect(drawX, yMax, 1, yMin - yMax);

      ctx.fillRect(drawX, 0, 1, 3);
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

interface SyncPromise<T> {
  promise: Promise<T>;
  value: T | null;
}

function makeSyncPromise<T>(promise: Promise<T>): SyncPromise<T> {
  const result: SyncPromise<T> = {
    promise,
    value: null,
  };
  promise.then((value) => {
    result.value = value;
  });
  return result;
}
