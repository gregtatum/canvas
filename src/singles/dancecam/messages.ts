/**
 * A compact representation of the landmarks.
 */
export interface PosesToClient {
  type: "landmarks",
  poses: Array<{
    landmarks: Array<[
      x: number,
      y: number,
      z: number,
      visibility: number,
      presence: number,
    ]>
  }>,
}

export interface ErrorToClient {
  type: "error",
  message: string,
}

export interface WatchPosesToServer {
  type: "watch-poses"
}

export interface UnwatchPosesToServer {
  type: "un-watch-poses"
}

export interface RequestModelsToServer {
  type: "request-models"
}

export interface SwitchModelToServer {
  type: "switch-model",
  model: string,
}
