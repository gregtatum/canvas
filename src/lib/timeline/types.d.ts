import { Dance } from "lib/posecam/messages";

/**
 * This is the context that must be provided by the visualization.
 */
export interface TimelineContext {
  time: Seconds;
}

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

export interface CueAudio {
  offset: number;
  type: "audio";
  hash: string | null;
}
export interface CueDance {
  offset: number;
  type: "dance";
}
export interface CueKeyframe {
  offset: number;
  type: "keyframe";
  key: string;
  value: any;
}

export type Cue = { type: "new" } | CueAudio | CueDance | CueKeyframe;

export interface TimelineRecord {
  name: string;
  created: number;
  lastModified: number;
  // In seconds.
  duration: number;
  cues: Cue[];
}

export interface DatabaseStores {
  dances: DanceRecord;
  audio: AudioRecord;
  timelines: TimelineRecord;
}
