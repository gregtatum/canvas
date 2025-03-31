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

export interface AudioRecord {
  name: string;
  hash: string;
  timestamp: number;
  audio: Blob;
}

export interface DanceRecord {
  name: string;
  dance: Dance;
  timestamp: number;
}

export interface TimelineAudio {
  offset: number;
  type: "audio";
  hash: string | null;
}
export interface TimelineDance {
  offset: number;
  type: "dance";
}
export interface TimelineKeyframe {
  offset: number;
  type: "keyframe";
  key: string;
  value: any;
}

export type Timeline =
  | { type: "new" }
  | TimelineAudio
  | TimelineDance
  | TimelineKeyframe;

export interface TimelineRecord {
  name: string;
  created: number;
  lastModified: number;
  // In seconds.
  duration: number;
  timeline: Timeline[];
}

export interface DatabaseStores {
  dances: DanceRecord;
  audio: AudioRecord;
  timelines: TimelineRecord;
}

export type DanceCamEventsToClient =
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
