/**
 * Allow exhaustive checking of case statements, by throwing an UnhandledCaseError
 * in the default branch.
 */
export class UnhandledCaseError extends Error {
  constructor(value: never, typeName: string) {
    super(`There was an unhandled case for "${typeName}": ${value}`);
    this.name = "UnhandledCaseError";
  }
}

/**
 * Ensure some T exists when the type systems knows it can be null or undefined.
 */
export function ensureExists<T>(
  item: T | null | undefined,
  message = "The item did not exist when it was supposed to."
): T {
  if (item === null) {
    throw new Error(message);
  }
  if (item === undefined) {
    throw new Error(message);
  }
  return item;
}

/**
 * Fill an array with values.
 */
export function fill<T>(size: number, fn: (i: number) => T): Array<T> {
  const array = Array(size);
  for (let i = 0; i < size; i++) {
    array[i] = fn(i);
  }
  return array;
}

/**
 * Get a number in terms of Radians.
 */
export function rad(n: number) {
  return n * Math.PI;
}

export function addCSS(text: string): void {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = text;
  document.head.appendChild(styleSheet);
}

export function exposeAsGlobal(name: string, value: any) {
  (window as any)[name] = value;
  console.log(name, value);
}

/**
 * Constrain a number to be within a range of [min, max].
 */
export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Provide a simple way to append all of the childen of some HTML text.
 *
 * Returns a getter function for elements in the wrapper.
 */
export function appendHTML(container: Element, html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  for (const node of doc.body.childNodes) {
    container.appendChild(node);
  }
  return <T extends Element>(querySelector: string): T =>
    ensureExists(
      container.querySelector<T>(querySelector),
      `Could not find "${querySelector}"`
    );
}

/**
 * Provide a simple way to append all of the childen of some HTML text.
 *
 * Returns a getter function for elements in the wrapper.
 */
export function createHTML(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const container = doc.body.firstElementChild as HTMLElement | null;
  if (doc.body.children.length > 1) {
    throw new Error("Expected only 1 root element.");
  }
  if (!container) {
    throw new Error("Could not find an html element");
  }
  return {
    container,
    get: <T extends Element>(querySelector: string): T =>
      ensureExists(
        container.querySelector<T>(querySelector),
        `Could not find "${querySelector}"`
      ),
  };
}

/**
 * Debounce a function.
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

export class LocationManager {
  static getString(key: string, defaultValue?: string) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(key) ?? defaultValue;
  }

  static getNumber(key: string, defaultValue = 0) {
    const urlParams = new URLSearchParams(window.location.search);
    const storedValue = urlParams.get(key);
    if (storedValue === null) {
      return defaultValue;
    }
    const number = Number(storedValue);
    if (Number.isNaN(number)) {
      return defaultValue;
    }
    return number;
  }

  static getBoolean(key: string, defaultValue = false) {
    const urlParams = new URLSearchParams(window.location.search);
    const storedValue = urlParams.get(key);
    if (storedValue === null) {
      return defaultValue;
    }
    return storedValue === "true";
  }

  /**
   * Updates a number with a given precision.
   */
  static updateNumber(key: string, value: number, precision = 4) {
    const divisor = Math.pow(10, precision);
    LocationManager.updateValue(
      key,
      String(Math.floor(value * divisor) / divisor)
    );
  }

  static updateValue = debounce((key: string, value: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set(key, value);
    const url = new URL(window.location.href);
    const newLocation = `${url.origin}${url.pathname}?${urlParams}`;
    history.replaceState(null, "", newLocation);
  }, 500);

  static deleteValue = debounce((key: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete(key);
    const url = new URL(window.location.href);
    const newLocation = `${url.origin}${url.pathname}?${urlParams}`;
    history.replaceState(null, "", newLocation);
  }, 500);
}

/**
 * Use lookup functions to determine if a reactive update is needed.
 */
export function reactiveInvalidator(
  invalidations: Array<() => unknown>
): () => boolean {
  const prev: unknown[] = [];
  return () => {
    let isInvalidated = false;
    for (let i = 0; i < invalidations.length; i++) {
      const next = invalidations[i]();
      if (next !== prev[i]) {
        isInvalidated = true;
      }
      prev[i] = next;
    }
    return isInvalidated;
  };
}

export function addStylesheet(
  path: string,
  root: HTMLHeadElement | ShadowRoot = document.head
): Promise<void> {
  const normalizedPath = new URL(path, document.baseURI).href;

  // Check if stylesheet is already present in this root.
  for (const linkElement of root.querySelectorAll('link[rel="stylesheet"]')) {
    const linkHref = (linkElement as HTMLLinkElement).href;
    const normalizedLinkHref = new URL(linkHref, document.baseURI).href;
    if (normalizedLinkHref === normalizedPath) {
      // The stylesheet already exists.
      return Promise.resolve();
    }
  }

  // Add new stylesheet
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = path;
  root.appendChild(link);

  return new Promise((resolve, reject) => {
    link.addEventListener("load", () => {
      resolve();
    });
    link.addEventListener("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Helper function to convert a potential null Promise value into a Promise rejection.
 */
export function ensureNonNull<T>(
  promise: Promise<T | null | undefined>
): Promise<T> {
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
