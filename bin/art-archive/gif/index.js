import { EventEmitter } from "events";

/**
 * @typedef {Object} GifOptions
 * @prop {number} [repeat]       (default: 0)     repeat count, -1 = no repeat, 0 = forever
 * @prop {number} [quality]      (default: 10)    pixel sample interval, lower is better
 * @prop {number} [workers]      (default: 2)     number of web workers to spawn
 * @prop {string} [background]   (default: #fff)  background color where source image is transparent
 * @prop {number} [width]        (default: null)  output image width
 * @prop {number} [height]       (default: null)  output image height
 * @prop {string} [transparent]  (default: null)  transparent hex color, 0x00FF00 = green
 * @prop {boolean} [dither]      (default: false) dithering method, e.g. FloydSteinberg-serpentine
 * @prop {string} [workerScript] (default: "gif.worker.js")   url to load worker script from
 * @prop {boolean} [debug]       (default: false)
 */

/**
 * @typedef {Object} FrameOptions
 * @prop {number} delay - in milliseconds
 * @prop {boolean} copy
 */

/**
 * @typedef {Object} Frame
 * @prop {number} delay - in milliseconds
 * @prop {boolean} copy
 * @prop {string | null} transparent transparent hex color, 0x00FF00 = green
 */

/** @type {FrameOptions} */
const frameDefaults = {
  delay: 500, // ms
  copy: false,
};

export class GIF extends EventEmitter {
  /** @prop {Shape<GifOptions>} [options] */
  constructor(options) {
    super();
    this.running = false;
    /** @type {Frame[]} */
    this.frames = [];
    /** @type {Worker[]} */
    this.freeWorkers = [];
    /** @type {Worker[]} */
    this.activeWorkers = [];
    /** @type {HTMLCanvasElement | } */
    this._canvas = null;

    /** @type {GifOptions} */
    this.options = {
      workerScript: "gif.worker.js",
      workers: 2,
      repeat: 0, // repeat forever, -1 = repeat once
      background: "#fff",
      quality: 10, // pixel sample interval, lower is better
      width: null, // size determined from first frame if possible
      height: null,
      transparent: null,
      debug: false,
      dither: false, // see GIFEncoder.js for dithering options
      ...(options || {}),
    };

    this.sizeCanvas();
  }

  sizeCanvas() {
    // The canvas may be sized lazily.
    if (this._canvas) {
      if (this.options.width) {
        this._canvas.width = this.options.width;
      }
      if (this.options.height) {
        this._canvas.height = this.options.height;
      }
    }
  }

  /**
   * @param {CanvasRenderingContext2D | WebGLRenderingContext | HTMLImageElement} image
   * @param {Shape<FrameOptions>} [frameOptions]
   */
  addFrame(image, frameOptions = {}) {
    debugger;
    const frame = {
      ...frameDefaults,
      ...frameOptions,
      transparent: this.options.transparent,
    };

    // Use the image's width and height for options unless already set.
    if (this.options.width === null) {
      this.options.width = image.width;
      this.sizeCanvas();
    }
    if (this.options.height === null) {
      this.options.height = image.height;
      this.sizeCanvas();
    }

    if (image instanceof ImageData) {
      frame.data = image.data;
    } else if (
      image instanceof CanvasRenderingContext2D ||
      image instanceof WebGLRenderingContext
    ) {
      if (frameOptions.copy) {
        frame.data = this.getContextData(image);
      } else {
        frame.context = image;
      }
    } else if (image.childNodes) {
      if (frameOptions.copy) {
        frame.data = this.getImageData(image);
      } else {
        frame.image = image;
      }
    } else {
      throw new Error("Invalid image");
    }

    return this.frames.push(frame);
  }

  render() {
    let i;
    if (this.running) {
      throw new Error("Already running");
    }

    if (this.options.width === null || this.options.height === null) {
      throw new Error("Width and height must be set prior to rendering");
    }

    this.running = true;
    this.nextFrame = 0;
    this.finishedFrames = 0;

    this.imageParts = (() => {
      let asc, end;
      const result = [];
      for (
        i = 0, end = this.frames.length, asc = 0 <= end;
        asc ? i < end : i > end;
        asc ? i++ : i--
      ) {
        result.push(null);
      }
      return result;
    })();
    const numWorkers = this.spawnWorkers();
    // we need to wait for the palette
    if (this.options.globalPalette === true) {
      this.renderNextFrame();
    } else {
      let asc1, end1;
      for (
        i = 0, end1 = numWorkers, asc1 = 0 <= end1;
        asc1 ? i < end1 : i > end1;
        asc1 ? i++ : i--
      ) {
        this.renderNextFrame();
      }
    }

    this.emit("start");
    return this.emit("progress", 0);
  }

  abort() {
    while (true) {
      const worker = this.activeWorkers.shift();
      if (worker === null) {
        break;
      }
      this.log("killing active worker");
      worker.terminate();
    }
    this.running = false;
    return this.emit("abort");
  }

  spawnWorkers() {
    const numWorkers = Math.min(this.options.workers, this.frames.length);
    __range__(this.freeWorkers.length, numWorkers, false).forEach((i) => {
      this.log(`spawning worker ${i}`);
      const worker = new Worker(this.options.workerScript);
      worker.onmessage = (event) => {
        this.activeWorkers.splice(this.activeWorkers.indexOf(worker), 1);
        this.freeWorkers.push(worker);
        return this.frameFinished(event.data);
      };
      return this.freeWorkers.push(worker);
    });
    return numWorkers;
  }

  /**
   * @param {Frame} frame
   */
  frameFinished(frame) {
    this.log(
      `frame ${frame.index} finished - ${this.activeWorkers.length} active`
    );
    this.finishedFrames++;
    this.emit("progress", this.finishedFrames / this.frames.length);
    this.imageParts[frame.index] = frame;
    // remember calculated palette, spawn the rest of the workers
    if (this.options.globalPalette === true) {
      this.options.globalPalette = frame.globalPalette;
      this.log("global palette analyzed");
      if (this.frames.length > 2) {
        for (
          let i = 1, end = this.freeWorkers.length, asc = 1 <= end;
          asc ? i < end : i > end;
          asc ? i++ : i--
        ) {
          this.renderNextFrame();
        }
      }
    }
    if (Array.from(this.imageParts).includes(null)) {
      return this.renderNextFrame();
    }
    return this.finishRendering();
  }

  finishRendering() {
    let frame;
    let len = 0;
    for (frame of Array.from(this.imageParts)) {
      len += (frame.data.length - 1) * frame.pageSize + frame.cursor;
    }
    len += frame.pageSize - frame.cursor;
    this.log(`rendering finished - filesize ${Math.round(len / 1000)}kb`);
    const data = new Uint8Array(len);
    let offset = 0;
    for (frame of Array.from(this.imageParts)) {
      for (let i = 0; i < frame.data.length; i++) {
        const page = frame.data[i];
        data.set(page, offset);
        if (i === frame.data.length - 1) {
          offset += frame.cursor;
        } else {
          offset += frame.pageSize;
        }
      }
    }

    const image = new Blob([data], { type: "image/gif" });

    return this.emit("finished", image, data);
  }

  renderNextFrame() {
    if (this.freeWorkers.length === 0) {
      throw new Error("No free workers");
    }
    if (this.nextFrame >= this.frames.length) {
      return;
    } // no new frame to render

    const frame = this.frames[this.nextFrame++];
    const worker = this.freeWorkers.shift();
    const task = this.getTask(frame);

    this.log(`starting frame ${task.index + 1} of ${this.frames.length}`);
    this.activeWorkers.push(worker);
    worker.postMessage(task); //, [task.data.buffer]
  }

  /** @prop {CanvasRenderingContext2D | WebGLRenderingContext} */
  getContextData(ctx) {
    if (ctx instanceof CanvasRenderingContext2D) {
      return ctx.getImageData(0, 0, this.options.width, this.options.height)
        .data;
    }
    const gl = ctx;
    if (!(gl instanceof WebGLRenderingContext)) {
      throw new Error("Received a ctx that is not supported" + gl);
    }
    const { width, height } = gl.canvas;
    const pixels = new Uint8Array(width * height * 3);
    gl.readPixels(
      0, // x
      0, // y
      gl.canvas.width,
      gl.canvas.height,
      gl.RGB,
      gl.UNSIGNED_BYTE,
      pixels
    );
    console.log(pixels);
    return pixels;
  }

  /** @type {HTMLImageElement} */
  getImageData(image) {
    if (!this._canvas) {
      this._canvas = document.createElement("canvas");
      this._canvas.width = this.options.width;
      this._canvas.height = this.options.height;
    }

    const ctx = this._canvas.getContext("2d");
    ctx.setFill = this.options.background;
    ctx.fillRect(0, 0, this.options.width, this.options.height);
    ctx.drawImage(image, 0, 0);

    return this.getContextData(ctx);
  }

  /** @type {Frame} frame*/
  getTask(frame) {
    const index = this.frames.indexOf(frame);
    const task = {
      index,
      last: index === this.frames.length - 1,
      delay: frame.delay,
      transparent: frame.transparent,
      width: this.options.width,
      height: this.options.height,
      quality: this.options.quality,
      dither: this.options.dither,
      globalPalette: this.options.globalPalette,
      repeat: this.options.repeat,
      canTransfer: true,
    };

    if (frame.data) {
      task.data = frame.data;
    } else if (frame.context) {
      task.data = this.getContextData(frame.context);
    } else if (frame.image) {
      task.data = this.getImageData(frame.image);
    } else {
      throw new Error("Invalid frame");
    }

    return task;
  }

  log(...args) {
    if (!this.options.debug) {
      return;
    }
    console.log(...args);
  }
}

function __range__(left, right, inclusive) {
  const range = [];
  const ascending = left < right;
  const end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}
