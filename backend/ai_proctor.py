import cv2
import time
import math
import os
import urllib.request
import threading
import gc
import numpy as np

from ultralytics import YOLO


# ============================================================
# CONFIGURATION
# ============================================================

def env_float(name, default, minimum, maximum):
    try:
        value = float(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        print(f"Invalid {name}; using default {default}.", flush=True)
        value = default
    return max(minimum, min(maximum, value))


YOLO_MODEL = "yolo11n.pt"

# Load one YOLO model per Python process instead of duplicating the model for
# every browser session. The proctor server serializes inference access.
_SHARED_YOLO_MODEL = None
_SHARED_YOLO_LOCK = threading.Lock()

MAX_WARNINGS = 50

LOOK_AWAY_SECONDS = env_float("PROCTOR_LOOK_AWAY_SECONDS", 2.0, 0.1, 60.0)
FACE_OUTSIDE_SECONDS = env_float("PROCTOR_FACE_OUTSIDE_SECONDS", 5.0, 0.1, 60.0)
NO_FACE_SECONDS = env_float("PROCTOR_NO_FACE_SECONDS", 5.0, 0.1, 60.0)

CIRCLE_RX_RATIO = 0.32
CIRCLE_RY_RATIO = 0.38

# MediaPipe face direction sensitivity
# Smaller = more sensitive
YAW_THRESHOLD = env_float("PROCTOR_YAW_THRESHOLD", 0.16, 0.01, 1.0)

YOLO_CONFIDENCE = env_float("PROCTOR_YOLO_CONFIDENCE", 0.40, 0.01, 1.0)
PERSON_CONFIDENCE = env_float("PROCTOR_PERSON_CONFIDENCE", 0.50, 0.01, 1.0)
FACE_LANDMARKER_CONFIDENCE = env_float("PROCTOR_FACE_CONFIDENCE", 0.50, 0.01, 1.0)
HAND_LANDMARKER_CONFIDENCE = env_float("PROCTOR_HAND_CONFIDENCE", 0.50, 0.01, 1.0)

FACE_MODEL_FILE = "face_landmarker.task"
HAND_MODEL_FILE = "hand_landmarker.task"

FACE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "face_landmarker/face_landmarker/float16/1/face_landmarker.task"
)

HAND_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
)


# Objects that can be detected as carried objects
OBJECT_CLASSES = {
    "book",
    "bottle",
    "cup",
    "laptop",
    "remote",
    "scissors",
    "keyboard",
    "mouse",
    "fork",
    "knife",
    "spoon",
    "bowl",
    "cell phone",
}

# Cell phone gives immediate warning even without hand detection
IMMEDIATE_OBJECTS = {
    "cell phone",
}


# ============================================================
# MODEL DOWNLOAD
# ============================================================

def download_file(url, filename):

    if os.path.exists(filename):
        return

    print()
    print("=" * 60)
    print("Downloading:", filename)
    print("=" * 60)

    urllib.request.urlretrieve(url, filename)

    print(filename, "downloaded successfully.")


# ============================================================
# DETECTOR
# ============================================================

class InterviewObjectDetector:

    def __init__(self, use_camera=False):

        print()
        print("=" * 70)
        print("INITIALIZING AI INTERVIEW PROCTORING")
        print("=" * 70)

        self.use_camera = use_camera

        # ----------------------------------------------------
        # LOCK
        # ----------------------------------------------------

        self.processing_lock = threading.RLock()

        # ----------------------------------------------------
        # YOLO
        # ----------------------------------------------------

        print("Loading YOLO...")

        global _SHARED_YOLO_MODEL
        with _SHARED_YOLO_LOCK:
            if _SHARED_YOLO_MODEL is None:
                _SHARED_YOLO_MODEL = YOLO(YOLO_MODEL)
            self.model = _SHARED_YOLO_MODEL

        print("YOLO loaded.")

        self.PERSON_CLASS = 0
        self.PHONE_CLASS = 67

        # ----------------------------------------------------
        # MEDIAPIPE
        # ----------------------------------------------------

        print("Loading MediaPipe...")

        download_file(
            FACE_MODEL_URL,
            FACE_MODEL_FILE
        )

        download_file(
            HAND_MODEL_URL,
            HAND_MODEL_FILE
        )

        import mediapipe as mp

        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision

        self.mp = mp

        # ----------------------------------------------------
        # FACE LANDMARKER
        # ----------------------------------------------------

        face_options = vision.FaceLandmarkerOptions(

            base_options=python.BaseOptions(
                model_asset_path=FACE_MODEL_FILE
            ),

            running_mode=vision.RunningMode.VIDEO,

            # We need multiple faces for detecting
            # a second person.
            num_faces=5,

            min_face_detection_confidence=FACE_LANDMARKER_CONFIDENCE,
            min_face_presence_confidence=FACE_LANDMARKER_CONFIDENCE,
            min_tracking_confidence=FACE_LANDMARKER_CONFIDENCE
        )

        self.face_landmarker = (
            vision.FaceLandmarker.create_from_options(
                face_options
            )
        )

        # ----------------------------------------------------
        # HAND LANDMARKER
        # ----------------------------------------------------

        hand_options = vision.HandLandmarkerOptions(

            base_options=python.BaseOptions(
                model_asset_path=HAND_MODEL_FILE
            ),

            running_mode=vision.RunningMode.VIDEO,

            num_hands=2,

            min_hand_detection_confidence=HAND_LANDMARKER_CONFIDENCE,
            min_hand_presence_confidence=HAND_LANDMARKER_CONFIDENCE,
            min_tracking_confidence=HAND_LANDMARKER_CONFIDENCE
        )

        self.hand_landmarker = (
            vision.HandLandmarker.create_from_options(
                hand_options
            )
        )

        print("MediaPipe loaded.")

        # ====================================================
        # WARNING SYSTEM
        # ====================================================

        self.warning_count = 0
        self.max_warnings = MAX_WARNINGS

        self.last_warning_reason = ""
        self.last_warning_time = 0.0

        self.warning_cooldown = 1.0

        # ====================================================
        # STATES
        # ====================================================

        self.multiple_person_active = False
        self.phone_active = False
        self.hand_object_active = False

        # ====================================================
        # FACE OUTSIDE TIMER
        # ====================================================

        self.face_outside_start = None
        self.face_outside_duration = 0.0

        # ====================================================
        # NO FACE TIMER
        # ====================================================

        self.no_face_start = None
        self.no_face_duration = 0.0

        # ====================================================
        # LEFT / RIGHT TIMER
        # ====================================================

        self.look_direction = None
        self.look_start_time = None
        self.side_duration = 0.0

        # ====================================================
        # MEDIAPIPE TIMESTAMP
        # ====================================================

        self.last_timestamp_ms = 0

        # ====================================================
        # STATS
        # ====================================================

        self.frame_count = 0

        self.stats = {
            "multiple_people": 0,
            "cell_phone": 0,
            "object_detected": 0,
            "hand_object": 0,
            "looking_left": 0,
            "looking_right": 0,
            "face_outside": 0,
            "no_face": 0
        }

        print("AI Proctoring Ready.")

    # ========================================================
    # WARNING
    # ========================================================

    def add_warning(self, reason, force=False):

        now = time.monotonic()

        if self.warning_count >= self.max_warnings:
            return False

        if not force:

            if (
                now - self.last_warning_time
                < self.warning_cooldown
            ):
                return False

        self.warning_count += 1

        self.last_warning_time = now
        self.last_warning_reason = reason

        print()
        print("=" * 60)
        print(
            f"WARNING {self.warning_count}/"
            f"{self.max_warnings}"
        )
        print(reason)
        print("=" * 60)

        if self.warning_count >= self.max_warnings:
            print("INTERVIEW TERMINATED")

        return True

    # ========================================================
    # SAFE MONOTONIC TIMESTAMP
    # ========================================================

    def _get_timestamp(self, timestamp_ms):

        if timestamp_ms is None:

            timestamp_ms = int(
                time.monotonic() * 1000
            )

        timestamp_ms = int(timestamp_ms)

        # MediaPipe VIDEO mode requires:
        #
        # timestamp(n+1) > timestamp(n)
        #
        if timestamp_ms <= self.last_timestamp_ms:

            timestamp_ms = (
                self.last_timestamp_ms + 1
            )

        self.last_timestamp_ms = timestamp_ms

        return timestamp_ms

    # ========================================================
    # YOLO DETECTION
    # ========================================================

    def detect_yolo(self, frame):

        results = self.model.predict(
            source=frame,
            conf=YOLO_CONFIDENCE,
            device="cpu",
            verbose=False,
            imgsz=416,
            max_det=30
        )

        persons = []
        objects = []

        for result in results:

            if result.boxes is None:
                continue

            for box in result.boxes:

                cls_id = int(box.cls[0])
                confidence = float(box.conf[0])

                if confidence < YOLO_CONFIDENCE:
                    continue

                x1, y1, x2, y2 = map(
                    int,
                    box.xyxy[0].tolist()
                )

                class_name = self.model.names[cls_id]

                # ------------------------------------------------
                # PERSON
                # ------------------------------------------------

                if cls_id == self.PERSON_CLASS:

                    if confidence >= PERSON_CONFIDENCE:

                        persons.append({
                            "box": (
                                x1,
                                y1,
                                x2,
                                y2
                            ),
                            "confidence": confidence
                        })

                # ------------------------------------------------
                # OBJECT
                # ------------------------------------------------

                elif class_name in OBJECT_CLASSES:

                    objects.append({
                        "class_id": cls_id,
                        "name": class_name,
                        "confidence": confidence,
                        "box": (
                            x1,
                            y1,
                            x2,
                            y2
                        )
                    })

        return persons, objects

    # ========================================================
    # BOX CENTER
    # ========================================================

    @staticmethod
    def box_center(box):

        x1, y1, x2, y2 = box

        return (
            int((x1 + x2) / 2),
            int((y1 + y2) / 2)
        )

    # ========================================================
    # POINT INSIDE BOX
    # ========================================================

    @staticmethod
    def point_inside_box(point, box):

        px, py = point

        x1, y1, x2, y2 = box

        return (
            x1 <= px <= x2
            and
            y1 <= py <= y2
        )

    # ========================================================
    # IOU
    # ========================================================

    @staticmethod
    def iou(box_a, box_b):

        ax1, ay1, ax2, ay2 = box_a
        bx1, by1, bx2, by2 = box_b

        ix1 = max(ax1, bx1)
        iy1 = max(ay1, by1)

        ix2 = min(ax2, bx2)
        iy2 = min(ay2, by2)

        iw = max(0, ix2 - ix1)
        ih = max(0, iy2 - iy1)

        intersection = iw * ih

        area_a = (
            max(0, ax2 - ax1)
            *
            max(0, ay2 - ay1)
        )

        area_b = (
            max(0, bx2 - bx1)
            *
            max(0, by2 - by1)
        )

        union = (
            area_a
            +
            area_b
            -
            intersection
        )

        if union <= 0:
            return 0.0

        return intersection / union

    # ========================================================
    # FACE BOX
    # ========================================================

    def get_face_box(
        self,
        landmarks,
        width,
        height
    ):

        xs = []
        ys = []

        for lm in landmarks:

            if (
                0 <= lm.x <= 1
                and
                0 <= lm.y <= 1
            ):

                xs.append(
                    int(lm.x * width)
                )

                ys.append(
                    int(lm.y * height)
                )

        if not xs or not ys:
            return None

        x1 = max(0, min(xs))
        y1 = max(0, min(ys))

        x2 = min(width - 1, max(xs))
        y2 = min(height - 1, max(ys))

        if (
            x2 - x1 < 20
            or
            y2 - y1 < 20
        ):
            return None

        return (
            x1,
            y1,
            x2,
            y2
        )

    # ========================================================
    # FACE CENTER
    # ========================================================

    @staticmethod
    def face_center(box):

        x1, y1, x2, y2 = box

        return (
            int((x1 + x2) / 2),
            int((y1 + y2) / 2)
        )

    # ========================================================
    # FACE -> PERSON ASSOCIATION
    #
    # IMPORTANT:
    #
    # YOLO person alone is NOT enough.
    #
    # A person must have a MediaPipe face.
    #
    # This prevents:
    #
    # hand -> person
    # object -> person
    # chair -> person
    #
    # ========================================================

    def associate_faces_to_persons(
        self,
        persons,
        face_boxes
    ):

        valid_persons = []

        for person in persons:

            pbox = person["box"]

            has_face = False

            for face_box in face_boxes:

                fc = self.face_center(
                    face_box
                )

                # Face center inside person box
                if self.point_inside_box(
                    fc,
                    pbox
                ):

                    has_face = True
                    break

                # Small overlap also accepted
                if self.iou(
                    pbox,
                    face_box
                ) > 0.01:

                    has_face = True
                    break

            if has_face:

                valid_persons.append(
                    person
                )

        return valid_persons

    # ========================================================
    # HAND + OBJECT
    # ========================================================

    def check_hand_object(
        self,
        hand_result,
        objects,
        persons,
        width,
        height
    ):

        if not hand_result.hand_landmarks:
            return False, None

        if not objects:
            return False, None

        wrists = []

        for hand_landmarks in (
            hand_result.hand_landmarks
        ):

            wrist = hand_landmarks[0]

            wx = int(
                wrist.x * width
            )

            wy = int(
                wrist.y * height
            )

            wrists.append(
                (
                    wx,
                    wy
                )
            )

        for obj in objects:

            name = obj["name"]

            # Phone handled separately
            if name in IMMEDIATE_OBJECTS:
                continue

            ox1, oy1, ox2, oy2 = obj["box"]

            object_center = (
                int((ox1 + ox2) / 2),
                int((oy1 + oy2) / 2)
            )

            # ------------------------------------------------
            # OBJECT MUST BE NEAR A REAL PERSON
            # ------------------------------------------------

            near_person = False

            for person in persons:

                px1, py1, px2, py2 = (
                    person["box"]
                )

                margin_x = int(
                    (px2 - px1) * 0.10
                )

                margin_y = int(
                    (py2 - py1) * 0.10
                )

                expanded = (
                    px1 - margin_x,
                    py1 - margin_y,
                    px2 + margin_x,
                    py2 + margin_y
                )

                if self.point_inside_box(
                    object_center,
                    expanded
                ):

                    near_person = True
                    break

            if not near_person:
                continue

            # ------------------------------------------------
            # OBJECT MUST BE NEAR WRIST
            # ------------------------------------------------

            for wrist in wrists:

                distance = math.hypot(
                    object_center[0] - wrist[0],
                    object_center[1] - wrist[1]
                )

                threshold = max(
                    70,
                    int(
                        max(
                            ox2 - ox1,
                            oy2 - oy1
                        ) * 1.8
                    )
                )

                if distance <= threshold:

                    return True, name

        return False, None

    # ========================================================
    # HEAD DIRECTION
    #
    # MediaPipe landmarks
    #
    # nose = 1
    # left face = 234
    # right face = 454
    #
    # ========================================================

    def calculate_head_direction(
        self,
        landmarks,
        width,
        height
    ):

        try:

            nose = landmarks[1]

            left_face = landmarks[234]
            right_face = landmarks[454]

            nose_x = nose.x * width

            left_x = (
                left_face.x * width
            )

            right_x = (
                right_face.x * width
            )

            face_width = abs(
                right_x - left_x
            )

            if face_width < 1:

                return (
                    "CENTER",
                    0.0,
                    0.0
                )

            face_center_x = (
                left_x + right_x
            ) / 2

            horizontal_ratio = (
                nose_x - face_center_x
            ) / face_width

            if (
                horizontal_ratio
                < -YAW_THRESHOLD
            ):

                direction = "LEFT"

            elif (
                horizontal_ratio
                > YAW_THRESHOLD
            ):

                direction = "RIGHT"

            else:

                direction = "CENTER"

            yaw = (
                horizontal_ratio * 90.0
            )

            return (
                direction,
                horizontal_ratio,
                yaw
            )

        except Exception:

            return (
                "CENTER",
                0.0,
                0.0
            )

    # ========================================================
    # FACE CENTER CIRCLE
    # ========================================================

    def check_face_inside_circle(
        self,
        face_box,
        width,
        height
    ):

        x1, y1, x2, y2 = face_box

        cx = (
            x1 + x2
        ) / 2

        cy = (
            y1 + y2
        ) / 2

        circle_cx = width / 2
        circle_cy = height / 2

        rx = (
            width *
            CIRCLE_RX_RATIO
        )

        ry = (
            height *
            CIRCLE_RY_RATIO
        )

        if rx <= 0 or ry <= 0:
            return False

        dx = (
            cx - circle_cx
        ) / rx

        dy = (
            cy - circle_cy
        ) / ry

        distance = (
            dx * dx
            +
            dy * dy
        )

        return distance <= 1.0

    # ========================================================
    # PROCESS FRAME
    # ========================================================

    def process_frame(
        self,
        frame,
        timestamp_ms=None
    ):

        with self.processing_lock:

            return self._process_frame_locked(
                frame,
                timestamp_ms
            )

    # ========================================================
    # PROCESS FRAME - LOCKED
    # ========================================================

    def _process_frame_locked(
        self,
        frame,
        timestamp_ms
    ):

        current_time = time.monotonic()

        timestamp_ms = self._get_timestamp(
            timestamp_ms
        )

        self.frame_count += 1

        h, w = frame.shape[:2]

        result = {

            "face_detected": False,

            "face_inside_circle": False,

            "face_misaligned": False,

            "face_reason": "",

            "face_box": None,

            "face_center": None,

            "people_count": 0,

            "people": [],

            "multiple_people": False,

            "phones": [],

            "cell_phone": False,

            "objects": [],

            "hand_detected": False,

            "hand_carrying_object": False,

            "carried_object": None,

            "looking_direction": "CENTER",

            "yaw": 0.0,

            "pitch": 0.0,

            "roll": 0.0,

            "no_face": False,

            "no_face_duration": 0.0,

            "misaligned_duration": 0.0,

            "side_duration": 0.0,

            "warning_count": self.warning_count,

            "last_warning_reason":
                self.last_warning_reason,

            "terminated": False,

            "warnings": []
        }

        # ====================================================
        # RESIZE FOR CPU
        # ====================================================

        # Keep webcam frame small.
        # This significantly reduces CPU RAM usage.
        max_width = 640

        if w > max_width:

            scale = max_width / w

            new_w = max_width
            new_h = int(h * scale)

            frame = cv2.resize(
                frame,
                (new_w, new_h),
                interpolation=cv2.INTER_AREA
            )

            h, w = frame.shape[:2]

        # ====================================================
        # YOLO
        # ====================================================

        persons, objects = self.detect_yolo(
            frame
        )

        # ====================================================
        # MEDIAPIPE IMAGE
        # ====================================================

        rgb = cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2RGB
        )

        mp_image = self.mp.Image(
            image_format=self.mp.ImageFormat.SRGB,
            data=np.ascontiguousarray(rgb)
        )

        # ====================================================
        # FACE LANDMARKER
        # ====================================================

        face_result = (
            self.face_landmarker.detect_for_video(
                mp_image,
                timestamp_ms
            )
        )

        face_boxes = []

        face_candidates = []

        if face_result.face_landmarks:

            for landmarks in (
                face_result.face_landmarks
            ):

                box = self.get_face_box(
                    landmarks,
                    w,
                    h
                )

                if box is not None:

                    face_boxes.append(
                        box
                    )

                    x1, y1, x2, y2 = box

                    area = (
                        x2 - x1
                    ) * (
                        y2 - y1
                    )

                    face_candidates.append(
                        (
                            area,
                            box,
                            landmarks
                        )
                    )

        # ====================================================
        # ASSOCIATE FACES WITH PEOPLE
        # ====================================================

        valid_persons = (
            self.associate_faces_to_persons(
                persons,
                face_boxes
            )
        )

        result["people"] = [
            {
                "box": p["box"],
                "confidence": p["confidence"]
            }
            for p in valid_persons
        ]

        result["people_count"] = (
            len(valid_persons)
        )

        # ====================================================
        # MULTIPLE PEOPLE
        #
        # ONLY >= 2 REAL PEOPLE
        # WITH ASSOCIATED FACES
        # ====================================================

        if len(valid_persons) >= 2:

            # SECOND PERSON = WARNING ONLY.
            # Do not directly terminate the interview for multiple people.
            # Termination is controlled only by the overall warning limit.
            result["multiple_people"] = True

            if not self.multiple_person_active:

                self.multiple_person_active = True

                self.stats[
                    "multiple_people"
                ] += 1

                warning_added = (
                    self.add_warning(
                        "MULTIPLE PEOPLE DETECTED "
                        f"({len(valid_persons)} PERSONS)",
                        force=True
                    )
                )

                if warning_added:

                    result["warnings"].append(
                        "MULTIPLE PEOPLE DETECTED"
                    )

        else:

            self.multiple_person_active = False

        # ====================================================
        # OBJECTS
        # ====================================================

        result["objects"] = [
            {
                "name": obj["name"],
                "confidence": obj["confidence"],
                "box": obj["box"]
            }
            for obj in objects
        ]

        # ====================================================
        # CELL PHONE
        # ====================================================

        phones = [
            obj
            for obj in objects
            if obj["name"] == "cell phone"
        ]

        result["phones"] = [
            {
                "name": "cell phone",
                "confidence": p["confidence"],
                "box": p["box"]
            }
            for p in phones
        ]

        phone_detected = (
            len(phones) > 0
        )

        result["cell_phone"] = (
            phone_detected
        )

        # Only one warning for continuous phone detection
        if phone_detected:

            if not self.phone_active:

                self.phone_active = True

                self.stats[
                    "cell_phone"
                ] += 1

                warning_added = (
                    self.add_warning(
                        "CELL PHONE DETECTED",
                        force=True
                    )
                )

                if warning_added:

                    result["warnings"].append(
                        "CELL PHONE DETECTED"
                    )

        else:

            self.phone_active = False

        # ====================================================
        # OBJECT STATISTICS
        # ====================================================

        other_objects = [
            obj
            for obj in objects
            if obj["name"]
            not in IMMEDIATE_OBJECTS
        ]

        if other_objects:

            self.stats[
                "object_detected"
            ] += 1

        # ====================================================
        # HAND LANDMARKER
        # ====================================================

        hand_result = (
            self.hand_landmarker.detect_for_video(
                mp_image,
                timestamp_ms
            )
        )

        hand_detected = bool(
            hand_result.hand_landmarks
        )

        result["hand_detected"] = (
            hand_detected
        )

        # ====================================================
        # HAND + OBJECT
        # ====================================================

        hand_object, carried_name = (
            self.check_hand_object(
                hand_result,
                objects,
                valid_persons,
                w,
                h
            )
        )

        result[
            "hand_carrying_object"
        ] = hand_object

        result[
            "carried_object"
        ] = carried_name

        if hand_object:

            if not self.hand_object_active:

                self.hand_object_active = True

                self.stats[
                    "hand_object"
                ] += 1

                warning_added = (
                    self.add_warning(
                        "HAND CARRYING OBJECT DETECTED"
                    )
                )

                if warning_added:

                    result["warnings"].append(
                        "HAND CARRYING OBJECT DETECTED"
                    )

        else:

            self.hand_object_active = False

        # ====================================================
        # PRIMARY FACE
        # ====================================================

        primary_face_box = None
        primary_landmarks = None

        if face_candidates:

            face_candidates.sort(
                key=lambda x: x[0],
                reverse=True
            )

            (
                _,
                primary_face_box,
                primary_landmarks
            ) = face_candidates[0]

        # ====================================================
        # NO FACE
        # ====================================================

        if primary_face_box is None:

            result["no_face"] = True

            self.stats[
                "no_face"
            ] += 1

            if self.no_face_start is None:

                self.no_face_start = (
                    current_time
                )

            self.no_face_duration = (
                current_time
                -
                self.no_face_start
            )

            result[
                "no_face_duration"
            ] = self.no_face_duration

            # Reset looking timer
            self.look_direction = None
            self.look_start_time = None
            self.side_duration = 0.0

            # 5 SECOND NO FACE
            if (
                self.no_face_duration
                >= NO_FACE_SECONDS
            ):

                result["terminated"] = True

                result["warnings"].append(
                    "NO FACE DETECTED FOR 5 SECONDS"
                )

        else:

            self.no_face_start = None
            self.no_face_duration = 0.0

            result[
                "no_face_duration"
            ] = 0.0

            result["face_detected"] = True

            result["face_box"] = (
                primary_face_box
            )

            result["face_center"] = (
                self.face_center(
                    primary_face_box
                )
            )

            # =================================================
            # FACE CENTER
            # =================================================

            inside = (
                self.check_face_inside_circle(
                    primary_face_box,
                    w,
                    h
                )
            )

            result[
                "face_inside_circle"
            ] = inside

            # =================================================
            # HEAD DIRECTION
            # =================================================

            (
                direction,
                horizontal_ratio,
                yaw
            ) = self.calculate_head_direction(
                primary_landmarks,
                w,
                h
            )

            result[
                "looking_direction"
            ] = direction

            result["yaw"] = yaw

            # =================================================
            # LEFT / RIGHT 2 SECOND TIMER
            # =================================================

            if direction in (
                "LEFT",
                "RIGHT"
            ):

                if (
                    self.look_direction
                    != direction
                ):

                    self.look_direction = (
                        direction
                    )

                    self.look_start_time = (
                        current_time
                    )

                    self.side_duration = 0.0

                else:

                    self.side_duration = (
                        current_time
                        -
                        self.look_start_time
                    )

                result[
                    "side_duration"
                ] = self.side_duration

                if (
                    self.side_duration
                    >= LOOK_AWAY_SECONDS
                ):

                    reason = (
                        "CANDIDATE LOOKING "
                        f"{direction}"
                    )

                    warning_added = (
                        self.add_warning(
                            reason
                        )
                    )

                    if warning_added:

                        result["warnings"].append(
                            reason
                        )

                    # Reset timer
                    self.look_start_time = (
                        current_time
                    )

                    self.side_duration = 0.0

                    if direction == "LEFT":

                        self.stats[
                            "looking_left"
                        ] += 1

                    else:

                        self.stats[
                            "looking_right"
                        ] += 1

            else:

                self.look_direction = None
                self.look_start_time = None
                self.side_duration = 0.0

                result[
                    "side_duration"
                ] = 0.0

            # =================================================
            # FACE ALIGNMENT
            # =================================================

            if not inside:

                result[
                    "face_misaligned"
                ] = True

                result[
                    "face_reason"
                ] = (
                    "FACE OUTSIDE CENTER CIRCLE"
                )

                if (
                    self.face_outside_start
                    is None
                ):

                    self.face_outside_start = (
                        current_time
                    )

                self.face_outside_duration = (
                    current_time
                    -
                    self.face_outside_start
                )

                self.stats[
                    "face_outside"
                ] += 1

            else:

                result[
                    "face_misaligned"
                ] = False

                result[
                    "face_reason"
                ] = (
                    "FACE INSIDE CENTER CIRCLE"
                )

                self.face_outside_start = None

                self.face_outside_duration = 0.0

            result[
                "misaligned_duration"
            ] = self.face_outside_duration

            # =================================================
            # 5 SECOND FACE OUTSIDE WARNING
            # =================================================

            if (
                self.face_outside_duration
                >= FACE_OUTSIDE_SECONDS
            ):

                warning_added = (
                    self.add_warning(
                        "FACE OUTSIDE CENTER CIRCLE"
                    )
                )

                if warning_added:

                    result["warnings"].append(
                        "FACE OUTSIDE CENTER CIRCLE"
                    )

                self.face_outside_start = (
                    current_time
                )

                self.face_outside_duration = 0.0

        # ====================================================
        # FINAL STATUS
        # ====================================================

        result[
            "warning_count"
        ] = self.warning_count

        result[
            "last_warning_reason"
        ] = self.last_warning_reason

        if (
            self.warning_count
            >= self.max_warnings
        ):

            result["terminated"] = True

        return result

    # ========================================================
    # RESET
    # ========================================================

    def reset_warnings(self):

        with self.processing_lock:

            self.warning_count = 0

            self.last_warning_reason = ""

            self.last_warning_time = 0.0

            self.multiple_person_active = False

            self.phone_active = False

            self.hand_object_active = False

            self.face_outside_start = None
            self.face_outside_duration = 0.0

            self.no_face_start = None
            self.no_face_duration = 0.0

            self.look_direction = None
            self.look_start_time = None
            self.side_duration = 0.0

            # Restart MediaPipe timestamp
            self.last_timestamp_ms = 0

    # ========================================================
    # CLEANUP
    # ========================================================

    def cleanup(self):

        with self.processing_lock:

            try:

                if hasattr(
                    self,
                    "face_landmarker"
                ):

                    self.face_landmarker.close()

            except Exception:
                pass

            try:

                if hasattr(
                    self,
                    "hand_landmarker"
                ):

                    self.hand_landmarker.close()

            except Exception:
                pass

            try:

                del self.model

            except Exception:
                pass

            gc.collect()
