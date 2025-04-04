import { type DanceDatabase } from "lib/posecam";
import type { Timeline } from "lib/timeline/types";
import { type TimelineView } from "lib/timeline/components/TimelineView";

export abstract class Row {
  timeline: Timeline;
  timelineView: TimelineView;
  db: DanceDatabase;
  container: HTMLElement;
  constructor(timeline: Timeline, timelineView: TimelineView) {
    this.timeline = timeline;
    this.timelineView = timelineView;
    this.db = timelineView.db;
    this.container = document.createElement("div");
    this.container.className = "row";
  }

  update(): void {}
  drawTimeline() {}
}
