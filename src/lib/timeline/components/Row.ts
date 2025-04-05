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
}
