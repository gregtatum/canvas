import { appendHTML, reactiveInvalidator } from "lib/utils";
import { type Timeline } from "lib/timeline/components";

/**
 * Edit duration time like 00:03:26.
 */
export class DurationEditor {
  elements: ReturnType<typeof DurationEditor.prototype.createElements>;
  timeline: Timeline;
  isFocused = false;

  constructor(container: HTMLElement, timeline: Timeline) {
    this.timeline = timeline;
    this.elements = this.createElements(container);
    this.addHandlers();
    this.reactive();
  }

  createElements(container: HTMLElement) {
    const get = appendHTML(
      container,
      /* html */ `
        <span class="_time"></span>
        <span>&nbsp;/&nbsp;</span>
        <input class="_hours" type="number" min="0" max="23" />
        <span>:</span>
        <input class="_minutes" type="number" min="0" max="59" />
        <span>:</span>
        <input class="_seconds" type="number" min="0" max="59" />
      `
    );
    return {
      time: get<HTMLSpanElement>("._time"),
      hours: get<HTMLInputElement>("._hours"),
      minutes: get<HTMLInputElement>("._minutes"),
      seconds: get<HTMLInputElement>("._seconds"),
    };
  }

  addHandlers() {
    const { hours, minutes, seconds } = this.elements;
    for (const element of [hours, minutes, seconds]) {
      element.addEventListener("input", this.handleInput);
      element.addEventListener("blur", this.handleBlur);
      element.addEventListener("focus", this.handleFocus);
      element.addEventListener("keypress", this.handleEnter);
    }
  }

  handleInput = () => {
    const { timeline } = this;
    const { hours, minutes, seconds } = this.elements;
    const h = parseInt(hours.value) || 0;
    let m = parseInt(minutes.value) || 0;
    let s = parseInt(seconds.value) || 0;
    if (m >= 60) {
      m = 59;
    }
    if (s >= 60) {
      s = 59;
    }
    const newDuration = h * 3600 + m * 60 + s;
    const minRange = 1;
    if (timeline.range[1] > timeline.record.duration - 1) {
      // We're within 1 second of the full range, expand the range when adding on.
      timeline.range[1] = newDuration;
    }
    // Keep the range in bounds.
    timeline.range[0] = Math.min(timeline.range[0], newDuration - minRange);
    timeline.range[1] = Math.min(timeline.range[1], newDuration);
    timeline.record.duration = newDuration;
    this.reactive();
  };

  handleBlur = () => {
    this.isFocused = false;
    this.reactive();
  };

  handleFocus = (event: FocusEvent) => {
    (event.target as HTMLInputElement)?.select();
    this.isFocused = true;
  };

  handleEnter = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      (event.target as HTMLInputElement).blur();
      this.timeline.elements.container.focus();
    }
  };

  isDurationInvalidated = reactiveInvalidator([
    () => this.isFocused,
    () => this.timeline.record.duration,
  ]);
  reactive() {
    if (this.isDurationInvalidated() && !this.isFocused) {
      const { duration } = this.timeline.record;
      const { hours, minutes, seconds } = this.elements;

      const h = Math.floor(duration / 3600);
      const m = Math.floor((duration % 3600) / 60);
      const s = Math.round(duration % 60);

      hours.value = h.toString().padStart(2, "0");
      minutes.value = m.toString().padStart(2, "0");
      seconds.value = s.toString().padStart(2, "0");
    }
  }

  update() {
    if (this.timeline.isPlaying || this.timeline.wasScrubbed) {
      this.elements.time.innerText = formatSecondsToTimecode(
        this.timeline.time
      );
    }
  }
}

function formatSecondsToTimecode(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
}
