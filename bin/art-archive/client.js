// @ts-check

/* eslint-disable @typescript-eslint/explicit-function-return-type */ // This appears to be broken
/* eslint-disable no-console */

let apiUrl = "http://localhost:" + 55123;

console.log("bin/art-archive/client.js");
export function addKeyboardShortcuts() {
  console.log(
    [
      "[art-archive] Shortcuts:",
      "  ⌘+s: save the current image to art archive",
      "  ⌘+d: save the current image with a name",
    ].join("\n")
  );

  document.addEventListener(
    "keydown",
    event => {
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
      console.log({ key });
      let foundKey = true;
      switch (key) {
        case "cmd-d":
        case "ctr-d": {
          postCanvas({ requestName: true });
          break;
        }
        case "cmd-s":
        case "ctr-s": {
          postCanvas();
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

/**
 * @param {{ requestName?: boolean }} [options]
 * @returns {Promise<void>}
 */
export async function postCanvas(options = {}) {
  const canvases = document.querySelectorAll("canvas");
  if (canvases.length !== 1) {
    throw new Error(
      "[art-archive] More than one canvas was found when saving."
    );
  }
  const [canvas] = canvases;

  // WebGL clears the canvas, so this needs to happen during a rAF.
  await new Promise(resolve => {
    requestAnimationFrame(resolve);
  });

  const blob = await new Promise(resolve => {
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

  /** @type {any} */
  const response = await postRequest("/publish-code", formData);
  console.log(response);
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
