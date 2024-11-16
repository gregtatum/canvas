export type Landmark = [
  x: number,
  y: number,
  z: number,
  visibility: number,
  presence: number
];

export interface Pose {
  landmarks: Array<Landmark>;
  timestamp: number;
}

export type Dance = Pose[];

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
  | { type: "show-frame"; show: boolean }
  | {
      type: "switch-model";
      model: string;
    };
