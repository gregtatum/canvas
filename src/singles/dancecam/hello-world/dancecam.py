import os
import time
import requests
import mediapipe as mp
from mediapipe import solutions
from mediapipe.framework.formats import landmark_pb2
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import cv2

import numpy as np

pose_connections = [
    (0, 1), (1, 2), (2, 3), (3, 7), (0, 4), (4, 5),
    (5, 6), (6, 8), (9, 10), (11, 12), (11, 13),
    (13, 15), (15, 17), (15, 19), (15, 21), (17, 19),
    (12, 14), (14, 16), (16, 18), (16, 20), (16, 22),
    (18, 20), (11, 23), (12, 24), (23, 24), (23, 25),
    (24, 26), (25, 27), (26, 28), (27, 29), (28, 30),
    (29, 31), (30, 32), (27, 31), (28, 32)
]  # fmt: skip

landmarks = [
    "nose",
    "right eye inner",     "right eye center", "right eye outer",
    "left eye inner",      "left eye center",  "left eye outer",
    "right ear",           "left ear",
    "right mouth corner",  "left mouth corner",
    "right shoulder",      "left shoulder",
    "right elbow",         "left elbow",
    "right wrist",         "left wrist",
    "right pinky knuckle", "left pinky knuckle",
    "right index knuckle", "left index knuckle",
    "right thumb knuckle", "left thumb knuckle",
    "right hip",           "left hip",
    "right knee",          "left knee",
    "right ankle",         "left ankle",
    "right heel",          "left heel",
    "right foot index",    "left foot index",
]  # fmt: skip

# https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/index#models
pose_landmarker = {
    "lite": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
    "full": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
    "heavy": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task",
}


def get_model(variant: str) -> str:
    url = pose_landmarker[variant]
    file_name = f"pose_landmarker_{variant}.task"

    if os.path.exists(file_name):
        print(f"Using model: {variant}")
    else:
        print(f"Downloading {variant} model...")
        response = requests.get(url, stream=True)
        response.raise_for_status()
        with open(file_name, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"{variant} model downloaded.")

    return file_name


def draw_landmarks_on_image(rgb_image, detection_result: vision.PoseLandmarkerResult):
    """
    To better demonstrate the Pose Landmarker API, we have created a set of visualization
    tools that will be used in this colab. These will draw the landmarks on a detect
    person, as well as the expected connections between those markers.
    """

    pose_landmarks_list = detection_result.pose_landmarks
    annotated_image = np.copy(rgb_image)

    # Loop through the detected poses to visualize.
    for idx in range(len(pose_landmarks_list)):
        pose_landmarks = pose_landmarks_list[idx]

        # Draw the pose landmarks.
        pose_landmarks_proto = landmark_pb2.NormalizedLandmarkList()
        pose_landmarks_proto.landmark.extend(
            [
                landmark_pb2.NormalizedLandmark(
                    x=landmark.x, y=landmark.y, z=landmark.z
                )
                for landmark in pose_landmarks
            ]
        )
        solutions.drawing_utils.draw_landmarks(
            annotated_image,
            pose_landmarks_proto,
            solutions.pose.POSE_CONNECTIONS,
            solutions.drawing_styles.get_default_pose_landmarks_style(),
        )
    return annotated_image


def generate_annotated_image() -> None:
    # Create an PoseLandmarker object.
    # https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/PoseLandmarker
    detector: vision.PoseLandmarker = vision.PoseLandmarker.create_from_options(
        vision.PoseLandmarkerOptions(
            base_options=python.BaseOptions(model_asset_path=get_model("heavy")),
            output_segmentation_masks=True,
        )
    )

    # Load the input image.
    image = mp.Image.create_from_file("image.jpg")

    # Detect pose landmarks from the input image.
    detection_result: vision.PoseLandmarkerResult = detector.detect(image)

    # Process the detection result.
    annotated_image = draw_landmarks_on_image(image.numpy_view(), detection_result)
    cv2.imwrite("annotated_image.png", cv2.cvtColor(annotated_image, cv2.COLOR_RGB2BGR))

    segmentation_mask = detection_result.segmentation_masks[0].numpy_view()
    visualized_mask = np.repeat(segmentation_mask[:, :, np.newaxis], 3, axis=2) * 255
    # cv2_imshow(visualized_mask)
    cv2.imwrite("visualized_mask.png", cv2.cvtColor(visualized_mask, cv2.COLOR_RGB2BGR))

    for idx in range(len(detection_result.pose_landmarks)):
        pose_landmarks = detection_result.pose_landmarks[idx]
        for name, pose_landmark in zip(landmarks, pose_landmarks):
            print("!!! pose_landmark", name, pose_landmark)


def test_performance():
    """Runs a test for each of the model variants by running 10 iterations of the inference
    and measures the amount of milliseconds it took."""

    num_iterations = 100

    for variant in pose_landmarker:
        print(f"Testing {variant}")
        # Load the model
        model_path = get_model(variant)
        detector = vision.PoseLandmarker.create_from_options(
            vision.PoseLandmarkerOptions(
                base_options=python.BaseOptions(model_asset_path=model_path),
                output_segmentation_masks=False,  # Turn off segmentation masks for performance testing
            )
        )

        # Load the input image.
        image = mp.Image.create_from_file("image.jpg")

        # Run the inference multiple times and measure the performance
        times = []
        for _ in range(num_iterations):
            start_time = time.time()
            detector.detect(image)
            end_time = time.time()
            times.append((end_time - start_time) * 1000)  # Convert to milliseconds

        avg_time = sum(times) / num_iterations
        print(f"Average inference time for {variant} model: {avg_time:.2f} ms")


def main() -> None:
    generate_annotated_image()
    test_performance()


if __name__ == "__main__":
    main()
