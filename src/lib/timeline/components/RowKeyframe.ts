import type { CueKeyframe } from "lib/timeline/types";
import { Row, type Timeline } from "lib/timeline/components";
import { appendHTML } from "lib/utils";

export class RowKeyframe extends Row {
  elements: ReturnType<typeof RowKeyframe.prototype.createElements>;

  constructor(cue: CueKeyframe, timeline: Timeline) {
    super(cue, timeline);
    this.elements = this.createElements();
  }

  createElements() {
    const get = appendHTML(
      this.container,
      /* html */ `
        <div class="_start">
          <div class="_content">
            <span class="_name">Camera</span>
            <select>
            </select>
          </div>
          <button class="_remove" tile="Remove row" type="button">
            <img src="../html/xmark.svg">
          </button>
        </div>
        <div class="_end">
          <canvas class="row-line" />
        </div>
      `
    );
    return {
      select: get<HTMLInputElement>("select"),
      line: get<HTMLDivElement>(".row-line"),
      nameLabel: get<HTMLSpanElement>("._name"),
      removeButton: get<HTMLButtonElement>("._remove"),
      canvas: get<HTMLCanvasElement>("canvas"),
    };
  }
}
