import { Row, Timeline } from "lib/timeline/components";
import type { Cue } from "lib/timeline/types";
import { appendHTML } from "lib/utils";

export class NewRow extends Row {
  elements: ReturnType<typeof NewRow.prototype.createElements>;
  constructor(cue: Cue, timeline: Timeline) {
    super(cue, timeline);
    this.elements = this.createElements();
    this.addHandlers();
  }

  createElements() {
    const get = appendHTML(
      this.container,
      /* html */ `
        <div class="_start">
          <select>
            <option value="audio">Audio</option>
            <option value="dance">Dance</option>
            <option value="keyframe">Keyframe</option>
          </select>
          <button type="button">Add</button>
        </div>
        <div class="_end"></div>
      `
    );
    return {
      button: get<HTMLButtonElement>("button"),
      select: get<HTMLButtonElement>("select"),
    };
  }

  addHandlers() {
    this.timeline.clickNoFocus(this.elements.button, () => {
      this.timeline.replaceNewRow(this.elements.select.value);
    });
  }
}
