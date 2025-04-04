import { type DanceDatabase } from "lib/posecam";
import type { TimelineRecord } from "lib/timeline/types";
import { addStylesheet, createHTML, LocationManager } from "lib/utils";
import { TimelineView } from "lib/timeline/components/TimelineView";

const COMPONENT_NAME = "timeline-manager";

/**
 * Manages adding and removing timelines
 */
export class TimelineManager extends HTMLElement {
  elements: ReturnType<typeof TimelineManager.createElements>;
  timelineName?: string = LocationManager.getString("timelineName");
  timelineRecord?: TimelineRecord;
  timelineView?: TimelineView;
  #shadowRoot: ShadowRoot;
  cssLoaded = false;

  // You can't use web components constructors, but the DanceDatabase must be defined
  // before creating one. Use the TimelineManager.create method to create an instance.
  #db?: DanceDatabase;

  get db() {
    if (!this.#db) {
      throw new Error(
        "The TimelineManager.create method must be used to construct a TimelineManager."
      );
    }
    return this.#db;
  }
  set db(db: DanceDatabase) {
    this.#db = db;
  }

  /**
   * The main entry into creating
   */
  static create(db: DanceDatabase): TimelineManager {
    const timelineManager: TimelineManager = document.createElement(
      "timeline-manager"
    ) as any;
    timelineManager.db = db;

    // List the timelines.
    db.listTimelines().then((timelines) =>
      timelineManager.updateTimelinesView(timelines)
    );
    timelineManager.reactive();

    return timelineManager;
  }

  constructor() {
    super();

    this.elements = TimelineManager.createElements();
    this.#shadowRoot = this.attachShadow({ mode: "open" });
    addStylesheet("../html/timeline.css", this.#shadowRoot).then(() => {
      this.setupHandlers();
      this.#shadowRoot.appendChild(this.elements.container);
      this.cssLoaded = true;
      this.reactive();
    });
  }

  static createElements() {
    const { container, get } = createHTML(/* html */ `
      <div class="manager">
        <div class="manager-start">
          <label for="manager-dropdown">Timelines</label>
          <select id="manager-dropdown">
            <option value="">Select a timeline</option>
          </select>
        </div>
        <div class="manager-end">
          <input type="text" placeholder="timeline name" />
          <button type="button">add timeline</button>
        </div>
      </div>
    `);

    return {
      container,
      select: get<HTMLSelectElement>("select"),
      input: get<HTMLInputElement>("input[type=text]"),
      button: get<HTMLInputElement>("button"),
    };
  }

  static get observedAttributes() {
    // The observed attributes for the web component.
    return [];
  }

  attributeChangedCallback(
    _name: string,
    _oldValue: unknown,
    _newValue: unknown
  ) {
    // When an attribute changes.
  }

  connectedCallback() {
    // The component was added to the DOM.
    if (!this.db) {
      throw new Error(
        "TimelineManager was not created through TimelineManager.create."
      );
    }
  }

  disconnectedCallback() {
    // The component was removed from the DOM.
  }

  reactive() {
    if (!this.cssLoaded) {
      return;
    }
    const { select, container } = this.elements;
    select.disabled = select.childElementCount === 1;

    container.style.display = this.timelineRecord ? "none" : "flex";

    if (this.timelineRecord && this.timelineName) {
      // A timeline is loaded.
      if (
        this.timelineView &&
        this.timelineView.timelineName !== this.timelineName
      ) {
        // The timeline changed.
        this.timelineView.destroy();
        delete this.timelineView;
      }
      if (!this.timelineView) {
        // The timeline needs to be created.
        this.timelineView = new TimelineView(
          this.db,
          this.timelineName,
          this.timelineRecord,
          this.closeTimeline,
          this.#shadowRoot
        );
      }
    } else if (this.timelineView) {
      // There is no timeline loaded, but the view is still initialized.
      this.timelineView.destroy();
      delete this.timelineView;
    }

    if (this.elements.select.value !== this.timelineName) {
      this.elements.select.value = this.timelineName ?? "";
    }
  }

  closeTimeline = () => {
    delete this.timelineName;
    delete this.timelineRecord;
    LocationManager.deleteValue("timelineName");
    this.reactive();
  };

  setupHandlers() {
    const { select, input, button } = this.elements;

    input.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        this.addTimeline(input.value);
      }
    });

    button.addEventListener("click", () => {
      this.addTimeline(input.value);
    });

    select.addEventListener("change", () => {
      this.timelineName = select.value || undefined;

      if (this.timelineName) {
        LocationManager.updateValue("timelineName", this.timelineName);
        this.loadTimeline(this.timelineName);
      } else {
        delete this.timelineRecord;
        delete this.timelineName;
      }
      this.reactive();
    });

    document.body.addEventListener("keydown", (event) => {
      if (
        event.key === "s" &&
        (event.metaKey || event.ctrlKey) &&
        this.timelineRecord
      ) {
        event.preventDefault();
        this.db.saveTimelineRecord(this.timelineRecord);
      }
    });
  }

  loadTimeline(timelineName: string) {
    this.db.getTimeline(timelineName).then(
      (timelineRecord) => {
        if (timelineRecord) {
          this.timelineRecord = timelineRecord;
        } else {
          alert("Could not find the timeline");
        }
        this.reactive();
      },
      (error) => {
        console.error(error);
        alert("There was an error loading the timeline");
        this.reactive();
      }
    );
  }

  async addTimeline(name: string) {
    if (!name) {
      return;
    }
    try {
      const timelines = await this.db.listTimelines();

      if (timelines.includes(name)) {
        alert("That timeline already exists, please choose a new name.");
        return;
      }
      const threeMinutes = 3 * 60;
      this.timelineRecord = await this.db.addTimeline(name, threeMinutes, []);
      this.reactive();
    } catch (error) {
      console.error(error);
      alert("There was an error creating the timeline");
      this.reactive();
    }
  }

  updateTimelinesView(timelines: string[]) {
    const { select } = this.elements;

    while (select.childElementCount > 1) {
      select.lastElementChild?.remove();
    }
    let timelineName;
    for (const timeline of timelines) {
      const option = document.createElement("option");
      option.value = timeline;
      option.innerText = timeline;
      if (timeline === this.timelineName) {
        option.selected = true;
        timelineName = timeline;
      }
      select.appendChild(option);
    }

    if (timelineName) {
      this.loadTimeline(timelineName);
    } else {
      delete this.timelineName;
    }
    this.reactive();
  }

  update() {
    this.timelineView?.update();
  }

  draw() {
    this.timelineView?.draw();
  }
}

customElements.define(COMPONENT_NAME, TimelineManager);
