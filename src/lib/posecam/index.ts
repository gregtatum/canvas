/* eslint-disable no-alert */
import { vec2, vec3 } from "lib/vec-math";
import { Dance, Pose } from "./messages";
import type {
  AudioRecord,
  DanceRecord,
  DatabaseStores,
  Timeline,
  TimelineRecord,
} from "lib/timeline/types";
import { addCSS, ensureExists } from "lib/utils";

const DB_NAME = "dancecam";
const DB_VERSION = 7;
const LIVE_CAMERA = "Live Camera";

// prettier-ignore
const landmarksList = [
  "nose",
  "right eye inner",     "right eye center", "right eye outer",
  "left eye inner",      "left eye center",  "left eye outer",
  "right ear",           "left ear",
  "right mouth corner",  "left mouth corner",
  "right shoulder",      "left shoulder",
  "right elbow",         "left elbow",
  "right wrist",         "left wrist",
  "right pinky knuckle", "left pinky knuckle",
  "right index knuckle", "left index knuckle",
  "right thumb knuckle", "left thumb knuckle",
  "right hip",           "left hip",
  "right knee",          "left knee",
  "right ankle",         "left ankle",
  "right heel",          "left heel",
  "right foot index",    "left foot index",
] as const

export type LandmarkNames = typeof landmarksList[number];

export const landmarks: Record<string, number> = {};
for (let i = 0; i < landmarksList.length; i++) {
  landmarks[landmarksList[i]] = i;
}

/**
 * Store poses in an IndexedDB.
 */
export class DanceDatabase {
  #db: IDBDatabase;

  /**
   * Prefer DanceDatabase.create()
   */
  constructor(db: IDBDatabase) {
    this.#db = db;
  }

  /**
   * Use the create function rather than the constructor, as it initializes the DB.
   */
  static async create(): Promise<DanceDatabase> {
    return new Promise((resolve, reject) => {
      console.log(`[DanceDatabase] opening db ${DB_NAME} ${DB_VERSION}`);
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains("dances")) {
          db.createObjectStore("dances", { keyPath: "name" });
        }
        if (!db.objectStoreNames.contains("audio")) {
          db.createObjectStore("audio", { keyPath: "hash" });
        }
        if (!db.objectStoreNames.contains("timelines")) {
          db.createObjectStore("timelines", { keyPath: "name" });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(new DanceDatabase(db));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Adds or updates a row to the store as type checked by @see {DatabaseStores}.
   */
  async put<T extends keyof DatabaseStores>(
    storeName: T,
    payload: DatabaseStores[T]
  ): Promise<DatabaseStores[T]> {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      console.log(`[DanceDatabase] add ${storeName}`, payload);
      const request = store.put(payload);
      request.onsuccess = () => resolve(payload);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a row from the store as type checked by @see {DatabaseStores}.
   */
  async get<T extends keyof DatabaseStores>(
    storeName: T,
    query: string
  ): Promise<DatabaseStores[T] | undefined> {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);

      const request: IDBRequest<DatabaseStores[T]> = store.get(query);
      request.onsuccess = () => {
        console.log(`[DanceDatabase] get ${storeName}`, query, request.result);
        resolve(request.result as any);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a row from the store as type checked by @see {DatabaseStores}.
   */
  async delete<T extends keyof DatabaseStores>(
    storeName: T,
    name: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      console.log("[DanceDatabase] delete " + storeName, name);
      const request = store.delete(name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * List all of the keys in the store.
   */
  async list<T extends keyof DatabaseStores>(storeName: T): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  }

  async addDance(name: string, dance: Dance): Promise<DanceRecord> {
    return this.put("dances", { name, dance, timestamp: Date.now() });
  }

  async addAudio(
    name: string,
    hash: string,
    audio: Blob
  ): Promise<AudioRecord> {
    return this.put("audio", { name, hash, audio, timestamp: Date.now() });
  }

  async addTimeline(
    name: string,
    boundsInSeconds: number,
    timeline: Timeline[]
  ): Promise<TimelineRecord> {
    const now = Date.now();
    return this.put("timelines", {
      name,
      created: now,
      lastModified: now,
      duration: boundsInSeconds,
      timeline,
    });
  }

  async saveTimelineRecord(
    timelineRecord: TimelineRecord
  ): Promise<TimelineRecord> {
    timelineRecord.lastModified = Date.now();
    return this.put("timelines", timelineRecord);
  }

  async getDance(name: string): Promise<Dance | undefined> {
    return (await this.get("dances", name))?.dance;
  }

  async getAudioRecord(hash: string): Promise<AudioRecord | undefined> {
    return this.get("audio", hash);
  }

  async getTimeline(name: string): Promise<TimelineRecord | undefined> {
    return this.get("timelines", name);
  }

  async deleteDance(name: string): Promise<void> {
    return this.delete("dances", name);
  }

  async deleteAudio(name: string): Promise<void> {
    return this.delete("audio", name);
  }

  async deleteTimeline(name: string): Promise<void> {
    return this.delete("timelines", name);
  }

  async listDances(): Promise<string[]> {
    return this.list("dances");
  }

  async listAudio(): Promise<string[]> {
    return this.list("audio");
  }

  async listTimelines(): Promise<string[]> {
    return this.list("timelines");
  }

  async downloadDance(name: string): Promise<void> {
    const poses = await this.getDance(name);
    if (!poses) {
      console.error(`Dance with name "${name}" not found.`);
      return;
    }

    const blob = new Blob([JSON.stringify({ name, poses })], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dance-${name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async downloadAllDances(): Promise<void> {
    const poseNames = await this.listDances();
    const dances: Record<string, Dance> = {};

    for (const name of poseNames) {
      const poses = await this.getDance(name);
      if (poses) {
        dances[name] = poses;
      }
    }

    const blob = new Blob([JSON.stringify(dances, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dances.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export class PoseCam {
  #danceDB: DanceDatabase;
  #danceNames: string[] = [];
  mount: HTMLElement;
  selectedDance: string;
  isRecording = false;
  elements: ReturnType<typeof PoseCam.getElements>;

  // These are meant to be overridden.
  onStartRecording: () => void;
  onStopRecording: () => Dance;
  onDiscardRecording: () => void;
  onChangeDance: (dance: Dance | null) => void;

  static async create(
    danceDB: DanceDatabase,
    mount: HTMLElement,
    selectedDance: string = LIVE_CAMERA
  ) {
    const danceNames = await danceDB.listDances();
    return new PoseCam(danceDB, danceNames, mount, selectedDance);
  }

  constructor(
    danceDB: DanceDatabase,
    danceNames: string[],
    mount: HTMLElement,
    selectedDance: string
  ) {
    this.#danceDB = danceDB;
    this.#danceNames = danceNames;
    this.mount = mount;
    this.selectedDance = selectedDance;

    this.onStartRecording = () => {};
    this.onStopRecording = () => [];
    this.onDiscardRecording = () => {};
    this.onChangeDance = () => {};

    const parser = new DOMParser();
    const parsedHTML = parser.parseFromString(
      /* html */ `
      <div id="posecam">
        <div class="posecam-controls">
          <button id="posecam-discard">Discard</button>
          <button id="posecam-save">Save</button>
          <button id="posecam-delete">Delete</button>
          <button id="posecam-download">Download</button>
          <button id="posecam-record">Record</button>
          <select id="posecam-dropdown">
            <option>Live Camera</option>
            <!-- The rest will be added here -->
          </select>
        </div>
      </div>
    `,
      "text/html"
    );

    addCSS(/* css */ `
      #posecam {
        position: absolute;
        bottom: 50px;
        width: 100%;
      }
      .posecam-controls {
        display: flex;
        justify-content: end;
        margin: 5px;
        gap: 5px;
      }
      .hide-ui #posecam {
        display: none;
      }
    `);

    const root = ensureExists(parsedHTML.body.firstElementChild);
    this.mount.appendChild(root);
    this.elements = PoseCam.getElements(root);

    this.addHandlers();
    this.refreshDances(danceNames);
    this.updateVisibility();
  }

  getSelectedDance() {
    if (this.selectedDance === LIVE_CAMERA) {
      return null;
    }
    return this.#danceDB.getDance(this.selectedDance);
  }

  static getElements(root: Element) {
    const getElement = <T extends HTMLElement>(selector: string): T => {
      const element = root.querySelector(selector);
      if (!element) {
        throw new Error(`Could not find element by selector "${selector}"`);
      }
      return element as T;
    };

    return {
      danceDropdown: getElement<HTMLSelectElement>("#posecam-dropdown"),
      recordButton: getElement<HTMLButtonElement>("#posecam-record"),
      saveButton: getElement<HTMLButtonElement>("#posecam-save"),
      discardButton: getElement<HTMLButtonElement>("#posecam-discard"),
      deleteButton: getElement<HTMLButtonElement>("#posecam-delete"),
      downloadButton: getElement<HTMLButtonElement>("#posecam-download"),
    };
  }

  addHandlers() {
    const {
      recordButton,
      danceDropdown,
      saveButton,
      discardButton,
      deleteButton,
      downloadButton,
    } = this.elements;

    danceDropdown.addEventListener("change", this.changeDance);
    recordButton.addEventListener("click", this.startRecording);
    saveButton.addEventListener("click", this.saveRecording);
    discardButton.addEventListener("click", this.discardRecording);
    deleteButton.addEventListener("click", this.deleteDance);
    downloadButton.addEventListener("click", this.downloadDance);
  }

  updateVisibility() {
    const {
      discardButton,
      recordButton,
      danceDropdown,
      deleteButton,
      saveButton,
      downloadButton,
    } = this.elements;

    if (danceDropdown.value === LIVE_CAMERA) {
      hide(deleteButton);
      hide(downloadButton);
      if (this.isRecording) {
        hide(recordButton);
        hide(danceDropdown);
        show(discardButton);
        show(saveButton);
      } else {
        show(recordButton);
        show(danceDropdown);
        hide(discardButton);
        hide(saveButton);
      }
    } else {
      hide(recordButton);
      hide(saveButton);
      hide(discardButton);
      show(deleteButton);
      show(downloadButton);
    }
  }

  startRecording = () => {
    console.log("Start recording");
    // Start recording
    this.isRecording = true;
    this.updateVisibility();
    this.onStartRecording();
  };

  saveRecording = async () => {
    // Stop recording
    this.isRecording = false;
    this.updateVisibility();
    const dance = this.onStopRecording();
    if (dance.length) {
      const danceName = prompt("Enter a name for the new dance:") || "untitled";
      await this.#danceDB.addDance(danceName, dance);
      this.refreshDances(await this.#danceDB.listDances());
      this.elements.danceDropdown.value = danceName;
      this.selectedDance = danceName;
      this.elements.danceDropdown.value = danceName;
      this.changeDance();
      console.log("[posecam] saved", danceName, dance);
    } else {
      this.onDiscardRecording();
    }
  };

  discardRecording = () => {
    this.isRecording = false;
    this.updateVisibility();
    this.onDiscardRecording();
  };

  changeDance = async () => {
    const { danceDropdown } = this.elements;
    this.updateVisibility();
    this.selectedDance = danceDropdown.value;

    if (!this.selectedDance || this.selectedDance === LIVE_CAMERA) {
      this.onChangeDance(null);
    } else {
      const dance = await this.#danceDB.getDance(this.selectedDance);
      if (dance) {
        this.onChangeDance(dance);
      }
    }
  };

  deleteDance = async () => {
    if (!confirm(`Are you sure you want to delete "${this.selectedDance}"?`)) {
      return;
    }
    const { danceDropdown } = this.elements;
    if (this.selectedDance) {
      const danceName = this.selectedDance;

      danceDropdown.selectedIndex += 1;
      this.selectedDance = danceDropdown.value;
      if (!danceDropdown.value) {
        this.selectedDance = LIVE_CAMERA;
        danceDropdown.value = LIVE_CAMERA;
      }
      this.changeDance();

      await this.#danceDB.deleteDance(danceName);
      console.log("[posecam] deleted", danceName);
      this.refreshDances(await this.#danceDB.listDances());
    }
  };

  downloadDance = async () => {
    if (this.selectedDance) {
      await this.#danceDB.downloadDance(this.selectedDance);
    }
  };

  refreshDances(danceNames: string[]) {
    this.#danceNames = danceNames;
    const { danceDropdown } = this.elements;
    const previousValue = this.selectedDance;
    while (danceDropdown.children.length > 1) {
      danceDropdown.lastChild!.remove();
    }
    for (const name of this.#danceNames) {
      const option = document.createElement("option");
      option.innerText = name;
      danceDropdown.appendChild(option);
    }
    danceDropdown.value = previousValue;
    if (!danceDropdown.value) {
      this.selectedDance = LIVE_CAMERA;
      this.changeDance();
    }
  }
}

function hide(element: HTMLElement) {
  element.style.display = "none";
}

function show(element: HTMLElement) {
  element.style.display = "block";
}

const _calculateAngle_v1 = vec3.create();
const _calculateAngle_v2 = vec3.create();

/**
 * Calculate the angle between the vectors formed by three 3D points.
 */
function calculateAngle(a: Tuple3, b: Tuple3, c: Tuple3): Radian {
  const v1 = _calculateAngle_v1;
  const v2 = _calculateAngle_v2;

  // Compute vectors from B to A and B to C
  vec3.subtract(v1, a, b);
  vec3.subtract(v2, c, b);

  // Compute the dot product.
  vec3.normalize(v1, v1);
  vec3.normalize(v2, v2);
  const dot = vec3.dot(v1, v2);

  // Clamp the dot product to the range [-1, 1] to avoid NaN due to precision errors
  const clampedDot = Math.max(-1, Math.min(1, dot));

  // Calculate the angle in radians.
  return Math.acos(clampedDot);
}

const _calculateAngleV2_v1 = vec2.create();
const _calculateAngleV2_v2 = vec2.create();

/**
 * Calculate the angle between the vectors formed by three 3D points.
 */
function calculateAngleV2(a3: Tuple3, b3: Tuple3, c3: Tuple3): Radian {
  const a = a3 as any as Tuple2;
  const b = b3 as any as Tuple2;
  const c = c3 as any as Tuple2;
  const v1 = _calculateAngleV2_v1;
  const v2 = _calculateAngleV2_v2;

  // Compute vectors from B to A and B to C
  vec2.subtract(v1, a, b);
  vec2.subtract(v2, c, b);

  // Compute the dot product.
  vec2.normalize(v1, v1);
  vec2.normalize(v2, v2);
  const dot = vec2.dot(v1, v2);

  // Clamp the dot product to the range [-1, 1] to avoid NaN due to precision errors
  const clampedDot = Math.max(-1, Math.min(1, dot));

  // Calculate the angle in radians.
  return Math.acos(clampedDot);
}

const _projPtVec1 = vec3.create();
const _projPtVec2 = vec3.create();

function projectPointOntoPlane(
  out: Tuple3,
  point: Tuple3,
  planeNormal: Tuple3,
  planePoint: Tuple3
) {
  // Compute the vector from the point on the plane to the point to be projected
  const pointToPlane = vec3.sub(_projPtVec1, point, planePoint);

  // Compute the distance from the point to the plane
  const distance = vec3.dot(pointToPlane, planeNormal);

  // Compute the projection of the point onto the plane
  return vec3.sub(out, point, vec3.scale(_projPtVec2, planeNormal, distance));
}

const _midShoulder = vec3.create();

export class PoseAnalysis {
  pose: Pose = [];

  upperArmAngleLeft = 0;
  upperArmAngleRight = 0;
  forearmAngleLeft = 0;
  forearmAngleRight = 0;
  elbowForwardBackLeft = 0;
  elbowForwardBackRight = 0;

  getLandmark(name: LandmarkNames) {
    return this.pose[landmarks[name]];
  }

  /**
   * Coerce a Landmark into a Tuple3. Mildly incorrect, but probably safe for
   * immutable operations.
   */
  getTuple3(name: LandmarkNames) {
    return this.pose[landmarks[name]] as any as Tuple3;
  }

  getMidShoulder() {
    const midShoulder = vec3.add(
      _midShoulder,
      this.getTuple3("right shoulder"),
      this.getTuple3("left shoulder")
    );
    vec3.scale(midShoulder, midShoulder, 0.5);
    return midShoulder;
  }

  update(pose: Pose) {
    this.pose = pose;
    this.upperArmAngleLeft = calculateAngleV2(
      this.getTuple3("left hip"),
      this.getTuple3("left shoulder"),
      this.getTuple3("left elbow")
    );
    this.upperArmAngleRight = calculateAngleV2(
      this.getTuple3("right hip"),
      this.getTuple3("right shoulder"),
      this.getTuple3("right elbow")
    );
    this.forearmAngleLeft = calculateAngleV2(
      this.getTuple3("left shoulder"),
      this.getTuple3("left elbow"),
      this.getTuple3("left wrist")
    );
    this.forearmAngleRight = calculateAngleV2(
      this.getTuple3("right shoulder"),
      this.getTuple3("right elbow"),
      this.getTuple3("right wrist")
    );

    const midShoulder = this.getMidShoulder();

    this.elbowForwardBackLeft = getConstrainedAngle(
      midShoulder,
      this.getTuple3("left shoulder"),
      this.getTuple3("left hip"),
      this.getTuple3("left elbow")
    );

    this.elbowForwardBackRight = getConstrainedAngle(
      midShoulder,
      this.getTuple3("right shoulder"),
      this.getTuple3("right hip"),
      this.getTuple3("right elbow")
    );
  }
}

const _constrVec1 = vec3.create();
const _constrVec2 = vec3.create();

function getConstrainedAngle(
  basePoint: Tuple3,
  tipPoint: Tuple3,
  planeReference: Tuple3,
  pointToProject: Tuple3
): Radian {
  const planeNormal = getPlaneNormalAtTip(
    _constrVec1,
    tipPoint,
    planeReference
  );
  const projectedElbow = projectPointOntoPlane(
    _constrVec2,
    pointToProject,
    planeNormal,
    tipPoint
  );
  return calculateAngle(basePoint, tipPoint, projectedElbow);
}

function getPlaneNormalAtTip(out: Tuple3, base: Tuple3, tip: Tuple3): Tuple3 {
  vec3.subtract(out, tip, base);
  vec3.normalize(out, out);
  return out;
}

/**
 * Linearly interpolate to find a point along a path.
 */
export class LerpOnPath {
  // This value is cached between calls, so it leaks memory based on the size of the
  // path, which is fine since we want to avoid the GC of creating new arrays.
  #distances: number[] = [];
  #totalDistance = 0;
  #path: Tuple3[] = [];
  #result: Tuple3 = [0, 0, 0];

  setPath(path: Tuple3[]) {
    this.#path = path;

    // Compute distances between consecutive points
    this.#totalDistance = 0;
    for (let i = 1; i < path.length; i++) {
      const distance = vec3.distance(path[i - 1], path[i]);
      this.#distances[i - 1] = distance;
      this.#totalDistance += distance;
    }
  }

  getValue(t: number, out: Tuple3 = this.#result): Tuple3 {
    if (this.#path.length === 0) {
      return vec3.set(out, 0, 0, 0);
    }

    if (this.#path.length === 1) {
      return vec3.copy(out, this.#path[0]);
    }

    const distances = this.#distances;

    // Handle t being out of the bounds [0, 1]
    if (t < 0) {
      // Extend behind first point.
      const segmentT = (t * distances[0]) / this.#totalDistance;
      return vec3.lerp(out, this.#path[0], this.#path[1], segmentT);
    }

    if (t > 1) {
      // Extend beyond last point.
      const segmentT =
        ((t - 1) * distances[distances.length - 1]) / this.#totalDistance;
      return vec3.lerp(
        out,
        this.#path[this.#path.length - 2],
        this.#path[this.#path.length - 1],
        1 + segmentT
      );
    }
    const path = this.#path;
    const targetDistance = t * this.#totalDistance;

    // Locate the segment where the target distance falls
    let accumulatedDistance = 0;
    for (let i = 1; i < path.length; i++) {
      const nextAccumulatedDistance = accumulatedDistance + distances[i - 1];

      if (targetDistance <= nextAccumulatedDistance) {
        // Compute local t within the segment
        const segmentT =
          (targetDistance - accumulatedDistance) / distances[i - 1];

        return vec3.lerp(out, path[i - 1], path[i], segmentT);
      }

      accumulatedDistance = nextAccumulatedDistance;
    }

    return path[path.length - 1];
  }
}

/**
 * Smoothly interpolate to find a point along a path using a 4-point cubic Bézier curve.
 */
export class BezierOnPath {
  // This value is cached between calls, so it leaks memory based on the size of the
  // path, which is fine since we want to avoid the GC of creating new arrays.
  distances: number[] = [];
  totalDistance = 0;
  path: Tuple3[] = [];
  result: Tuple3 = [0, 0, 0];
  controlPointsStart: Tuple3[] = [];
  controlPointsEnd: Tuple3[] = [];

  setPath(path: Tuple3[], smoothingFactor = 0.3) {
    this.path = path;
    if (path.length < 2) {
      // This path is to small to compute a Bezier curve.
    }

    // Compute distances between consecutive points.
    this.totalDistance = 0;
    for (let i = 1; i < path.length; i++) {
      const distance = vec3.distance(path[i - 1], path[i]);
      this.distances[i - 1] = distance;
      this.totalDistance += distance;
    }

    /**
     * Compute the control points, two for each point.
     *
     * For a drawing of these steps:
     * @see {@link file://./beziercurve.png}
     *
     * For an interactive example of bezier curves:
     * @see {@link https://www.desmos.com/calculator/ebdtbxgbq0}
     */
    for (let pointIndex = 0; pointIndex < path.length; pointIndex++) {
      const prevPoint = path[pointIndex - 1];
      const currPoint = path[pointIndex];
      const nextPoint = path[pointIndex + 1];

      if (!prevPoint || !nextPoint) {
        this.controlPointsStart[pointIndex] = vec3.clone(currPoint);
        this.controlPointsEnd[pointIndex] = vec3.clone(currPoint);
        continue;
      }
      const prevUnit = vec3.create();
      const nextUnit = vec3.create();

      vec3.sub(prevUnit, prevPoint, currPoint);
      vec3.sub(nextUnit, nextPoint, currPoint);
      vec3.normalize(prevUnit, prevUnit);
      vec3.normalize(nextUnit, nextUnit);

      const controlPointStart = vec3.create();
      vec3.sub(controlPointStart, nextUnit, prevUnit);
      vec3.normalize(controlPointStart, controlPointStart);
      vec3.scaleAndAdd(
        controlPointStart,
        currPoint,
        controlPointStart,
        this.distances[pointIndex] * smoothingFactor
      );
      this.controlPointsStart[pointIndex] = controlPointStart;

      const controlPointEnd = vec3.create();
      vec3.sub(controlPointEnd, prevUnit, nextUnit); // Opposite flip.
      vec3.normalize(controlPointEnd, controlPointEnd);
      vec3.scaleAndAdd(
        controlPointEnd,
        currPoint,
        controlPointEnd,
        this.distances[pointIndex - 1] * smoothingFactor
      );
      this.controlPointsEnd[pointIndex] = controlPointEnd;
    }
  }

  /**
   * Get a point along the curve.
   */
  getValue(t: number, out: Tuple3 = this.result): Tuple3 {
    if (this.path.length === 0) {
      return vec3.set(out, 0, 0, 0);
    }

    if (this.path.length === 1) {
      return vec3.copy(out, this.path[0]);
    }

    const path = this.path;
    const targetDistance = t * this.totalDistance;

    // Locate the segment where the target distance falls
    let accumulatedDistance = 0;
    const segmentCount = path.length - 1;
    for (
      let segmentIndex = 0;
      segmentIndex < segmentCount - 1;
      segmentIndex++
    ) {
      const pointAIndex = segmentIndex;
      const pointBIndex = segmentIndex + 1;

      const segmentDistance = this.distances[segmentIndex];
      const nextAccumulatedDistance = accumulatedDistance + segmentDistance;

      if (targetDistance <= nextAccumulatedDistance) {
        // Compute local t within the segment
        const segmentT =
          (targetDistance - accumulatedDistance) / segmentDistance;

        // Get Bézier control points for this segment
        // https://www.desmos.com/calculator/ebdtbxgbq0
        const cpA = this.controlPointsStart[pointAIndex]; // Control point or previous point.
        const pA = this.path[pointAIndex]; // First point of the segment.
        const pB = this.path[pointBIndex]; // Second point of the segment.
        const cpB = this.controlPointsEnd[pointBIndex]; // Control point or next point.

        return this.#computeCubicBezier(out, cpA, pA, pB, cpB, segmentT);
      }
      accumulatedDistance = nextAccumulatedDistance;
    }

    // This is beyond the range.
    return vec3.copy(out, path[path.length - 1]);
  }

  /**
   * Computes a point on a cubic Bézier curve given two anchor points and two control points.
   */
  #computeCubicBezier(
    out: Tuple3,
    cpA: Tuple3,
    pA: Tuple3,
    ppB: Tuple3,
    cpB: Tuple3,
    t: number
  ): Tuple3 {
    const u = 1 - t;
    const u2 = u * u;
    const u3 = u2 * u;
    const t2 = t * t;
    const t3 = t2 * t;

    // Bézier curve equation
    out[0] =
      u3 * pA[0] + 3 * u2 * t * cpA[0] + 3 * u * t2 * cpB[0] + t3 * ppB[0];
    out[1] =
      u3 * pA[1] + 3 * u2 * t * cpA[1] + 3 * u * t2 * cpB[1] + t3 * ppB[1];
    out[2] =
      u3 * pA[2] + 3 * u2 * t * cpA[2] + 3 * u * t2 * cpB[2] + t3 * ppB[2];

    return out;
  }
}
