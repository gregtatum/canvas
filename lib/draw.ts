import lerp from "lerp";

export function setupCanvas(): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  const maybeCtx = canvas.getContext("2d", { alpha: false });
  if (!maybeCtx) {
    throw new Error("Could not get a 2d context.");
  }
  const ctx = maybeCtx;
  document.body.appendChild(canvas);

  function resize(): void {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  resize();
  window.addEventListener("resize", resize, false);

  return ctx;
}

type Seconds = number;
type LoopCallback = (time: Seconds, dt: Seconds) => void;

export function loop(callback: LoopCallback): void {
  let startTime: null | number = null;
  let lastTime = 0;

  function innerLoop(): void {
    let now = 0;
    let dt;
    if (startTime === null) {
      startTime = Date.now() / 1000;
      dt = 1 / 60;
    } else {
      now = Date.now() / 1000 - startTime;
      dt = Math.min(now - lastTime, 1 / 30);
      lastTime = now;
    }
    callback(now, dt);
    requestAnimationFrame(innerLoop);
  }

  requestAnimationFrame(innerLoop);
}

export function generateSeed(): string {
  const seed =
    window.location.hash.substr(1) || String(Math.random()).split(".")[1];
  console.log("current seed", seed);

  // Reload the page on hash change.
  window.addEventListener("hashchange", () => {
    location.reload();
  });
  return seed;
}

const TAU = Math.PI;
export function lerpTheta(a: number, b: number, t: number): number {
  a = ((a % TAU) + TAU) % TAU;
  b = ((b % TAU) + TAU) % TAU;

  if (b - a > Math.PI) {
    a += TAU;
  }
  return lerp(a, b, t);
}
