/* eslint-disable no-alert */
import { vec2, vec3 } from "lib/vec-math";
import { Dance, Pose } from "./messages";
import { addCSS, ensureExists } from "lib/utils";

const DB_NAME = "dancecam";
const DB_VERSION = 1;
const LIVE_CAMERA = "Live Camera";

interface DanceRow {
  name: string;
  dance: Dance;
  timestamp: number;
}

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
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("dances")) {
          db.createObjectStore("dances", { keyPath: "name" });
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

  async addDance(name: string, dance: Dance): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction("dances", "readwrite");
      const store = transaction.objectStore("dances");
      console.log("[DanceDatabase] add dance", name, dance);
      const danceRow: DanceRow = { name, dance, timestamp: Date.now() };
      const request = store.put(danceRow);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDance(name: string): Promise<Dance | undefined> {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction("dances", "readonly");
      const store = transaction.objectStore("dances");

      const request: IDBRequest<DanceRow> = store.get(name);
      request.onsuccess = () => {
        const { dance } = request.result;
        console.log("[DanceDatabase] get dance", name, dance);
        resolve(dance);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDance(name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction("dances", "readwrite");
      const store = transaction.objectStore("dances");

      console.log("[DanceDatabase] delete dance", name);
      const request = store.delete(name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async listDances(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction("dances", "readonly");
      const store = transaction.objectStore("dances");

      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
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

export class DanceCam {
  #danceDB: DanceDatabase;
  #danceNames: string[] = [];
  mount: HTMLElement;
  selectedDance: string;
  isRecording = false;
  elements: ReturnType<typeof DanceCam.getElements>;

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
    return new DanceCam(danceDB, danceNames, mount, selectedDance);
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
      <div id="dancecam">
        <div class="dancecam-controls">
          <button id="dancecam-discard">Discard</button>
          <button id="dancecam-save">Save</button>
          <button id="dancecam-delete">Delete</button>
          <button id="dancecam-download">Download</button>
          <button id="dancecam-record">Record</button>
          <select id="dancecam-dropdown">
            <option>Live Camera</option>
            <!-- The rest will be added here -->
          </select>
        </div>
      </div>
    `,
      "text/html"
    );

    addCSS(/* css */ `
      #dancecam {
        position: absolute;
        bottom: 0;
        width: 100%;
      }
      .dancecam-controls {
        display: flex;
        justify-content: end;
        margin: 5px;
        gap: 5px;
      }
      .hide-ui #dancecam {
        display: none;
      }
    `);

    const root = ensureExists(parsedHTML.body.firstElementChild);
    this.mount.appendChild(root);
    this.elements = DanceCam.getElements(root);

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
      danceDropdown: getElement<HTMLSelectElement>("#dancecam-dropdown"),
      recordButton: getElement<HTMLButtonElement>("#dancecam-record"),
      saveButton: getElement<HTMLButtonElement>("#dancecam-save"),
      discardButton: getElement<HTMLButtonElement>("#dancecam-discard"),
      deleteButton: getElement<HTMLButtonElement>("#dancecam-delete"),
      downloadButton: getElement<HTMLButtonElement>("#dancecam-download"),
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

    console.log(`!!! danceDropdown.value`, danceDropdown.value);
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
      console.log("[DanceCam] saved", danceName, dance);
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
      console.log("[DanceCam] deleted", danceName);
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
