/* eslint-disable no-alert */
import { GUI, GUIController } from "dat.gui";
import { Dance, Pose } from "./messages";

const DB_NAME = "dancecam";
const DB_VERSION = 1;

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

  async addDance(name: string, poses: Array<Pose>): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction("dances", "readwrite");
      const store = transaction.objectStore("dances");

      const request = store.put({ name, poses });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDance(name: string): Promise<Array<Pose> | undefined> {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction("dances", "readonly");
      const store = transaction.objectStore("dances");

      const request = store.get(name);
      request.onsuccess = () => resolve(request.result?.poses);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDance(name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction("dances", "readwrite");
      const store = transaction.objectStore("dances");

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
      console.error(`Pose with name "${name}" not found.`);
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
    const dances: Record<string, Array<Pose>> = {};

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

export class DanceCamGUI {
  #gui: GUI;
  #danceDB: DanceDatabase;
  #danceNames: string[] = [];
  selectedDance = "Live Camera";
  isRecording = false;
  danceFolder: GUI;
  danceDropdown: GUIController;
  recordButton: GUIController;

  // These are meant to be overridden.
  onStartRecording: () => void;
  onStopRecording: () => Dance;

  static async create(gui: GUI, danceDB: DanceDatabase) {
    const danceNames = await danceDB.listDances();
    return new DanceCamGUI(gui, danceDB, danceNames);
  }

  constructor(gui: GUI, danceDB: DanceDatabase, danceNames: string[]) {
    this.#gui = gui;
    this.#danceDB = danceDB;
    this.#danceNames = danceNames;
    this.onStartRecording = () => {};
    this.onStopRecording = () => [];

    this.danceFolder = this.#gui.addFolder("Dances");
    this.danceDropdown = this.danceFolder
      .add(this, "selectedDance", this.#danceNames)
      .name("Saved Dances");

    this.recordButton = this.danceFolder
      .add(this, "toggleRecording")
      .name("Record Dance");

    this.danceFolder.add(this, "deleteDance").name("Delete Dance");
    this.danceFolder.add(this, "downloadDance").name("Download Dance");

    this.refreshDances();
  }

  toggleRecording() {
    if (this.isRecording) {
      // Stop recording
      this.isRecording = false;
      this.recordButton.name("Record Dance");
      const dance = this.onStopRecording();
      const danceName = prompt("Enter a name for the new dance:") || "untitled";
      this.#danceDB.addDance(danceName, dance);
      this.refreshDances();
    } else {
      // Start recording
      this.isRecording = true;
      this.recordButton.name("Save Dance");
      this.onStartRecording();
    }
  }

  async deleteDance() {
    if (this.selectedDance) {
      await this.#danceDB.deleteDance(this.selectedDance);
      this.refreshDances();
    }
  }

  async downloadDance() {
    if (this.selectedDance) {
      await this.#danceDB.downloadDance(this.selectedDance);
    }
  }

  async refreshDances() {
    this.#danceNames = await this.#danceDB.listDances();
    this.danceDropdown.options(["Live Camera", ...this.#danceNames]);
    this.danceDropdown.setValue(this.selectedDance);
    this.danceDropdown.updateDisplay();
  }
}
