import { type DanceDatabase } from "lib/posecam";
import type { Cue } from "lib/timeline/types";
import { type Timeline } from "lib/timeline/components";

export abstract class Row {
  cue: Cue;
  timeline: Timeline;
  db: DanceDatabase;
  container: HTMLElement;
  constructor(cue: Cue, timeline: Timeline) {
    this.cue = cue;
    this.timeline = timeline;
    this.db = timeline.db;
    this.container = document.createElement("div");
    this.container.className = "row";
  }

  update(): void {}
  drawTimeline() {}

  addRemoveButtonHandler(removeButton: HTMLButtonElement) {
    this.timeline.clickNoFocus(removeButton, () => {
      if (confirm("Are you sure you want to delete that row?")) {
        const oldCues = this.timeline.record.cues;
        const newCues = this.timeline.record.cues.filter(
          (timeline) => timeline !== this.cue
        );
        this.timeline.undos.apply(
          () => {
            this.timeline.record.cues = newCues;
            this.timeline.reactive();
          },
          () => {
            this.timeline.record.cues = oldCues;
            this.timeline.reactive();
          }
        );
      }
    });
  }
}
