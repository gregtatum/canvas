import type { AudioRecord, CueAudio } from "lib/timeline/types";
import { Row, type Timeline } from "lib/timeline/components";
import { appendHTML } from "lib/utils";

export class RowAudio extends Row {
  cue: CueAudio;
  audioRecord?: Promise<AudioRecord>;
  elements: ReturnType<typeof RowAudio.prototype.createElements>;
  audioPlayer?: SyncPromise<AudioPlayer>;
  audioWaveform?: AudioWaveform;
  currentTimeNeedsSetting = true;

  constructor(cue: CueAudio, timeline: Timeline) {
    super(cue, timeline);
    this.elements = this.createElements();
    this.cue = cue;
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

    if (this.cue.hash && !this.audioRecord) {
      this.audioRecord = ensureNonNull(this.db.getAudioRecord(this.cue.hash));
    }
    input.style.display = this.audioRecord ? "none" : "block";

    if (this.audioRecord && !this.audioPlayer) {
      this.audioPlayer = AudioPlayer.create(
        this.timeline,
        this.audioRecord.then((record) => record.audio)
      );
    }

    if (this.audioRecord && this.audioPlayer && !this.isAudioBuilt) {
      this.isAudioBuilt = true;
      this.audioRecord.then(({ name, audio }) => {
        nameLabel.innerText = name;
        AudioWaveform.create(audio, canvas, this.timeline, this.cue).then(
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

  update() {
    const { timeline, cue } = this;
    const { time } = timeline;

    const audioPlayer = this.audioPlayer?.value;

    if (!timeline.time.isPlaying) {
      if (audioPlayer?.isPlaying) {
        // The timeline stopped playing, but the audio still is, stop it here.
        audioPlayer.stop();
      }
      return;
    }

    if (time.wasScrubbed) {
      // Remember that the audio's time needs setting, even if it's not available yet.
      this.currentTimeNeedsSetting = true;
      // Always stop audio immediately on scrub
      audioPlayer?.stop();
    }

    if (!audioPlayer) {
      // The audio player is not ready to play yet.
      return;
    }
    const inRange =
      time.now >= cue.offset && time.now < cue.offset + audioPlayer.duration;

    if (inRange) {
      if (this.currentTimeNeedsSetting) {
        audioPlayer.stop();
        this.currentTimeNeedsSetting = false;
      }
      if (!audioPlayer.isPlaying) {
        // We're in range, but the audio is not playing yet. Start playing it.
        audioPlayer.play(time.now - cue.offset);
      }
    } else {
      // This audio is out of range.
      if (audioPlayer.isPlaying) {
        audioPlayer.stop();
      }
    }
  }

  async handleFile(file: File) {
    const hash = await hashBlob(file);
    const record = await this.db.getAudioRecord(hash);
    if (record) {
      // This was already stored in the Audio database.
      this.audioRecord = Promise.resolve(record);
      this.cue.hash = record.hash;
      this.audioPlayer = AudioPlayer.create(this.timeline, record.audio);
    } else {
      this.audioRecord = this.db.addAudio(file.name, hash, file);
      this.cue.hash = hash;
      this.audioPlayer = AudioPlayer.create(
        this.timeline,
        this.audioRecord.then((record) => record.audio)
      );
    }
    this.timeline.needsSaving = true;

    this.audioPlayer.promise.then((audioPlayer) => {
      const { record } = this.timeline;
      if (isNaN(audioPlayer.duration)) {
        console.error("The duration was not available", audioPlayer);
        return;
      }
      if (record.duration < audioPlayer.duration) {
        this.timeline.needsSaving = true;
        record.duration = audioPlayer.duration;
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

    this.timeline.clickNoFocus(removeButton, () => {
      if (confirm("Are you sure you want to delete that row?")) {
        this.timeline.updateTimeline((timelineRecord) => {
          timelineRecord.cues = timelineRecord.cues.filter(
            (timeline) => timeline !== this.cue
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

/**
 * Use the WebAudio API's AudioContext to accurately play back an MP3. The
 * HTMLAudioElement is not high fidelity enough.
 */
class AudioPlayer {
  timeline: Timeline;

  /**
   * The PCM decoded audio from the source mp3 or other file. This is the entire song
   * in our case, even thought it's typically recommended for only short audio snippets.
   */
  buffer: AudioBuffer;

  /**
   * Schedules the AudioBuffer for playback in the current context. Only exists if the
   * player is playing.
   */
  source: AudioBufferSourceNode | null = null;

  sourceGeneration = 0;

  get isPlaying() {
    return Boolean(this.source);
  }

  static create(
    timeline: Timeline,
    blobOrPromise: Blob | Promise<Blob>
  ): SyncPromise<AudioPlayer> {
    const promise = Promise.resolve(blobOrPromise).then(async (blob) => {
      const buffer = await timeline.audioContext.decodeAudioData(
        await blob.arrayBuffer()
      );
      return new AudioPlayer(timeline, buffer);
    });

    return makeSyncPromise(promise);
  }

  constructor(timeline: Timeline, buffer: AudioBuffer) {
    this.timeline = timeline;
    this.buffer = buffer;
  }

  get duration(): Seconds {
    return this.buffer.duration;
  }

  play(time: Seconds) {
    if (this.source) {
      this.stop();
    }
    const { audioContext } = this.timeline;

    // A new buffer source must be created every time.
    const source = audioContext.createBufferSource();

    source.buffer = this.buffer;
    source.connect(audioContext.destination);
    source.start(0, time);

    this.sourceGeneration++;
    const sourceGeneration = this.sourceGeneration;
    source.addEventListener("ended", () => {
      if (sourceGeneration === this.sourceGeneration) {
        this.source = null;
      }
    });

    this.source = source;
  }

  stop() {
    const source = this.source;
    if (source) {
      source.stop();
      this.source = null;
    }
  }
}

class AudioWaveform {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  audioBuffer: AudioBuffer;
  timeline: Timeline;
  cueAudio: CueAudio;

  static async create(
    blob: Blob,
    canvas: HTMLCanvasElement,
    timeline: Timeline,
    cueAudio: CueAudio
  ): Promise<AudioWaveform> {
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(
      await blob.arrayBuffer()
    );
    return new AudioWaveform(audioBuffer, canvas, timeline, cueAudio);
  }

  constructor(
    audioBuffer: AudioBuffer,
    canvas: HTMLCanvasElement,
    timeline: Timeline,
    cueAudio: CueAudio
  ) {
    this.audioBuffer = audioBuffer;
    this.canvas = canvas;
    this.timeline = timeline;
    this.cueAudio = cueAudio;
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

    const { range } = this.timeline;
    const [rangeStart, rangeEnd] = range;
    const rangeDuration = rangeEnd - rangeStart;

    const audioDuration = audioBuffer.length / audioBuffer.sampleRate;
    const audioStart = this.cueAudio.offset;
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
