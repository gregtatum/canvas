export interface Pose {
  landmarks: Array<
    [
      //
      x: number,
      y: number,
      z: number,
      visibility: number,
      presence: number
    ]
  >;
}

export type DanceCamEventsToClient =
  | {
      type: "poses";
      poses: Array<Pose>;
      resolution: [number, number];
    }
  | {
      type: "error";
      message: string;
    }
  | { type: "models"; models: string[] }
  | {
      type: "frame";
      image: string;
    };

export type DanceCamEventsToServer =
  | { type: "watch-poses" }
  | { type: "un-watch-poses" }
  | { type: "request-models" }
  | {
      type: "switch-model";
      model: string;
    };
