import asyncio
import base64
import json
import os
from typing import Any, TypeVar, cast
import cv2
import requests
import websockets
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


# https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/index#models
models = {
    "pose_landmarker_lite": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
    "pose_landmarker_full": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
    "pose_landmarker_heavy": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task",
}

ws_port = 8765
is_pose_loop_running = False
model = "pose_landmarker_full"
clients: list["Messenger"] = []
clients_watching_poses: list["Messenger"] = []


class Messenger:
    """
    Wraps a websocket connection to conform to an API.
    """

    client: websockets.WebSocketServerProtocol

    def __init__(self, client: websockets.WebSocketServerProtocol) -> None:
        self.client = client

    def __eq__(self, other) -> bool:
        return self.client == other.client

    async def _send(self, data: dict[str, Any]):
        await self.client.send(json.dumps(data))

    async def send_models(self):
        await self._send(
            {
                "type": "models",
                "models": list([name for name in models]),
            }
        )

    async def send_error(self, message: str):
        await self._send(
            {
                "type": "error",
                "message": message,
            }
        )

    async def send_poses(self, poses: Any, resolution: tuple[int, int]) -> None:
        await self._send(
            {
                "type": "poses",
                "poses": poses,
                "resolution": resolution,
            }
        )

    async def send_frame(self, frame):
        _, buffer = cv2.imencode(".png", frame)
        await self._send(
            {
                "type": "frame",
                "image": base64.b64encode(buffer).decode("utf-8"),
            }
        )


def get_model(model_name: str) -> str:
    url = models[model_name]
    file_name = os.path.basename(url)

    if os.path.exists(file_name):
        print(f"Using model: {model_name}")
    else:
        print(f"Downloading {model_name} model...")
        response = requests.get(url, stream=True)
        response.raise_for_status()
        with open(file_name, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"{model_name} model downloaded.")

    return file_name


async def run_pose_loop() -> None:
    global is_pose_loop_running
    if is_pose_loop_running:
        return

    is_pose_loop_running = True

    pose_landmarker = vision.PoseLandmarker.create_from_options(
        vision.PoseLandmarkerOptions(
            base_options=python.BaseOptions(model_asset_path=get_model(model)),
            output_segmentation_masks=False,
        )
    )

    # https://docs.opencv.org/4.5.4/d8/dfe/classcv_1_1VideoCapture.html
    video_capture = cv2.VideoCapture(1)
    width, height = get_camera_resolution(video_capture)
    print("Video backend:", video_capture.getBackendName())
    print("Using video of size:", width, height)
    while clients_watching_poses and video_capture.isOpened():
        # Free up the event loop to process websocket messages.
        await asyncio.sleep(0)

        was_frame_returned, frame = video_capture.read()
        if not was_frame_returned:
            break
        # cv2.imwrite("feed-in.png", frame)
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)

        detection_result = pose_landmarker.detect(image)

        poses: list[dict[str, Any]] = []
        for landmarks in detection_result.pose_landmarks:
            landmarks_list: list[list[float]] = []
            poses.append({"landmarks": landmarks_list})
            for landmark in landmarks:
                landmarks_list.append(
                    [
                        cast(float, landmark.x),
                        cast(float, landmark.y),
                        cast(float, landmark.z),
                        cast(float, landmark.visibility),
                        cast(float, landmark.presence),
                    ]
                )

        for messenger in clients_watching_poses.copy():
            try:
                await messenger.send_poses(poses, (width, height))
                await messenger.send_frame(frame)
            except Exception as e:
                print("Client send failed", e)
                remove_from_list(clients_watching_poses, messenger)

    video_capture.release()
    cv2.destroyAllWindows()

    is_pose_loop_running = False


def get_camera_resolution(video_capture):
    return (
        int(video_capture.get(cv2.CAP_PROP_FRAME_WIDTH)),
        int(video_capture.get(cv2.CAP_PROP_FRAME_HEIGHT)),
    )


T = TypeVar("T")


def remove_from_list(list: list[T], item: T) -> None:
    try:
        list.remove(item)
    except ValueError:
        # Value is not in the list.
        pass


async def handle_message(
    client: websockets.WebSocketServerProtocol, data: dict[str, Any]
):
    messenger = Messenger(client)
    print("Message received", data)
    match data["type"]:
        case "request-models":
            await messenger.send_models()
        case "switch-model":
            new_model = data.get("model")
            global model
            if new_model in models:
                model = new_model
            else:
                await messenger.send_error(f'The model "{model}" is not available')
        case "watch-poses":
            if client not in clients_watching_poses:
                clients_watching_poses.append(messenger)
            await run_pose_loop()
        case "un-watch-poses":
            remove_from_list(clients_watching_poses, messenger)
        case _:
            await messenger.send_error("JSON message failed to parse")


async def ws_handler(client: websockets.WebSocketServerProtocol, path: str) -> None:
    messenger = Messenger(client)
    clients.append(messenger)
    print(f"Client connected ({len(clients)})")
    try:
        async for message in client:
            data = None
            try:
                data = json.loads(message)
            except Exception as json_exception:
                print("Error: JSON message failed to parse", json_exception)
                await messenger.send_error("JSON message failed to parse")
            if not isinstance(data, dict) or "type" not in data:
                print("Error: JSON was malformed", data)
            elif data:
                await handle_message(client, data)

    except websockets.ConnectionClosed as e:
        print(f"Client disconnected: {client.remote_address}")

    remove_from_list(clients, messenger)
    remove_from_list(clients_watching_poses, messenger)
    print(f"Client removed ({len(clients)})")


async def main():
    async with websockets.serve(ws_handler, "0.0.0.0", ws_port):
        print("WebSocket server started on ws://0.0.0.0:8765")
        print("connect via ws://dancecam1.local:8765 or similar")
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    asyncio.run(main())
