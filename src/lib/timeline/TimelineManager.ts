import { type DanceDatabase } from "lib/posecam";
import type { TimelineRecord } from "./timeline.d.ts";
import { addCSS, createHTML, LocationManager } from "lib/utils";
import { TimelineView } from "./TimelineView";

/**
 * Manages adding and removing timelines
 */
export class TimelineManager {
  elements: ReturnType<typeof TimelineManager.createElements>;
  db: DanceDatabase;
  timelineName?: string = LocationManager.getString("timelineName");
  timelineRecord?: TimelineRecord;
  timelineView?: TimelineView;

  constructor(parent: HTMLElement, db: DanceDatabase) {
    this.db = db;
    this.elements = TimelineManager.createElements();
    this.setupHandlers();

    db.listTimelines().then((timelines) => this.updateTimelinesView(timelines));

    this.reactive();
    parent.appendChild(this.elements.container);
  }

  static createElements() {
    const { container, get } = createHTML(/* html */ `
      <div class="timeline timeline-manager">
        <div class="timeline-manager-start">
          <label for="timeline-manager-dropdown">Timelines</label>
          <select id="timeline-manager-dropdown">
            <option value="">Select a timeline</option>
          </select>
        </div>
        <div class="timeline-manager-end">
          <input type="text" placeholder="timeline name" />
          <button type="button">add timeline</button>
        </div>
      </div>
    `);

    addCSS(/* css */ `
      .timeline {
        --accent-color: #44b9ff;
        --background-color: #333;
        --background-color-outset: #444;
        --background-color-inset: #111;
        --border-color: #888;
        --border-color-focus: #000;
        --border-color-subtle: #666;
        --border-radius: 3px;
        --font-color: #fff;
        --font-color-inverted: #000;
        --font-family: system-ui, sans-serif;
        --padding: 0.3rem;

        font-family: var(--font-family);
        font-size: 0.9rem;
        font-weight: normal;
      }

      .timeline-manager {
        position: absolute;
        inset: auto 0 0 0;
        background: #fff;
        display: flex;
        padding: 0.3rem;
        border-top: 1px solid var(--border-color-subtle);
        justify-content: space-between;
        background-color: var(--background-color);
        color: var(--font-color);
        align-items: center;

        & select, & button, & input[type=text] {
          &:is(:active, :focus, :focus-visible):not(:disabled) {
            outline: 2px solid var(--accent-color);
            border: 1px solid var(--border-color-focus);
          }

          &:disabled {
            opacity: 0.5  ;
          }
        }

        & select {

        }

        & button {
          background: var(--outset-background-color);
          border: 1px solid var(--accent-color);
          padding: var(--padding);
          border-radius: 3px;
          color: var(--accent-color);

          &:hover {
            background: var(--accent-color);
            color: var(--font-color-inverted);
          }
        }

        & :is(input[type="text"], select) {
          padding: var(--padding);
          border-radius: var(--border-radius);
          border: 1px solid var(--border-color);
          width: 12rem;
          background-color: var(--background-color-inset);
          color: var(--font-color);
        }
      }
    `);

    return {
      container,
      select: get<HTMLSelectElement>("select"),
      input: get<HTMLInputElement>("input[type=text]"),
      button: get<HTMLInputElement>("button"),
    };
  }

  reactive() {
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
          this.closeTimeline
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
