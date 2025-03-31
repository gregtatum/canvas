import { Row, TimelineView } from "lib/timeline/components";
import type { Timeline } from "lib/timeline/types";
import { appendHTML } from "lib/utils";

export class NewRow extends Row {
  elements: ReturnType<typeof NewRow.prototype.createElements>;
  constructor(timeline: Timeline, timelineView: TimelineView) {
    super(timeline, timelineView);
    this.elements = this.createElements();
    this.addHandlers();
  }

  createElements() {
    const get = appendHTML(
      this.container,
      /* html */ `
        <div class="timeline-row-start">
          <select>
            <option value="audio">Audio</option>
            <option value="dance">Dance</option>
            <option value="keyframe">Keyframe</option>
          </select>
          <button type="button">Add</button>
        </div>
        <div class="timeline-row-end"></div>
      `
    );
    return {
      button: get<HTMLButtonElement>("button"),
      select: get<HTMLButtonElement>("select"),
    };
  }

  addHandlers() {
    this.elements.button.addEventListener("click", () => {
      this.timelineView.replaceNewRow(this.elements.select.value);
    });
  }
}
