// @ts-check

/* eslint-disable @typescript-eslint/explicit-function-return-type */ // This appears to be broken
/* eslint-disable no-console */
import { GIF } from "./gif";

let apiUrl = "http://localhost:" + 55123;
const workerScript = "html/gif.worker.js";

console.log("bin/art-archive/client.js");
export function addKeyboardShortcuts() {
  console.log(
    [
      "[art-archive] Shortcuts:",
      "  ⌘+s: save the current image to art archive",
      "  ⌘+d: save the current image with a name",
      "  ⌘+g: save a gif",
    ].join("\n")
  );

  let finishGif = null;
  checkForGifWorker();

  document.addEventListener(
    "keydown",
    (event) => {
      let key = event.key;
      if (event.metaKey) {
        key = "cmd-" + key;
      }
      if (event.ctrlKey) {
        key = "ctrl-" + key;
      }
      if (event.altKey) {
        key = "alt-" + key;
      }
      if (event.shiftKey) {
        key = "shift-" + key;
      }
      let foundKey = true;
      switch (key) {
        case "cmd-d":
        case "ctr-d": {
          postCanvas(getCanvas(), { requestName: true });
          break;
        }
        case "cmd-s":
        case "ctr-s": {
          postCanvas(getCanvas());
          break;
        }
        case "cmd-g":
        case "ctr-g": {
          if (finishGif) {
            finishGif().then((blob) => {
              console.log("Gif processed:", blob);
            });
            finishGif = null;
          } else {
            finishGif = recordGif(getCanvas());
          }
          break;
        }
        default:
          foundKey = false;
      }
      if (foundKey) {
        event.preventDefault();
      }
    },
    true
  );
}

function getCanvas() {
  const canvases = document.querySelectorAll("canvas");
  if (canvases.length !== 1) {
    throw new Error(
      "[art-archive] More than one canvas was found when saving."
    );
  }
  return canvases[0];
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ requestName?: boolean }} [options]
 * @returns {Promise<void>}
 */
export async function postCanvas(canvas, options = {}) {
  // WebGL clears the canvas, so this needs to happen during a rAF.
  await new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  const formData = new FormData();
  formData.append("url", window.location.toString());
  formData.append("image", blob);
  const params = new URLSearchParams(window.location.search);
  formData.append("project", params.get("project"));
  formData.append("slug", params.get("slug"));

  if (options.requestName) {
    // eslint-disable-next-line no-alert
    const name = prompt("Name of this piece?");
    if (!name) {
      return;
    }
    formData.append("name", name);
  } else {
    formData.append("name", params.get("name"));
  }

  console.log("Saving the art...");
  /** @type {any} */
  const response = await postRequest("/publish-code", formData);
  console.log(response.success);
}

/**
 * @param {number} port
 * @returns {void}
 */
export function setPort(port) {
  apiUrl = "http://localhost:" + port;
}

/**
 * @template ExpectedResult
 * @param {'GET' | 'DELETE'} method
 * @param {string} path
 * @param {{ [key: string]: string | number | undefined | null; }} [params]
 * @returns {Promise<ExpectedResult>}
 */
export async function makeRequest(method, path, params) {
  // Build the URL with the search params.
  if (path[0] !== "/") {
    throw new Error("Expected paths to start with /");
  }
  const url = new URL(apiUrl + path);
  for (const key in params) {
    const maybeValue = params[key];
    if (
      Object.prototype.hasOwnProperty.call(params, key) &&
      maybeValue !== null &&
      maybeValue !== undefined
    ) {
      const value = String(maybeValue);
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }

  const urlString = url.toString();

  return _processFetchResponse(
    fetch(urlString, {
      method,
    }),
    method,
    urlString,
    params
  );
}

/**
 * @template ExpectedResult
 * @param {string} path
 * @param {FormData} formData
 * @returns {Promise<ExpectedResult>}
 */
export async function postRequest(path, formData) {
  if (path[0] !== "/") {
    throw new Error("Expected paths to start with /");
  }
  const urlString = apiUrl + path;

  return _processFetchResponse(
    fetch(urlString, {
      method: "POST",
      body: formData,
    }),
    "POST",
    urlString,
    formData
  );
}

/**
 * @template ExpectedResponse
 * @param {Promise<Response>} responsePromise
 * @param {string} method
 * @param {string} url
 * @param {unknown} payload
 * @returns {Promise<ExpectedResponse>}
 */
async function _processFetchResponse(responsePromise, method, url, payload) {
  const startTime = Date.now();

  console.log("[art-archive] request " + method, {
    url,
    payload,
  });

  try {
    const response = await responsePromise;

    // Do not resolve the promise if there is an error.
    if (response.status >= 400) {
      let text = "There was a server error.";
      try {
        text = await response.text();
      } catch (e) {
        // Do nothing.
      }
      throw new Error(text);
    }

    const json = await response.json();

    const duration = Date.now() - startTime;
    console.log(`[art-archive] response (${duration}ms):`, { json, response });

    return json;
  } catch (error) {
    console.log("[art-archive] Request failed:", error);
    throw error;
  }
}

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
 * @typedef {Object} GifJsExports
 * @prop {any} NeuQuant
 * @prop {any} TypedNeuQuant
 * @prop {any} GIFEncoder
 * @prop {any} LZWEncoder
 */

/**
 * @param {HTMLCanvasElement} canvas
 */
function recordGif(canvas) {
  let isDone = false;
  const result = new Promise((resolve) => {
    const gif = new GIF({
      workers: 2,
      quality: 10,
      verbose: true,
      workerScript,
    });

    function rAF() {
      gif.addFrame(window.ctx, { copy: true });
      if (isDone) {
        gif.on("finished", function (blob) {
          resolve(blob);
          window.open(URL.createObjectURL(blob));
        });
        gif.render();
      } else {
        requestAnimationFrame(rAF);
      }
    }
    requestAnimationFrame(rAF);
  });

  return () => {
    isDone = true;
    return result;
  };
}

async function checkForGifWorker() {
  const response = await fetch(workerScript);
  if (!response.ok) {
    console.error(
      `Could not find the gif worker script: ${workerScript}`,
      response
    );
  }
}
