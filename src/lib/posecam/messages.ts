export type Landmark = [
  x: number,
  y: number,
  z: number,
  visibility: number,
  presence: number
];

export interface PosesFrame {
  poses: Pose[];
  timestamp: number;
  resolution: [number, number];
}

export type Pose = Landmark[];

export type Dance = Array<PosesFrame>;

export type PoseCamEventsToClient =
  | {
      type: "poses";
      posesFrame: PosesFrame;
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
