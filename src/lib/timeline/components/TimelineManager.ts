import { type DanceDatabase } from "lib/posecam";
import type { TimelineRecord } from "lib/timeline/types";
import { addStylesheet, createHTML, LocationManager } from "lib/utils";
import { TimelineView } from "lib/timeline/components/TimelineView";

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
    addStylesheet("../html/timeline.css");

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
