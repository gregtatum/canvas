import { appendHTML, ensureExists } from "lib/utils";
import { type Timeline } from "lib/timeline/components";

export class Tickmarks {
  timeline: Timeline;
  isPressed = false;
  elements: ReturnType<typeof Tickmarks.createElements>;
  ctx: CanvasRenderingContext2D;
  // 1 second to 1 hour.
  tickIntervals = [1, 5, 10, 30, 60, 300, 600, 1800, 3600];
  prevWindowWidth = -1;

  constructor(timeline: Timeline, container: HTMLDivElement) {
    this.timeline = timeline;
    this.elements = Tickmarks.createElements(container);
    this.ctx = ensureExists(
      this.elements.canvas.getContext("2d", { alpha: false })
    );
    this.setupHandlers();
  }

  static createElements(container: HTMLDivElement) {
    const get = appendHTML(
      container,
      /* html */ `
        <canvas></canvas>
        <div class="_zoom"></div>
      `
    );
    return {
      container,
      canvas: get<HTMLCanvasElement>("canvas"),
    };
  }

  setupHandlers() {
    const { container } = this.elements;
    container.addEventListener("mousedown", this.tickmarksMouseDown);
    window.addEventListener("mouseup", this.tickmarksMouseUp);
    window.addEventListener("blur", this.tickmarksMouseUp);
  }

  tickmarksMouseDown = () => {
    this.isPressed = true;
    this.moveScrubber();
  };

  tickmarksMouseUp = () => {
    this.isPressed = false;
  };

  moveScrubber() {
    const { time, mouseAtTime } = this.timeline;
    time.seek(mouseAtTime);
  }

  mouseMoved() {
    if (this.isPressed) {
      this.moveScrubber();
    }
  }

  draw() {
    const { timeline, ctx } = this;
    const { canvas } = this.elements;

    // Properly size the canvas.
    this.prevWindowWidth = window.innerWidth;
    const rect = this.elements.canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;

    // Clear the canvas
    ctx.fillStyle = "#433";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const timeRange = timeline.range[1] - timeline.range[0];
    timeline.record.duration;

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
      ((time - timeline.range[0]) / timeRange) * width;

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
        Math.ceil(timeline.range[0] / majorTickInterval) * majorTickInterval;
      t <= timeline.range[1];
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
        Math.ceil(timeline.range[0] / minorTickInterval) * minorTickInterval;
      t <= timeline.range[1];
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

    const { duration: boundsInSeconds } = timeline.record;
    // Draw progress bar (small bar at the top)
    const progressBarHeight = 5;

    ctx.fillStyle = "#ff0";
    ctx.fillRect(
      (timeline.range[0] / boundsInSeconds) * width,
      0,
      ((timeline.range[1] - timeline.range[0]) / boundsInSeconds) * width,
      progressBarHeight
    );
  }
}
