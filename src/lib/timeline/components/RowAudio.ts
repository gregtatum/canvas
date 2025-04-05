import type { AudioRecord, TimelineAudio } from "lib/timeline/types";
import { Row, type TimelineView } from "lib/timeline/components";
import { appendHTML } from "lib/utils";

export class RowAudio extends Row {
  timeline: TimelineAudio;
  audioRecord?: Promise<AudioRecord>;
  elements: ReturnType<typeof RowAudio.prototype.createElements>;
  audioPlayer?: SyncPromise<AudioPlayer>;
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

    if (this.audioRecord && !this.audioPlayer) {
      this.audioPlayer = getAudioPlayer(
        this.audioRecord.then((record) => record.audio)
      );
    }

    if (this.audioRecord && this.audioPlayer && !this.isAudioBuilt) {
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
    const { timelineView } = this;
    const { time, isPlaying, wasScrubbed } = timelineView;
    const { offset } = this.timeline;

    const audioPlayer = this.audioPlayer?.value;

    if (!isPlaying) {
      if (this.isPlaying) {
        // The timeline stopped playing, but the audio still is, stop it here.
        this.isPlaying = false;
        audioPlayer?.pause();
      }
      return;
    }

    if (wasScrubbed) {
      // Remember that the audio's time needs setting, even if it's not available yet.
      this.currentTimeNeedsSetting = true;
      // Always stop audio immediately on scrub
      audioPlayer?.pause();
      this.isPlaying = false;
      this.currentTimeNeedsSetting = true;
    }

    if (!audioPlayer || isNaN(audioPlayer.duration)) {
      // The audio element is not ready to play yet.
      return;
    }
    const inRange = time >= offset && time < time + audioPlayer.duration;

    if (inRange) {
      if (this.currentTimeNeedsSetting) {
        // Either the timeline was scrubbed, or this is the first time the audio is
        // ready to play.
        audioPlayer.currentTime = time - offset;
        this.currentTimeNeedsSetting = false;
      }
      if (!this.isPlaying) {
        // We're in range, but the audio is not playing yet. Start playing it.
        this.isPlaying = true;
        audioPlayer.play();
      }
      if (this.currentTimeNeedsSetting) {
        audioPlayer.pause();
        audioPlayer.currentTime = time - offset;
        audioPlayer.play();
        this.currentTimeNeedsSetting = false;
      }
      if (!this.isPlaying) {
        this.isPlaying = true;
        audioPlayer.play();
      }
    } else {
      // This audio is out of range.
      if (this.isPlaying) {
        this.isPlaying = false;
        this.currentTimeNeedsSetting = true;
        audioPlayer.pause();
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
      this.audioPlayer = getAudioPlayer(record.audio);
    } else {
      this.audioRecord = this.db.addAudio(file.name, hash, file);
      this.timeline.hash = hash;
      this.audioPlayer = getAudioPlayer(
        this.audioRecord.then((record) => record.audio)
      );
    }
    this.timelineView.needsSaving = true;

    this.audioPlayer.promise.then((audioPlayer) => {
      const { timelineRecord } = this.timelineView;
      if (isNaN(audioPlayer.duration)) {
        console.error("The duration was not available", audioPlayer);
        return;
      }
      if (timelineRecord.duration < audioPlayer.duration) {
        this.timelineView.needsSaving = true;
        timelineRecord.duration = audioPlayer.duration;
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

function getAudioPlayer(blob: Blob | Promise<Blob>): SyncPromise<AudioPlayer> {
  const promise = Promise.resolve(blob).then(async (blob) => {
    const context = new AudioContext();
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    return new AudioPlayer(context, buffer);
  });

  return makeSyncPromise(promise);
}

/**
 * Use the WebAudio API's AudioContext to accurately play back an MP3. The
 * HTMLAudioElement is not high fidelity enough.
 */
class AudioPlayer {
  /**
   * The audio-processing graph.
   */
  context: AudioContext;

  /**
   * The PCM decoded audio from the source mp3 or other file. This is the entire song
   */
  buffer: AudioBuffer;

  /**
   * An AudioScheduledSourceNode which represents an audio source consisting of
   * in-memory audio data, stored in an AudioBuffer. It's especially useful for
   * playing back audio which has particularly stringent timing accuracy requirements,
   * such as for sounds that must match a specific rhythm and can be kept in memory
   * rather than being played from disk or the network.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/AudioBufferSourceNode)
   */
  source: AudioBufferSourceNode | null = null;

  startTime = 0;
  offset = 0;
  isPlaying = false;

  constructor(context: AudioContext, buffer: AudioBuffer) {
    this.context = context;
    this.buffer = buffer;
  }

  get currentTime(): number {
    if (this.isPlaying) {
      return this.context.currentTime - this.startTime + this.offset;
    }
    return this.offset;
  }

  set currentTime(value: number) {
    if (this.isPlaying) {
      this.pause();
      this.offset = value;
      this.play();
    } else {
      this.offset = value;
    }
  }

  get duration(): number {
    return this.buffer.duration;
  }

  play() {
    if (this.isPlaying) {
      return;
    }
    console.log("[AudioPlayer] play");
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.context.destination);
    this.startTime = this.context.currentTime;
    this.source.start(0, this.offset);
    this.isPlaying = true;

    this.source.onended = () => {
      this.isPlaying = false;
      this.offset = 0;
    };
  }

  pause() {
    console.log("[AudioPlayer] pause");
    if (!this.isPlaying || !this.source) return;
    this.source.stop();
    this.offset = this.currentTime;
    this.isPlaying = false;
  }
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
