import { type DanceDatabase } from "lib/posecam";
import type { Timeline } from "lib/timeline/types";
import { addCSS } from "lib/utils";
import { type TimelineView } from "lib/timeline/components/TimelineView";

export abstract class Row {
  timeline: Timeline;
  timelineView: TimelineView;
  db: DanceDatabase;
  container: HTMLElement;
  static cssAdded = false;
  constructor(timeline: Timeline, timelineView: TimelineView) {
    this.timeline = timeline;
    this.timelineView = timelineView;
    this.db = timelineView.db;
    this.container = document.createElement("div");
    this.container.className = "timeline-row";
    if (Row.cssAdded) {
      return;
    }
    Row.cssAdded = true;
    addCSS(/* css */ `
      .timeline-row {
        display: flex;
      }
      .timeline-row-start {
        width: var(--sidebar-width);
        border-right: 1px solid var(--border-color-subtle);
        box-sizing: border-box;
        border-top: 1px solid var(--border-color-subtle);
        padding: 8px;
        display: flex;
        align-items: center;
      }
      .timeline-row-start-content {
        flex: 1;
        display: flex;
        gap: 7px;
        align-items: center;
      }
      .timeline-row-end {
        flex: 1;
        border-top: 1px solid var(--border-color-subtle);
      }

      .timeline-row-remove {
        background: none;
        border: none;
        padding: 6px;
        margin: -6px;
        cursor: pointer;
        opacity: 0.8;

        &:hover {
          opacity: 1;
        }

        & img {
          width: 12px;
          height: 12px;
        }
      }

      .timeline-line {
        height: 33px;
        background-color: #74c0e4;
        z-index: 1;
      }
    `);
  }

  update(_time: { time: number }): void {}
  drawTimeline() {}
}
