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
        <div class="row-new _start">
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
    const { timeline, elements } = this;
    const { record } = timeline;
    const oldCues = timeline.record.cues;
    const newCues = record.cues.slice();

    // Replace the cue.
    const index = record.cues.findIndex((timeline) => timeline.type === "new");
    newCues[index] = createDefaultTimeline(this.elements.select.value);

    timeline.clickNoFocus(elements.button, () => {
      timeline.undos.apply(
        () => {
          record.cues = newCues;
          timeline.reactive();
        },
        () => {
          record.cues = oldCues;
          timeline.reactive();
        }
      );
    });
  }
}

function createDefaultTimeline(timelineType: string): Cue {
  switch (timelineType) {
    case "new":
      return { type: "new" };
    case "audio":
      return { offset: 0, type: "audio", hash: null };
    case "dance":
      return { offset: 0, type: "dance" };
    case "keyframe":
      return { offset: 0, type: "keyframe", key: "", value: null };
    default:
      throw new Error("Unknown timeline " + timelineType);
  }
}
