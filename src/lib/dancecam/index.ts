/* eslint-disable no-alert */
import { Dance } from "./messages";
import { addCSS, ensureExists } from "lib/utils";

const DB_NAME = "dancecam";
const DB_VERSION = 1;
const LIVE_CAMERA = "Live Camera";

interface DanceRow {
  name: string;
  dance: Dance;
  timestamp: number;
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
