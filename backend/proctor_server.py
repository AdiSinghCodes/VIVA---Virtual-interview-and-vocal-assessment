import os

# Keep CPU math libraries from spawning many worker threads on a memory-limited machine.
os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("MKL_NUM_THREADS", "2")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")

from flask import Flask, request
from flask_socketio import SocketIO, emit

import base64
import cv2
import numpy as np
import time
import sys
import threading
import gc
from contextlib import nullcontext
from pathlib import Path

try:
    import torch
    torch.set_num_threads(2)
    try:
        torch.set_num_interop_threads(1)
    except RuntimeError:
        # PyTorch may already have initialized its inter-op pool.
        pass
except Exception as torch_import_error:
    torch = None
    print(f"PyTorch thread limit not applied: {torch_import_error}", flush=True)

cv2.setNumThreads(1)


# ============================================================
# IMPORT
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

sys.path.insert(
    0,
    str(BASE_DIR)
)

from ai_proctor import InterviewObjectDetector


# ============================================================
# FLASK
# ============================================================

app = Flask(__name__)

app.config["SECRET_KEY"] = (
    "ai-interview-proctoring"
)


socketio = SocketIO(

    app,

    cors_allowed_origins="*",

    async_mode="threading",

    max_http_buffer_size=4_000_000,

    ping_timeout=60,

    ping_interval=25
)


# ============================================================
# DETECTORS
# ============================================================

detectors = {}

detector_locks = {}

detectors_lock = threading.Lock()

# Only one inference/decode pipeline runs at a time. Other arriving frames are
# dropped immediately instead of waiting in threads while holding large images.
global_frame_lock = threading.Lock()
last_frame_at = {}
last_frame_lock = threading.Lock()
MIN_FRAME_INTERVAL_SECONDS = max(
    0.12,
    min(1.0, float(os.environ.get("PROCTOR_MIN_FRAME_INTERVAL_SECONDS", "0.20")))
)
MAX_BASE64_FRAME_CHARS = 3_000_000
MAX_FRAME_WIDTH = 640


# ============================================================
# GET DETECTOR
# ============================================================

def get_detector(sid):

    with detectors_lock:

        if sid not in detectors:

            print()
            print(
                "Creating detector for:",
                sid
            )

            detectors[sid] = (
                InterviewObjectDetector(
                    use_camera=False
                )
            )

            detector_locks[sid] = (
                threading.Lock()
            )

        return (
            detectors[sid],
            detector_locks[sid]
        )


# ============================================================
# SERIALIZE RESULT
# ============================================================

def serialise_result(
    detector,
    result
):

    return {

        # ----------------------------------------------------
        # FACE
        # ----------------------------------------------------

        "face_detected":
            bool(
                result.get(
                    "face_detected",
                    False
                )
            ),

        "face_inside_circle":
            bool(
                result.get(
                    "face_inside_circle",
                    False
                )
            ),

        "face_misaligned":
            bool(
                result.get(
                    "face_misaligned",
                    False
                )
            ),

        "face_reason":
            result.get(
                "face_reason",
                ""
            ),

        "face_box":
            result.get(
                "face_box"
            ),

        "face_center":
            result.get(
                "face_center"
            ),

        # ----------------------------------------------------
        # PEOPLE
        # ----------------------------------------------------

        "multiple_people":
            bool(
                result.get(
                    "multiple_people",
                    False
                )
            ),

        "people_count":
            int(
                result.get(
                    "people_count",
                    0
                )
            ),

        "people":
            result.get(
                "people",
                []
            ),

        # ----------------------------------------------------
        # PHONE
        # ----------------------------------------------------

        "cell_phone":
            bool(
                result.get(
                    "cell_phone",
                    False
                )
            ),

        "phones":
            result.get(
                "phones",
                []
            ),

        # ----------------------------------------------------
        # OBJECTS
        # ----------------------------------------------------

        "objects":
            result.get(
                "objects",
                []
            ),

        "hand_detected":
            bool(
                result.get(
                    "hand_detected",
                    False
                )
            ),

        "hand_carrying_object":
            bool(
                result.get(
                    "hand_carrying_object",
                    False
                )
            ),

        "carried_object":
            result.get(
                "carried_object"
            ),

        # ----------------------------------------------------
        # LOOKING
        # ----------------------------------------------------

        "looking_direction":
            result.get(
                "looking_direction",
                "CENTER"
            ),

        "yaw":
            float(
                result.get(
                    "yaw",
                    0.0
                )
            ),

        "pitch":
            float(
                result.get(
                    "pitch",
                    0.0
                )
            ),

        "roll":
            float(
                result.get(
                    "roll",
                    0.0
                )
            ),

        "side_duration":
            float(
                result.get(
                    "side_duration",
                    0.0
                )
            ),

        # ----------------------------------------------------
        # FACE TIMERS
        # ----------------------------------------------------

        "no_face":
            bool(
                result.get(
                    "no_face",
                    False
                )
            ),

        "no_face_duration":
            float(
                result.get(
                    "no_face_duration",
                    0.0
                )
            ),

        "misaligned_duration":
            float(
                result.get(
                    "misaligned_duration",
                    0.0
                )
            ),

        # ----------------------------------------------------
        # WARNINGS
        # ----------------------------------------------------

        "warning_count":
            int(
                result.get(
                    "warning_count",
                    detector.warning_count
                )
            ),

        "max_warnings":
            5,

        "last_warning_reason":
            result.get(
                "last_warning_reason",
                detector.last_warning_reason
            ),

        "warnings":
            result.get(
                "warnings",
                []
            ),

        # ----------------------------------------------------
        # TERMINATION
        # ----------------------------------------------------

        "terminated":
            bool(
                result.get(
                    "terminated",
                    False
                )
            )
    }


# ============================================================
# CONNECT
# ============================================================

@socketio.on("connect")
def connected():

    sid = request.sid

    print()
    print(
        "Browser connected:",
        sid
    )

    # IMPORTANT:
    #
    # Do NOT create YOLO here.
    #
    # Detector is created only when
    # the first video frame arrives.

    emit(
        "proctor_status",
        {
            "connected": True
        }
    )


# ============================================================
# DISCONNECT
# ============================================================

@socketio.on("disconnect")
def disconnected():

    sid = request.sid

    print()
    print(
        "Browser disconnected:",
        sid
    )

    with detectors_lock:

        detector = detectors.pop(
            sid,
            None
        )

        detector_locks.pop(
            sid,
            None
        )

    with last_frame_lock:
        last_frame_at.pop(sid, None)

    if detector:

        try:

            detector.cleanup()

        except Exception as e:

            print(
                "Detector cleanup error:",
                e
            )

    gc.collect()


# ============================================================
# RESET
# ============================================================

@socketio.on("reset_proctoring")
def reset_proctoring():

    sid = request.sid

    detector, lock = get_detector(
        sid
    )

    with lock:

        detector.reset_warnings()

    emit(
        "proctor_result",
        {
            "warning_count": 0,
            "terminated": False
        }
    )


# ============================================================
# VIDEO FRAME
# ============================================================

@socketio.on("video_frame")
def video_frame(payload):
    sid = request.sid
    detector = None
    session_lock = None
    session_lock_acquired = False
    global_lock_acquired = False
    raw = None
    frame = None
    encoded_array = None
    response = None

    # Throttle early, before decoding base64 or allocating image arrays.
    now = time.monotonic()
    with last_frame_lock:
        previous = last_frame_at.get(sid, 0.0)
        if now - previous < MIN_FRAME_INTERVAL_SECONDS:
            return
        last_frame_at[sid] = now

    # A busy server drops this frame instead of queueing it and retaining RAM.
    if not global_frame_lock.acquire(blocking=False):
        return
    global_lock_acquired = True

    try:
        detector, session_lock = get_detector(sid)
        if not session_lock.acquire(blocking=False):
            return
        session_lock_acquired = True

        if isinstance(payload, dict):
            data = payload.get("image", "")
        else:
            data = str(payload or "")

        if not data:
            emit("proctor_error", {"error": "No image received"})
            return

        if "," in data:
            data = data.split(",", 1)[1]

        if len(data) > MAX_BASE64_FRAME_CHARS:
            emit("proctor_error", {"error": "Frame is too large; send a smaller webcam image."})
            return

        raw = base64.b64decode(data, validate=False)
        encoded_array = np.frombuffer(raw, dtype=np.uint8)
        frame = cv2.imdecode(encoded_array, cv2.IMREAD_COLOR)

        if frame is None:
            emit("proctor_error", {"error": "Could not decode webcam frame"})
            return

        # Resize before any detector work so YOLO and MediaPipe receive a small frame.
        height, width = frame.shape[:2]
        if width > MAX_FRAME_WIDTH:
            new_height = max(1, int(height * MAX_FRAME_WIDTH / width))
            frame = cv2.resize(
                frame,
                (MAX_FRAME_WIDTH, new_height),
                interpolation=cv2.INTER_AREA,
            )

        timestamp_ms = int(time.monotonic() * 1000)
        inference_context = torch.inference_mode() if torch is not None else nullcontext()
        with inference_context:
            result = detector.process_frame(frame, timestamp_ms)

        response = serialise_result(detector, result)
        emit("proctor_result", response)

    except Exception as e:
        print("Frame processing error:", repr(e), flush=True)
        # Do not kill the server or send internal stack traces to the browser.
        emit("proctor_error", {"error": "Frame processing failed. Please keep the webcam resolution low and try again."})
    finally:
        if session_lock_acquired and session_lock is not None:
            try:
                session_lock.release()
            except RuntimeError:
                pass
        if global_lock_acquired:
            try:
                global_frame_lock.release()
            except RuntimeError:
                pass
        # Drop references promptly; do not force a costly full GC on every frame.
        raw = None
        frame = None
        encoded_array = None
        response = None


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    return {
        "ok": True,
        "service":
            "AI interview proctoring"
    }


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    print()
    print(
        "AI Interview Proctoring WebSocket "
        "server running on "
        "http://localhost:5000"
    )

    socketio.run(

        app,

        host="0.0.0.0",

        port=int(os.environ.get('PROCTOR_PORT','5000')),

        debug=False,

        allow_unsafe_werkzeug=True
    )