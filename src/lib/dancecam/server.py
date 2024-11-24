import asyncio
import base64
import functools
import json
import os
import time
from typing import Any, Optional, TypeVar, cast
import requests
import websockets
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

import cv2


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


class BackgroundTasks:
    """
    Background tasks require a persistent referene to not be GCed. Collected them here.
    """

    tasks: set

    def __init__(self) -> None:
        self.tasks = set()

    def add(self, coro: Any, name=None):
        task = asyncio.create_task(coro, name=name)
        task.add_done_callback(self.done_callback)
        self.tasks.add(task)
        return task

    def done_callback(self, task: asyncio.Task):
        self.tasks.remove(task)


class Messenger:
    """
    Wraps a websocket connection and sends structured messages. See messages.ts.
    """

    client: websockets.WebSocketServerProtocol
    show_frame: bool

    def __init__(self, client: websockets.WebSocketServerProtocol) -> None:
        self.client = client
        self.show_frame = False

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
                "posesFrame": {
                    "poses": poses,
                    "resolution": resolution,
                    "timestamp": int(time.time() * 1000),
                },
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


class Timer:
    def __init__(self, log: bool):
        self.now = time.perf_counter()
        self.log = log

    def measure(self, name: str):
        before = self.now
        self.now = time.perf_counter()
        duration = self.now - before
        if self.log:
            print(f"[perf] {name} {duration:.4f} sec")


async def run_pose_loop(background_tasks: BackgroundTasks) -> None:
    global is_pose_loop_running
    assert not is_pose_loop_running, "The pose loop should not already be running"
    is_pose_loop_running = True
    print("Running pose loop")

    # Set to True to debug timing.
    log_timer = False
    timer = Timer(log=log_timer)

    pose_landmarker = vision.PoseLandmarker.create_from_options(
        vision.PoseLandmarkerOptions(
            base_options=python.BaseOptions(model_asset_path=get_model(model)),
            output_segmentation_masks=False,
        )
    )
    timer.measure("Create pose landmarker")

    # https://docs.opencv.org/4.5.4/d8/dfe/classcv_1_1VideoCapture.html
    video_capture = cv2.VideoCapture(1)
    width, height = get_camera_resolution(video_capture)
    backend_name = video_capture.getBackendName()
    print("Video backend:", backend_name)
    print("Original size:", width, height)

    if backend_name == "AVFOUNDATION":
        # macOS camera
        video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        width, height = get_camera_resolution(video_capture)
        print("Resized video:", width, height)

    timer.measure("Camera created")

    def get_frame_and_image() -> Optional[tuple[cv2.typing.MatLike, mp.Image]]:
        async_timer = Timer(log=log_timer)
        was_frame_returned, frame = video_capture.read()
        if not was_frame_returned:
            return None
        # cv2.imwrite("feed-in.png", frame)
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)
        async_timer.measure("get_frame_and_image")
        return frame, image

    def get_pose(image: mp.Image):
        async_timer = Timer(log=log_timer)
        detection_result = pose_landmarker.detect(image)
        async_timer.measure("get_pose")
        return detection_result

    frame_and_image_future = background_tasks.add(
        asyncio.to_thread(get_frame_and_image), name="frame_and_image"
    )
    while clients_watching_poses and video_capture.isOpened():
        timer.measure("Loop")

        frame_and_image_results = await frame_and_image_future
        if not frame_and_image_results:
            print("Could not retrieve a camera frame")
            break
        frame, image = frame_and_image_results
        pose_detection_future = background_tasks.add(
            asyncio.to_thread(get_pose, image), name="get_pose"
        )

        # Immediately capture a new frame, before waiting for the pose results.
        frame_and_image_future = background_tasks.add(
            asyncio.to_thread(get_frame_and_image), name="frame_and_image"
        )

        detection_result = await pose_detection_future

        poses: list[dict[str, Any]] = []
        for landmarks in detection_result.pose_landmarks:
            pose: list[list[float]] = []
            poses.append(pose)
            for landmark in landmarks:
                pose.append(
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
                if messenger.show_frame:
                    timer.measure("Before send frame")
                    await messenger.send_frame(frame)
            except Exception as e:
                print("Client send failed", e)
                remove_from_list(clients_watching_poses, messenger)

    # Make sure the last frame is captured before releasing everything.
    await frame_and_image_future
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


class Server:
    def __init__(self) -> None:
        self.background_tasks = BackgroundTasks()

    async def client_connected(
        self, client: websockets.WebSocketServerProtocol, path: str
    ) -> None:
        """
        Manage clients connecting and disconnecting.
        """
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
                    await self.handle_message(messenger, data)

        except websockets.ConnectionClosed:
            print(f"Client disconnected: {client.remote_address}")

        remove_from_list(clients, messenger)
        remove_from_list(clients_watching_poses, messenger)
        print(f"Client removed ({len(clients)})")

    async def handle_message(self, messenger: Messenger, data: dict[str, Any]):
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
                if messenger not in clients_watching_poses:
                    clients_watching_poses.append(messenger)
                if not is_pose_loop_running:
                    self.background_tasks.add(
                        run_pose_loop(self.background_tasks), name="run_pose_loop"
                    )
            case "un-watch-poses":
                remove_from_list(clients_watching_poses, messenger)
            case "show-frame":
                messenger.show_frame = bool(data.get("show"))
            case _:
                await messenger.send_error("JSON message failed to parse")


async def main():
    server = Server()
    async with websockets.serve(
        functools.partial(server.client_connected), "0.0.0.0", ws_port
    ) as server:
        print("WebSocket server listening on ws://0.0.0.0:8765")
        print("connect via ws://dancecam1.local:8765, ws://localhost:8765 or similar")
        await asyncio.create_task(server.serve_forever())


if __name__ == "__main__":
    asyncio.run(main())
