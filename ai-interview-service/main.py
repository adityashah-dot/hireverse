"""
main.py — FastAPI AI Interview Microservice for HireVerse Integration
Handles: session management, audio transcription (Groq Whisper), 
answer evaluation (Groq LLM), eye-detection, and HireVerse webhook.
"""

import os
import sys
import json
import copy
import uuid
import base64
import hashlib
import tempfile
import asyncio
import shutil
import threading
import time
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

import cv2
import numpy as np
import librosa
import soundfile as sf
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

load_dotenv(Path(__file__).parent / ".env")

# ==================== AUTHENTICATION ====================

def verify_service_auth(request: Request):
    """
    Shared-secret authentication for all endpoints.
    The Next.js proxy must include Authorization: Bearer <AI_SERVICE_AUTH_SECRET>
    Health check is exempt.
    """
    # Skip auth if no secret is configured (development fallback)
    if not config.AI_SERVICE_AUTH_SECRET:
        return True
    auth_header = request.headers.get("Authorization", "")
    expected = f"Bearer {config.AI_SERVICE_AUTH_SECRET}"
    if not auth_header or auth_header != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True


# ==================== YOLO POSE MODEL ====================

_yolo_model = None
_yolo_lock = threading.Lock()

def get_yolo_model():
    global _yolo_model
    if _yolo_model is None:
        with _yolo_lock:
            if _yolo_model is None:
                from ultralytics import YOLO
                _yolo_model = YOLO("yolov8n-pose.pt")
    return _yolo_model


def analyze_frame_yolo(img_bgr) -> dict:
    """Analyze a BGR frame with YOLOv8 Pose. Returns attention status and signals."""
    model = get_yolo_model()
    results = model(img_bgr, verbose=False)[0]

    if results.keypoints is None or len(results.keypoints.xy) == 0:
        return {"attention": "no_face", "person_count": 0, "signals": []}

    person_count = len(results.keypoints.xy)
    signals = []

    if person_count > 1:
        signals.append("multiple_people")

    kp = results.keypoints.xy[0]    # shape (17, 2)
    conf = results.keypoints.conf[0] # shape (17,)

    eyes_visible = conf[1] > 0.4 and conf[2] > 0.4
    if not eyes_visible:
        signals.append("looking_down")

    l_ear_vis, r_ear_vis = conf[3] > 0.4, conf[4] > 0.4
    if l_ear_vis and not r_ear_vis:
        signals.append("looking_right")
    elif r_ear_vis and not l_ear_vis:
        signals.append("looking_left")

    if conf[5] > 0.4 and conf[6] > 0.4:
        shoulder_angle = abs(float(kp[5][1]) - float(kp[6][1]))
        if shoulder_angle > 40:
            signals.append("torso_turned")

    attention = "no_face" if person_count == 0 else ("attentive" if not signals else "suspicious")

    return {"attention": attention, "person_count": person_count, "signals": signals}


# Local modules
sys.path.insert(0, os.path.dirname(__file__))
import config
from utils import analyze_response_llm, update_difficulty, calculate_final_score, generate_questions_from_jd, generate_followup_question
from question_engine import load_existing_questions, choose_next_question
from whisper_client import remote_whisper_client

# ==================== PYDANTIC MODELS ====================

class CandidateInfo(BaseModel):
    name: str
    email: str
    hireverse_interview_id: Optional[str] = None   # HireVerse Interview record ID


class InterviewStartRequest(BaseModel):
    candidate_info: CandidateInfo
    position: str = "Software Engineer"
    interview_type: Optional[str] = "Technical Interview"
    question_pool: Optional[List[dict]] = None   # recruiter can pass custom questions
    time_limit_minutes: Optional[int] = None


class PregenerateQuestionsRequest(BaseModel):
    interview_id: str
    position: str = "Software Engineer"
    interview_type: Optional[str] = "Technical Interview"
    question_count: Optional[int] = None
    experience_level: Optional[str] = "MID"
    candidate_skills: Optional[List[str]] = None      # from parsed resume
    required_skills: Optional[List[str]] = None       # from job posting
    candidate_experience_years: Optional[int] = None


class InterviewEndRequest(BaseModel):
    session_id: str


class QuestionResponse(BaseModel):
    session_id: str
    answer_text: str
    question_id: int


class ViolationLogRequest(BaseModel):
    sessionId: str
    candidateEmail: str
    type: str
    timestamp: str
    duration: Optional[int] = None
    details: Optional[str] = None


class EyeDetectionFrameRequest(BaseModel):
    session_id: str
    frame_data: str         # base64 encoded JPEG
    timestamp: Optional[str] = None


# ==================== GLOBAL STATE ====================
active_sessions: Dict[str, Dict[str, Any]] = {}
_violation_locks: Dict[str, threading.Lock] = {}
_frame_locks: Dict[str, asyncio.Lock] = {}

# ==================== SESSION PERSISTENCE ====================

_SESSION_DIR = Path(__file__).parent / "sessions"
_SESSION_DIR.mkdir(exist_ok=True)


def _session_file(session_id: str) -> Path:
    safe = "".join(c for c in session_id if c.isalnum() or c in ("-", "_"))
    return _SESSION_DIR / f"{safe}.json"


def _save_session(session_id: str) -> None:
    """Persist the in-memory session to disk after every state change."""
    session = active_sessions.get(session_id)
    if not session:
        return
    try:
        target = _session_file(session_id)
        tmp_path = target.with_suffix(".tmp")
        tmp_path.write_text(json.dumps(session, default=str), encoding="utf-8")
        os.replace(tmp_path, target)  # atomic on POSIX and Windows
    except Exception as e:
        print(f"⚠️ Failed to persist session {session_id}: {e}")


def _load_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Load a session from disk into memory. Returns the session dict or None."""
    f = _session_file(session_id)
    if not f.exists():
        return None
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
        # Restore datetime fields that were serialised as strings
        for key in ("created_at", "interview_timer_started", "start_time", "end_time"):
            if isinstance(data.get(key), str):
                try:
                    data[key] = datetime.fromisoformat(data[key])
                except ValueError:
                    pass
        active_sessions[session_id] = data
        return data
    except Exception as e:
        print(f"⚠️ Failed to load session {session_id} from disk: {e}")
        return None


def _get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Memory-first lookup with automatic disk fallback."""
    return active_sessions.get(session_id) or _load_session(session_id)


def _delete_session_file(session_id: str) -> None:
    try:
        f = _session_file(session_id)
        if f.exists():
            f.unlink()
    except Exception:
        pass


# ==================== HELPERS ====================

def generate_browser_fingerprint(request: Request) -> str:
    ua = request.headers.get("user-agent", "")
    accept_lang = request.headers.get("accept-language", "")
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (
        request.headers.get("x-real-ip", str(request.client.host) if request.client else "unknown")
    )
    raw = f"{ua}|{accept_lang}|{ip}"
    return hashlib.sha256(raw.encode("utf-8", errors="ignore")).hexdigest()[:16]


def check_timer_expired(session: dict) -> bool:
    started = session.get("interview_timer_started")
    if not started:
        return False
    if isinstance(started, str):
        started = datetime.fromisoformat(started)
    elapsed = (datetime.now() - started).total_seconds() / 60
    return elapsed >= session.get("time_limit_minutes", config.INTERVIEW_TIME_LIMIT_MINUTES)


def get_remaining_minutes(session: dict) -> float:
    time_limit = session.get("time_limit_minutes", config.INTERVIEW_TIME_LIMIT_MINUTES)
    started = session.get("interview_timer_started")
    if not started:
        return time_limit
    if isinstance(started, str):
        started = datetime.fromisoformat(started)
    elapsed = (datetime.now() - started).total_seconds() / 60
    return max(0.0, round(time_limit - elapsed, 2))


def clean_transcript(text: str) -> str:
    """Remove common Whisper hallucinations and repetitions."""
    if not text or not text.strip():
        return ""
    import re
    text = text.strip()
    # Remove common hallucination phrases
    hallucinations = ["thank you", "thanks for watching", "please subscribe", "goodbye", "bye"]
    lower = text.lower()
    for h in hallucinations:
        if lower.count(h) >= 2 and len(text.split()) < 15:
            return ""
    # Remove excessive word repetitions
    words = text.split()
    cleaned = []
    i = 0
    while i < len(words):
        count = 1
        while i + count < len(words) and words[i + count].lower() == words[i].lower():
            count += 1
        if count > 3:
            cleaned.append(words[i])
            i += count
        else:
            cleaned.extend(words[i: i + count])
            i += count
    return " ".join(cleaned)


def _ensure_question_shape(question_pool: List[dict]) -> List[dict]:
    for q in question_pool:
        q.setdefault("ans", "")
        q.setdefault("score", "")
        q.setdefault("feedback", "")
        q.setdefault("difficulty", "easy")
        q.setdefault("passing_threshold", 55)
    return question_pool


def _normalize_time_limit_minutes(value: Optional[int]) -> int:
    if value is None:
        return config.INTERVIEW_TIME_LIMIT_MINUTES
    try:
        minutes = int(value)
    except Exception:
        return config.INTERVIEW_TIME_LIMIT_MINUTES
    # Keep safe bounds aligned with product constraints.
    return max(15, min(480, minutes))


def _pregenerated_questions_dir() -> Path:
    path = Path(__file__).parent / "questions" / "pregenerated"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _pregenerated_questions_file(interview_id: str) -> Path:
    safe_id = "".join(ch for ch in interview_id if ch.isalnum() or ch in ("-", "_"))
    return _pregenerated_questions_dir() / f"{safe_id}.json"


def save_pre_generated_questions(interview_id: str, question_pool: List[dict], meta: dict) -> str:
    file_path = _pregenerated_questions_file(interview_id)
    payload = {
        "interview_id": interview_id,
        "created_at": datetime.now().isoformat(),
        "position": meta.get("position"),
        "interview_type": meta.get("interview_type"),
        "questions": question_pool,
    }
    file_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return str(file_path)


def load_pre_generated_questions(interview_id: str) -> Optional[List[dict]]:
    file_path = _pregenerated_questions_file(interview_id)
    if not file_path.exists():
        return None
    try:
        payload = json.loads(file_path.read_text(encoding="utf-8"))
        questions = payload.get("questions")
        if not isinstance(questions, list) or len(questions) == 0:
            return None
        return _ensure_question_shape(questions)
    except Exception as e:
        print(f"⚠️ Failed to load pre-generated questions for {interview_id}: {e}")
        return None


# ==================== BACKGROUND TASKS ====================

async def finalize_interview_background(session_snapshot: dict):
    """Called in background after interview ends: saves results + calls HireVerse webhook."""
    session_id = session_snapshot["session_id"]
    try:
        # Calculate final score
        final_results = calculate_final_score(session_snapshot.get("results", []))

        # Process eye-tracking frames if they exist
        session_dir = Path("eye_logs") / f"session_{session_id}"
        if session_dir.exists():
            try:
                frame_files = list(session_dir.glob("frame_*.jpg"))
                if frame_files:
                    print(f"👁️ Processing {len(frame_files)} eye tracking frames for {session_id}")
                    # Basic attention estimate from saved frames (lightweight)
                    attention_score = await _estimate_attention_from_frames(session_dir)
                    final_results["attention_score"] = attention_score
            except Exception as e:
                print(f"⚠️ Eye frame processing error: {e}")

        # Build question breakdown (clean subset of each result for the webhook)
        raw_results = session_snapshot.get("results", [])
        question_breakdown = [
            {
                "question": r.get("question"),
                "answer": r.get("answer"),
                "score": r.get("score"),
                "difficulty": r.get("difficulty"),
                "key_points_covered": r.get("key_points_covered", []),
                "key_points_missed": r.get("key_points_missed", []),
                "feedback": r.get("feedback"),
            }
            for r in raw_results
        ]

        # Derive strengths / areas_for_improvement from per-question data
        strengths = list({
            (r.get("difficulty") or "unknown").capitalize() + " questions"
            for r in raw_results if r.get("score", 0) >= 70 and r.get("difficulty")
        })
        areas_for_improvement = list({
            (r.get("difficulty") or "unknown").capitalize() + " questions"
            for r in raw_results if r.get("score", 0) < 55 and r.get("difficulty")
        })
        final_results["strengths"] = strengths
        final_results["areas_for_improvement"] = areas_for_improvement

        # Build proctoring section
        violations = session_snapshot.get("violations", [])
        violation_counts: dict = {}
        for v in violations:
            vtype = v.get("type", "unknown")
            violation_counts[vtype] = violation_counts.get(vtype, 0) + 1

        proctoring = {
            "attention_score": final_results.pop("attention_score", None),
            "violations": violations,
            "gaze_analysis": violation_counts,
        }

        # Save results JSON locally
        results_data = {
            "session_id": session_id,
            "hireverse_interview_id": session_snapshot.get("hireverse_interview_id"),
            "candidate_info": session_snapshot.get("candidate_info"),
            "position": session_snapshot.get("position"),
            "start_time": session_snapshot.get("start_time"),
            "end_time": session_snapshot.get("end_time"),
            "total_questions": session_snapshot.get("total_questions", 0),
            "questions_answered": len(raw_results),
            "final_results": final_results,
            "question_breakdown": question_breakdown,
            "proctoring": proctoring,
            "status": "completed",
        }

        Path("results").mkdir(exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = f"results/interview_{session_id}_{ts}.json"
        with open(results_file, "w") as f:
            json.dump(results_data, f, indent=2, default=str)
        print(f"💾 Saved results: {results_file}")

        # Call HireVerse webhook
        await _call_hireverse_webhook(results_data)

    except Exception as e:
        print(f"❌ Background finalization error for {session_id}: {e}")
    finally:
        active_sessions.pop(session_id, None)
        _delete_session_file(session_id)


async def _estimate_attention_from_frames(session_dir: Path) -> float:
    """Count frames with no YOLO violations vs total sampled frames."""
    try:
        frames = sorted(session_dir.glob("frame_*.jpg"))
        if not frames:
            return 100.0

        sample = frames[::max(1, len(frames) // 30)]
        if not sample:
            return 100.0

        clean = 0
        for frame_path in sample:
            img = await asyncio.to_thread(cv2.imread, str(frame_path))
            if img is None:
                continue
            result = await asyncio.to_thread(analyze_frame_yolo, img)
            if result["attention"] == "attentive":
                clean += 1

        return round((clean / len(sample)) * 100, 1)
    except Exception:
        return 100.0


async def _call_hireverse_webhook(results_data: dict):
    """POST results to HireVerse Next.js webhook endpoint."""
    url = config.HIREVERSE_WEBHOOK_URL
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url,
                json=results_data,
                headers={
                    "Content-Type": "application/json",
                    "x-webhook-secret": config.HIREVERSE_WEBHOOK_SECRET,
                },
            )
            if resp.status_code in (200, 201):
                print(f"✅ HireVerse webhook success: {resp.status_code}")
            else:
                print(f"⚠️ HireVerse webhook returned {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"❌ HireVerse webhook error: {e}")


# ==================== SESSION CLEANUP THREAD ====================

def _cleanup_loop():
    while True:
        time.sleep(config.CLEANUP_INTERVAL_SECONDS)
        try:
            now = datetime.now()
            expiry_seconds = config.SESSION_EXPIRY_HOURS * 3600

            # Evict expired in-memory sessions
            expired = [
                sid for sid, s in list(active_sessions.items())
                if isinstance(s.get("created_at"), datetime)
                and (now - s["created_at"]).total_seconds() > expiry_seconds
            ]
            for sid in expired:
                active_sessions.pop(sid, None)
                _delete_session_file(sid)
                print(f"🧹 Expired session evicted: {sid}")

            # Also sweep session files that are older than expiry (covers restarts)
            for f in _SESSION_DIR.glob("*.json"):
                try:
                    age = (now - datetime.fromtimestamp(f.stat().st_mtime)).total_seconds()
                    if age > expiry_seconds:
                        f.unlink()
                        print(f"🧹 Stale session file deleted: {f.name}")
                except Exception:
                    pass
        except Exception as e:
            print(f"⚠️ Cleanup error: {e}")


# ==================== FASTAPI APP ====================

app = FastAPI(
    title="HireVerse AI Interview Service",
    description="Voice-based AI interview with eye-tracking anti-cheat",
    version="2.0.0",
)

_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    print("🚀 HireVerse AI Interview Service starting...")
    # Load question pool on startup to validate
    pool = load_existing_questions(silent=True)
    if pool:
        print(f"✅ Question pool ready: {len(pool)} questions")
    else:
        print("⚠️ Using built-in fallback questions")
    # Start cleanup thread
    threading.Thread(target=_cleanup_loop, daemon=True).start()
    print("🧹 Session cleanup thread started")
    print("✅ Ready to accept interviews")


# ==================== HEALTH ====================

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_sessions": len(active_sessions),
        "service": "HireVerse AI Interview Service",
    }


@app.post("/api/interview/pregenerate")
async def pregenerate_interview_questions(req: PregenerateQuestionsRequest, _auth=Depends(verify_service_auth)):
    try:
        if not req.interview_id or not req.interview_id.strip():
            raise HTTPException(status_code=400, detail="interview_id is required")

        target_count = max(5, min(15, req.question_count or 8))

        print(
            f"🧠 Pre-generating {target_count} questions for interview {req.interview_id} "
            f"({req.position}, {req.interview_type or 'Technical Interview'}, "
            f"level={req.experience_level or 'MID'})"
        )
        if req.candidate_skills:
            print(f"   Candidate skills: {req.candidate_skills}")
        if req.required_skills:
            print(f"   Required skills:  {req.required_skills}")

        question_pool = generate_questions_from_jd(
            position=req.position,
            interview_type=req.interview_type or "Technical Interview",
            candidate_skills=req.candidate_skills,
            required_skills=req.required_skills,
            experience_level=req.experience_level or "MID",
            candidate_experience_years=req.candidate_experience_years,
            question_count=target_count,
        )

        if not question_pool:
            print("⚠️ Pre-generation via Groq failed. Falling back to local question_pool.json.")
            question_pool = load_existing_questions(silent=True)

        if not question_pool:
            raise HTTPException(status_code=500, detail="Unable to generate interview questions")

        question_pool = _ensure_question_shape(question_pool)

        file_path = save_pre_generated_questions(
            req.interview_id,
            question_pool,
            {
                "position": req.position,
                "interview_type": req.interview_type,
                "experience_level": req.experience_level,
            },
        )

        return {
            "status": "ready",
            "interview_id": req.interview_id,
            "question_count": len(question_pool),
            "difficulty_breakdown": {
                d: sum(1 for q in question_pool if q.get("difficulty") == d)
                for d in ("easy", "medium", "hard")
            },
            "storage": file_path,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error pre-generating questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== INTERVIEW ENDPOINTS ====================

@app.post("/api/interview/start")
async def start_interview(req: InterviewStartRequest, http_req: Request, _auth=Depends(verify_service_auth)):
    try:
        fingerprint = generate_browser_fingerprint(http_req)
        session_id = str(uuid.uuid4())
        interview_time_limit = _normalize_time_limit_minutes(req.time_limit_minutes)

        # Check for an active session for same candidate+browser (allow resume).
        # Scan memory first, then any persisted sessions for this candidate.
        all_sessions = dict(active_sessions)
        for f in _SESSION_DIR.glob("*.json"):
            sid_candidate = f.stem
            if sid_candidate not in all_sessions:
                loaded = _load_session(sid_candidate)
                if loaded:
                    all_sessions[sid_candidate] = loaded

        for sid, s in all_sessions.items():
            if (
                s.get("candidate_info", {}).get("email") == req.candidate_info.email
                and s.get("browser_fingerprint") == fingerprint
                and s.get("status") == "active"
                and s.get("current_question_num", 0) > 1
            ):
                remaining = get_remaining_minutes(s)
                print(f"🔄 Resuming session {sid}")
                return {
                    "session_id": sid,
                    "status": "resumed",
                    "message": "Resuming your previous interview session",
                    "current_question": s.get("current_question", {}).get("question"),
                    "current_question_num": s.get("current_question_num", 1),
                    "total_questions": s.get("total_questions", config.NUM_QUESTIONS),
                    "introduction": "Welcome back! Let's continue where we left off.",
                    "remaining_time_minutes": remaining,
                }

        # Load pre-generated questions first for HireVerse interviews.
        if req.question_pool:
            question_pool = req.question_pool
        elif req.candidate_info.hireverse_interview_id:
            interview_id = req.candidate_info.hireverse_interview_id
            question_pool = load_pre_generated_questions(interview_id)
            if not question_pool:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Interview questions are not ready yet for this link. "
                        "Please contact the recruiter to regenerate the interview link."
                    ),
                )
            print(
                f"✅ Loaded {len(question_pool)} pre-generated questions "
                f"for interview {interview_id}"
            )
        else:
            print(f"🧠 Prompting Groq to dynamically generate questions for {req.position} ({req.interview_type})...")
            # Try to generate live questions tailored to the position and interview type
            question_pool = generate_questions_from_jd(
                position=req.position, 
                interview_type=req.interview_type or "Technical Interview"
            )
            
            if not question_pool:
                print("⚠️ Dynamic generation failed or timed out. Falling back to local question_pool.json 25-question bank.")
                question_pool = load_existing_questions(silent=True)
                
            if not question_pool:
                raise HTTPException(status_code=500, detail="No questions available")

        question_pool = _ensure_question_shape(question_pool)
        total_questions = len(question_pool)
        if total_questions <= 0:
            raise HTTPException(status_code=500, detail="No questions available")

        first_question = choose_next_question(question_pool, difficulty="easy", session_id=session_id)

        session = {
            "session_id": session_id,
            "created_at": datetime.now(),
            "browser_fingerprint": fingerprint,
            "candidate_info": req.candidate_info.dict(),
            "hireverse_interview_id": req.candidate_info.hireverse_interview_id,
            "position": req.position,
            "current_question_num": 1 if first_question else 0,
            "total_questions": total_questions,
            "question_pool": question_pool,
            "current_question": first_question,
            "current_difficulty": "easy",
            "results": [],
            "start_time": datetime.now().isoformat(),
            "interview_timer_started": datetime.now(),
            "time_limit_minutes": interview_time_limit,
            "status": "active",
            "violations": [],
            "pending_followup": None,        # set when a follow-up is triggered
            "questions_with_followup": [],   # question_ids that already received a follow-up
        }
        active_sessions[session_id] = session
        _save_session(session_id)

        introduction = (
            f"Hello! I'm Alex, your AI interviewer today. "
            f"I'll ask you {total_questions} interview questions over the next "
            f"{interview_time_limit} minutes. "
            f"Please speak your answers clearly. Let's begin!"
        )

        return {
            "session_id": session_id,
            "status": "started",
            "message": f"Interview started for {req.candidate_info.name}",
            "first_question": first_question.get("question") if first_question else None,
            "total_questions": total_questions,
            "introduction": introduction,
            "time_limit_minutes": interview_time_limit,
            "remaining_time_minutes": interview_time_limit,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error starting interview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/interview/transcribe")
async def transcribe_audio(
    session_id: str,
    file: UploadFile = File(...),
    http_req: Request = None,
    _auth=Depends(verify_service_auth),
):
    try:
        session = _get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        if check_timer_expired(session):
            session["status"] = "completed"
            _save_session(session_id)
            raise HTTPException(status_code=410, detail="Interview time limit reached")

        if session.get("status") == "completed":
            raise HTTPException(status_code=400, detail="Interview already completed")

        # Read audio bytes
        audio_data = await file.read()

        # Determine file extension
        ext = ".webm"
        ct = file.content_type or ""
        if "wav" in ct:
            ext = ".wav"
        elif "mp4" in ct:
            ext = ".mp4"
        elif "ogg" in ct:
            ext = ".ogg"

        # Write to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        librosa_wav = None
        try:
            # Prefer direct upload for webm/ogg/mp4; convert only when input is wav.
            final_path = tmp_path
            if ext == ".wav":
                try:
                    y, _ = librosa.load(tmp_path, sr=16000, mono=True)
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as lf:
                        librosa_wav = lf.name
                    sf.write(librosa_wav, y, 16000)
                    final_path = librosa_wav
                except Exception as lb_err:
                    print(f"⚠️ WAV normalization failed: {lb_err}, using original wav")

            # Transcribe via Groq Whisper (offloaded to thread to avoid blocking event loop)
            transcript = await asyncio.to_thread(remote_whisper_client.transcribe_file, final_path)
            if transcript:
                transcript = clean_transcript(transcript)

            if not transcript or len(transcript.strip()) < 3:
                return {"session_id": session_id, "transcript": "", "status": "silence_detected"}

            return {"session_id": session_id, "transcript": transcript, "status": "success"}

        finally:
            for p in [tmp_path, librosa_wav]:
                if p and Path(p).exists():
                    try:
                        Path(p).unlink()
                    except Exception:
                        pass

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/interview/answer")
async def process_answer(response: QuestionResponse, background_tasks: BackgroundTasks, http_req: Request = None, _auth=Depends(verify_service_auth)):
    try:
        session = _get_session(response.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        if check_timer_expired(session):
            session["status"] = "completed"
            _save_session(response.session_id)
            raise HTTPException(status_code=410, detail="Interview time limit reached")

        if session.get("status") == "completed":
            raise HTTPException(status_code=400, detail="Interview already completed")

        pending_followup = session.get("pending_followup")

        # ── PATH A: answering a follow-up question ────────────────────────────
        if pending_followup:
            followup_eval = analyze_response_llm(
                answer=response.answer_text,
                question=pending_followup["question"],
                difficulty=session["current_difficulty"],
            )

            # Merge follow-up score into the original result (weighted average 40/60)
            original_idx = pending_followup["result_index"]
            original_result = session["results"][original_idx]
            original_score = original_result["score"]
            blended_score = round(original_score * 0.6 + followup_eval["score"] * 0.4)

            original_result["followup_question"] = pending_followup["question"]
            original_result["followup_answer"] = response.answer_text
            original_result["followup_score"] = followup_eval["score"]
            original_result["score"] = blended_score  # update stored score

            # Also update the pool entry
            for q in session["question_pool"]:
                if q.get("question") == original_result["question"]:
                    q["score"] = blended_score
                    break

            session["pending_followup"] = None
            _save_session(response.session_id)
            print(
                f"[Follow-up] Q{original_idx + 1}: original={original_score}, "
                f"followup={followup_eval['score']}, blended={blended_score}"
            )

            # Now decide next step exactly as the normal path below does
            evaluation = followup_eval
            evaluation["score"] = blended_score
            current_q = {"question": original_result["question"],
                         "passing_threshold": original_result.get("passing_threshold", 55)}
            is_followup_answer = True
        else:
            is_followup_answer = False

        # ── PATH B: answering a main question ────────────────────────────────
        if not is_followup_answer:
            current_q = session.get("current_question")
            if not current_q:
                raise HTTPException(status_code=400, detail="No active question")

            evaluation = analyze_response_llm(
                answer=response.answer_text,
                question=current_q["question"],
                difficulty=session["current_difficulty"],
            )

            result = {
                "question_id": session["current_question_num"],
                "question": current_q["question"],
                "answer": response.answer_text,
                "difficulty": session["current_difficulty"],
                "score": evaluation["score"],
                "feedback": evaluation["feedback"],
                "key_points_covered": evaluation.get("key_points_covered", []),
                "key_points_missed": evaluation.get("key_points_missed", []),
                "confidence": evaluation.get("confidence", "medium"),
                "passing_threshold": current_q.get("passing_threshold", 55),
                "timestamp": datetime.now().isoformat(),
            }
            session["results"].append(result)

            # Mark question as answered in pool
            for q in session["question_pool"]:
                if q.get("question") == current_q["question"]:
                    q["ans"] = response.answer_text
                    q["score"] = evaluation["score"]
                    break

            # ── Follow-up trigger logic ───────────────────────────────────────
            qid = session["current_question_num"]
            score = evaluation["score"]
            threshold = current_q.get("passing_threshold", 55)
            already_had_followup = qid in session.get("questions_with_followup", [])

            if score < threshold and not already_had_followup:
                missed = evaluation.get("key_points_missed", [])
                followup_q = generate_followup_question(
                    original_question=current_q["question"],
                    candidate_answer=response.answer_text,
                    key_points_missed=missed,
                )
                if followup_q:
                    session["pending_followup"] = {
                        "question": followup_q,
                        "result_index": len(session["results"]) - 1,
                        "original_score": score,
                    }
                    session.setdefault("questions_with_followup", []).append(qid)
                    _save_session(response.session_id)
                    print(f"[Follow-up] Triggered for Q{qid} (score={score} < threshold={threshold})")

                    return {
                        "session_id": response.session_id,
                        "status": "followup_required",
                        "evaluation": evaluation,
                        "feedback": evaluation["feedback"],
                        "key_points_covered": evaluation.get("key_points_covered", []),
                        "key_points_missed": missed,
                        "score": score,
                        "followup_question": followup_q,
                        "alex_response": followup_q,
                        "question_number": session["current_question_num"],
                        "total_questions": session["total_questions"],
                    }

        # ── SHARED: update difficulty + advance to next question ──────────────
        new_difficulty = update_difficulty(
            session["current_difficulty"],
            evaluation["score"],
            current_q.get("passing_threshold", 55),
        )
        session["current_difficulty"] = new_difficulty

        questions_answered = len(session["results"])

        # Persist after every answer
        _save_session(response.session_id)

        # Check completion
        if questions_answered >= session["total_questions"]:
            session["status"] = "completed"
            session["end_time"] = datetime.now().isoformat()

            quick_results = calculate_final_score(session["results"], expected_total_questions=session["total_questions"])
            avg_score = quick_results.get("final_score", 0)

            snapshot = {
                "session_id": response.session_id,
                "hireverse_interview_id": session.get("hireverse_interview_id"),
                "candidate_info": copy.deepcopy(session.get("candidate_info")),
                "position": session.get("position"),
                "start_time": session.get("start_time"),
                "end_time": session["end_time"],
                "total_questions": session.get("total_questions", 0),
                "results": copy.deepcopy(session.get("results", [])),
            }
            background_tasks.add_task(finalize_interview_background, snapshot)

            return {
                "session_id": response.session_id,
                "status": "interview_complete",
                "evaluation": evaluation,
                "score": avg_score,
                "final_score": avg_score,
                "next_question": None,
                "alex_response": f"Thank you! Your final score is {avg_score:.1f}/100. Great work!",
                "question_number": session["current_question_num"],
                "total_questions": session["total_questions"],
            }

        # Advance to next main question
        next_q = choose_next_question(session["question_pool"], difficulty=new_difficulty, session_id=response.session_id)
        if next_q:
            session["current_question"] = next_q
            session["current_question_num"] += 1
            _save_session(response.session_id)

        return {
            "session_id": response.session_id,
            "status": "question_processed",
            "evaluation": evaluation,
            "feedback": evaluation["feedback"],
            "key_points_covered": evaluation.get("key_points_covered", []),
            "key_points_missed": evaluation.get("key_points_missed", []),
            "score": evaluation["score"],
            "next_question": next_q,
            "alex_response": "Let me ask your next question." if next_q else "No more questions.",
            "question_number": session["current_question_num"],
            "total_questions": session["total_questions"],
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error processing answer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/interview/end")
async def end_interview(req: InterviewEndRequest, background_tasks: BackgroundTasks, http_req: Request = None, _auth=Depends(verify_service_auth)):
    try:
        session = _get_session(req.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        session["status"] = "completed"
        session["end_time"] = datetime.now().isoformat()
        _save_session(req.session_id)

        quick_results = calculate_final_score(
            session["results"],
            expected_total_questions=session.get("total_questions"),
        )

        snapshot = {
            "session_id": req.session_id,
            "hireverse_interview_id": session.get("hireverse_interview_id"),
            "candidate_info": copy.deepcopy(session.get("candidate_info")),
            "position": session.get("position"),
            "start_time": session.get("start_time"),
            "end_time": session["end_time"],
            "total_questions": session.get("total_questions", 0),
            "results": copy.deepcopy(session.get("results", [])),
        }
        background_tasks.add_task(finalize_interview_background, snapshot)

        return {
            "session_id": req.session_id,
            "status": "completed",
            "message": "Interview completed. Processing results in background.",
            "results": quick_results,
            "final_score": quick_results.get("final_score", 0),
            "questions_answered": len(session["results"]),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/interview/{session_id}/status")
async def get_interview_status(session_id: str, http_req: Request = None, _auth=Depends(verify_service_auth)):
    session = _get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if check_timer_expired(session):
        session["status"] = "completed"
        session["end_time"] = datetime.now().isoformat()
        _save_session(session_id)
        raise HTTPException(status_code=410, detail="Interview session expired (time limit reached)")

    results = session.get("results", [])
    avg_score = round(sum(r.get("score", 0) for r in results) / len(results), 1) if results else 0

    pending = session.get("pending_followup")
    return {
        "session_id": session_id,
        "status": session["status"],
        "current_question_num": session["current_question_num"],
        "total_questions": session["total_questions"],
        "current_question": session.get("current_question"),
        "pending_followup": pending["question"] if pending else None,
        "candidate_info": session["candidate_info"],
        "results_count": len(results),
        "final_score": avg_score,
        "remaining_time_minutes": get_remaining_minutes(session),
        "time_limit_minutes": session.get("time_limit_minutes", config.INTERVIEW_TIME_LIMIT_MINUTES),
    }


# ==================== EYE DETECTION ====================

@app.post("/api/eye-detection/frame")
async def process_eye_frame(req: EyeDetectionFrameRequest, _auth=Depends(verify_service_auth)):
    """Receive a base64 frame, run YOLOv8 Pose detection, return attention status."""
    try:
        img_data = req.frame_data
        if img_data.startswith("data:image"):
            img_data = img_data.split(",")[1]

        img_bytes = base64.b64decode(img_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {"session_id": req.session_id, "status": "error", "message": "Invalid frame"}

        yolo_result = await asyncio.to_thread(analyze_frame_yolo, img)
        attention_status = yolo_result["attention"]
        signals = yolo_result["signals"]
        person_count = yolo_result["person_count"]

        # Map signals to violation types
        _SIGNAL_TO_VIOLATION = {
            "multiple_people": "multiple_people_detected",
            "looking_down": "eyes_not_visible",
            "looking_left": "looking_away",
            "looking_right": "looking_away",
            "torso_turned": "torso_turned",
        }

        live_session = _get_session(req.session_id)
        if live_session:
            session_dir = Path("eye_logs") / f"session_{req.session_id}"
            session_dir.mkdir(parents=True, exist_ok=True)

            # Per-session lock guards two concurrent frame endpoints
            lock = _frame_locks.setdefault(req.session_id, asyncio.Lock())
            async with lock:
                frame_count = live_session.get("_frame_count", 0) + 1
                live_session["_frame_count"] = frame_count

            if frame_count % 5 == 0:
                frame_file = session_dir / f"frame_{frame_count:06d}.jpg"
                with open(frame_file, "wb") as f:
                    f.write(img_bytes)

            ts = req.timestamp or datetime.now().isoformat()
            new_violations = []
            for signal in signals:
                violation_type = _SIGNAL_TO_VIOLATION.get(signal, signal)
                new_violations.append({
                    "type": violation_type,
                    "timestamp": ts,
                    "frame": frame_count,
                })

            if new_violations:
                live_session.setdefault("violations", []).extend(new_violations)
                _save_session(req.session_id)

        return {
            "session_id": req.session_id,
            "status": "success",
            "attention_status": attention_status,
            "person_count": person_count,
            "signals": signals,
            "timestamp": req.timestamp or datetime.now().isoformat(),
        }

    except Exception as e:
        print(f"❌ Eye detection error: {e}")
        return {"session_id": req.session_id, "status": "error", "message": str(e)}


# ==================== VIOLATION LOGGING ====================

@app.post("/api/violations/log")
@app.post("/api/violation/log")
async def log_violation(req: ViolationLogRequest, _auth=Depends(verify_service_auth)):
    violation_data = {
        "session_id": req.sessionId,
        "candidate_email": req.candidateEmail,
        "type": req.type,
        "timestamp": req.timestamp,
        "duration": req.duration,
        "details": req.details,
        "logged_at": datetime.now().isoformat(),
    }

    # Save to file (atomic write with per-session lock)
    violations_dir = Path(__file__).parent / "violations"
    violations_dir.mkdir(exist_ok=True)
    vfile = violations_dir / f"session_{req.sessionId}_violations.json"

    lock = _violation_locks.setdefault(req.sessionId, threading.Lock())
    with lock:
        existing = []
        if vfile.exists():
            try:
                existing = json.loads(vfile.read_text())
            except Exception:
                pass
        existing.append(violation_data)
        tmp_path = vfile.with_suffix(".tmp")
        tmp_path.write_text(json.dumps(existing, indent=2))
        os.replace(tmp_path, vfile)

    # Mirror in memory / persisted session
    live_session = _get_session(req.sessionId)
    if live_session:
        live_session.setdefault("violations", []).append(violation_data)

    return {"status": "success", "count": len(existing)}


# ==================== FRAME CAPTURE (simple) ====================

@app.post("/api/frames/capture")
async def capture_frame(req: dict, _auth=Depends(verify_service_auth)):
    session_id = req.get("session_id")
    frame_data = req.get("frame_data", "")
    if not session_id or not frame_data:
        return {"status": "error", "message": "Missing session_id or frame_data"}

    try:
        if frame_data.startswith("data:image"):
            frame_data = frame_data.split(",")[1]
        frame_bytes = base64.b64decode(frame_data)

        session_dir = Path("eye_logs") / f"session_{session_id}"
        session_dir.mkdir(parents=True, exist_ok=True)

        # Use in-memory counter with per-session lock to avoid races
        live_session = _get_session(session_id)
        if live_session:
            lock = _frame_locks.setdefault(session_id, asyncio.Lock())
            async with lock:
                frame_count = live_session.get("_frame_count", 0) + 1
                live_session["_frame_count"] = frame_count
        else:
            # Fallback for sessions not yet in memory (rare edge case)
            counter_file = session_dir / "frame_counter.txt"
            count = int(counter_file.read_text()) + 1 if counter_file.exists() else 1
            counter_file.write_text(str(count))
            frame_count = count

        frame_file = session_dir / f"frame_{frame_count:06d}.jpg"
        frame_file.write_bytes(frame_bytes)

        return {"status": "success", "frame_number": frame_count}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ==================== RUN ====================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
