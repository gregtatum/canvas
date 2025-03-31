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
