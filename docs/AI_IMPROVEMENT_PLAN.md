# HireVerse — AI Services Improvement Plan

> **Scope:** Python `ai-interview-service` (FastAPI) + Next.js `lib/ai/` layer  
> **Goal:** Make every AI interaction smarter, faster, and more reliable

---

## Current State: What's Actually Broken or Weak

### Python Interview Service
| Problem | Where | Impact |
|---------|-------|--------|
| Questions ignore candidate's resume/skills — always generic | `utils.py:generate_questions_from_jd` | Wrong questions for the person |
| All dynamic questions are locked to `medium` difficulty | `utils.py:generate_questions_from_jd` line 27 | No adaptive pressure |
| Evaluator prompt has no rubric — LLM just guesses scoring | `utils.py:analyze_response_llm` | Inconsistent scores, 40/100 vs 41/100 mean the same |
| Score calculation uses hardcoded `expected_total_questions=5` | `utils.py:calculate_final_score` | Wrong pass_rate when interviewer sets 8 or 10 questions |
| Sessions stored in a Python dict — lost on every restart | `main.py:active_sessions` | Resume a crashed interview = impossible |
| Eye detection uses Haar Cascade (2003 algorithm) | `main.py:_estimate_attention_from_frames` | ~60% false-positive rate, useless in low light, no torso/multi-person detection |
| No follow-up logic — bad answers get next unrelated question | `main.py:process_answer` | Candidate can bluff and move on |
| Feedback truncated to 250 chars before sending | `main.py` line 719 | Candidate never sees full evaluation |
| `allow_origins=["*"]` CORS in production code | `main.py` line 344 | Security risk |
| Files saved to local disk (`results/`, `eye_logs/`, `violations/`) | multiple places | Data lost on container restart, can't scale |

### Next.js AI Layer
| Problem | Where | Impact |
|---------|-------|--------|
| `generate-questions.ts` uses Groq (Llama) not OpenAI GPT-4 despite CLAUDE.md saying GPT-4 | `generate-questions.ts` line 3 | Weaker question quality than advertised |
| `match-skills.ts` has no score validation schema — crashes on malformed AI response | `match-skills.ts` line 56 | Silent failures in candidate pipeline |
| Resume parse has no retry — one Groq timeout = broken candidate | `parse-resume.ts` | Flaky resume processing |
| `matchSkills` truncates resume to 3000 chars — misses recent roles | `match-skills.ts` line 39 | Misses skills in longer resumes |
| No caching on skill match — re-runs same Groq call on every page refresh | `process-resume.ts` | Wastes ~$0.001 per refresh, slow |

---

## Improvement Plan — Prioritized

---

### PHASE 1 — Fix the Scoring & Evaluation Core
**Why first:** This is the heart of the product. Wrong scores break recruiter trust immediately.

#### 1A. Rubric-based answer evaluation (`utils.py`)

**Current prompt:** "Evaluate the candidate's response." — vague, inconsistent.

**New prompt adds:**
- Explicit scoring rubric per difficulty (what a 90 vs 70 vs 40 answer looks like)
- Structured output: `score`, `feedback`, `key_points_covered`, `key_points_missed`
- Penalization rules: pure buzzwords = max 30, contradictions = max 40
- Temperature drop from 0.3 → 0.1 for evaluation (less creative, more consistent)

**Expected output shape:**
```json
{
  "score": 72,
  "feedback": "Good understanding of CAP theorem basics...",
  "key_points_covered": ["availability vs consistency tradeoff", "network partition"],
  "key_points_missed": ["real-world example", "eventual consistency patterns"],
  "confidence": "high"
}
```

#### 1B. Fix `calculate_final_score` hardcoded question count (`utils.py`)

Change signature:
```python
# Before
def calculate_final_score(questions: list, expected_total_questions: int = 5)

# After  
def calculate_final_score(questions: list, expected_total_questions: int = None)
# If None, use len(questions) — no penalty for unanswered
```

Also add per-difficulty breakdown to output:
```json
{
  "final_score": 74.2,
  "pass_rate": 60.0,
  "overall_status": "Good",
  "by_difficulty": {
    "easy": {"avg": 85, "count": 2},
    "medium": {"avg": 68, "count": 2},
    "hard": {"avg": 55, "count": 1}
  },
  "recommendation": "Proceed to next round"
}
```

---

### PHASE 2 — Candidate-Aware Question Generation
**Why second:** Questions tailored to the person = dramatically better signal.

#### 2A. Feed resume context into interview questions (`utils.py`)

The HireVerse `pregenerate` endpoint already receives `position` and `interview_type`. Extend the `PregenerateQuestionsRequest` model and `generate_questions_from_jd` function to accept:
- `candidate_skills: list[str]` — from parsed resume
- `candidate_experience_years: int`
- `required_skills: list[str]` — from the job posting
- `experience_level: str` — ENTRY/MID/SENIOR/LEAD

**New question generation logic:**
```
strong_skills = intersection(candidate_skills, required_skills)
weak_skills = required_skills - candidate_skills
→ 40% questions on strong_skills (verify depth)
→ 40% questions on weak_skills (probe gaps)
→ 20% situational/behavioral
```

#### 2B. Fix difficulty distribution in dynamic generation (`utils.py`)

Current: all 5 generated questions are hardcoded `"difficulty": "medium"`.

New: pass difficulty distribution from experience level:
```python
DIFFICULTY_MAP = {
    "ENTRY": {"easy": 3, "medium": 2, "hard": 0},
    "MID":   {"easy": 1, "medium": 3, "hard": 1},
    "SENIOR":{"easy": 0, "medium": 2, "hard": 3},
    "LEAD":  {"easy": 0, "medium": 1, "hard": 4},
}
```
And explicitly request this in the Groq prompt.

#### 2C. Increase question count for better coverage

- Default: 5 → **8 questions** (gives more signal, still fits 30-min window)
- Recruiter-configurable: 5–15 range
- Pool size: generate 10, pick best 8 by diversity check (avoid same topic twice)

---

### PHASE 3 — Follow-up Questions (Adaptive Interview)
**Why third:** This is the biggest quality jump — it feels like a real interview.

#### 3A. One follow-up per weak answer (`main.py`)

After evaluating an answer where `score < passing_threshold`:
- Generate a targeted follow-up using the same Groq call
- Prompt: "The candidate answered poorly on X. Generate one specific follow-up question that probes whether they understand the core concept, in ≤ 20 words."
- Cap: max 1 follow-up per question (don't harass)
- Follow-ups don't count toward the total question count

New session state key: `"pending_followup": Optional[dict]`

Response when follow-up triggered:
```json
{
  "status": "followup_required",
  "followup_question": "Can you explain what you mean by 'eventual consistency'?",
  "original_score": 28,
  "message": "Let me ask a follow-up on that."
}
```

---

### PHASE 4 — Session Persistence
**Why fourth:** Data loss on restart is a P0 bug disguised as a feature gap.

#### 4A. Replace in-memory dict with file-based sessions (`main.py`)

Simple approach — no new dependencies:
```python
SESSION_DIR = Path(__file__).parent / "sessions"

def save_session(session_id: str, data: dict):
    (SESSION_DIR / f"{session_id}.json").write_text(json.dumps(data, default=str))

def load_session(session_id: str) -> dict | None:
    p = SESSION_DIR / f"{session_id}.json"
    return json.loads(p.read_text()) if p.exists() else None
```

- Write on every state change (start, answer, end)
- Load on session lookup if not in memory
- Cleanup: delete files older than 24h in the cleanup thread
- Zero new dependencies, works in Docker

---

### PHASE 5 — Eye + Torso Detection with YOLOv8 Pose
**Why fifth:** Haar Cascade has ~40% false-positive rate and can't detect torso orientation or multiple people. YOLOv8 Pose solves all of this in one model.

#### What YOLOv8 Pose gives us

YOLOv8 Pose (`yolov8n-pose.pt` — 6MB nano model) detects **17 body keypoints per person** in a single forward pass:

```
0: nose        1: left_eye     2: right_eye
3: left_ear    4: right_ear
5: left_shoulder  6: right_shoulder
7: left_elbow     8: right_elbow
9: left_wrist    10: right_wrist
11: left_hip     12: right_hip
...
```

| Proctoring Signal | Haar Cascade | YOLOv8 Pose |
|-------------------|-------------|-------------|
| Face present | ~60% accurate | ~97% accurate |
| Eyes visible | ~55% accurate | ~95% accurate (kp 1, 2) |
| Looking left/right | No | Yes — via left_ear/right_ear visibility ratio |
| Looking down (phone/notes) | No | Yes — nose y drops below eye midpoint |
| Torso turned away | No | Yes — shoulder keypoints 5,6 angle |
| Second person in frame | No | Yes — YOLO detects multiple people |
| Works in low light | No | Yes |
| CPU speed | Fast | ~25ms/frame on nano model |

#### 5A. Replace `_estimate_attention_from_frames` with YOLO Pose (`main.py`)

```python
from ultralytics import YOLO

_yolo_model = None

def get_yolo_model():
    global _yolo_model
    if _yolo_model is None:
        _yolo_model = YOLO("yolov8n-pose.pt")  # auto-downloads on first use
    return _yolo_model


def analyze_frame_yolo(img_bgr) -> dict:
    model = get_yolo_model()
    results = model(img_bgr, verbose=False)[0]

    if results.keypoints is None or len(results.keypoints.xy) == 0:
        return {"attention": "no_face", "person_count": 0, "signals": []}

    person_count = len(results.keypoints.xy)
    signals = []

    if person_count > 1:
        signals.append("multiple_people")

    # Analyse first (closest/largest) person
    kp = results.keypoints.xy[0]   # shape (17, 2) — x,y per keypoint
    conf = results.keypoints.conf[0]  # shape (17,) — confidence per keypoint

    nose, l_eye, r_eye = kp[0], kp[1], kp[2]
    l_ear, r_ear = kp[3], kp[4]
    l_shoulder, r_shoulder = kp[5], kp[6]

    # Eyes not visible → looking down
    eyes_visible = conf[1] > 0.4 and conf[2] > 0.4
    if not eyes_visible:
        signals.append("looking_down")

    # Head turned — one ear disappears
    l_ear_vis, r_ear_vis = conf[3] > 0.4, conf[4] > 0.4
    if l_ear_vis and not r_ear_vis:
        signals.append("looking_right")
    elif r_ear_vis and not l_ear_vis:
        signals.append("looking_left")

    # Torso turned — shoulders not level (one much further than other)
    if conf[5] > 0.4 and conf[6] > 0.4:
        shoulder_angle = abs(float(l_shoulder[1]) - float(r_shoulder[1]))
        if shoulder_angle > 40:  # px difference threshold
            signals.append("torso_turned")

    attention = "attentive" if not signals else (
        "no_face" if "no_face" in signals else "suspicious"
    )

    return {
        "attention": attention,
        "person_count": person_count,
        "signals": signals,
    }
```

#### 5B. Use YOLO in real-time frame endpoint (`main.py`)

Replace the Haar Cascade block in `/api/eye-detection/frame` with `analyze_frame_yolo(img)`.

Map signals to violation types stored in session:
- `multiple_people` → violation type `"multiple_people_detected"`
- `looking_down` → violation type `"eyes_not_visible"`
- `looking_left` / `looking_right` → violation type `"looking_away"`
- `torso_turned` → violation type `"torso_turned"`

#### 5C. Update post-session attention score

Replace `_estimate_attention_from_frames` (which just counts face detections) with a YOLO-based pass that counts frames with no violations vs total frames sampled.

#### Installation

```
pip install ultralytics
```

Model downloads automatically on first `YOLO("yolov8n-pose.pt")` call (~6MB). No manual download needed.

Add to `requirements.txt`: `ultralytics>=8.0.0`  
Remove from `requirements.txt`: `opencv-python` can stay (YOLO uses it internally)

---

### PHASE 6 — Next.js AI Layer Fixes

#### 6A. Add retry to resume parsing (`parse-resume.ts`)

```typescript
// Retry up to 2 times with 1s delay on Groq timeout
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    const response = await groq.chat.completions.create(...)
    ...
    return result.data
  } catch (err) {
    if (attempt === 3) throw err
    await new Promise(r => setTimeout(r, 1000 * attempt))
  }
}
```

#### 6B. Fix `matchSkills` resume truncation (`match-skills.ts`)

- Increase from 3000 → 6000 chars (Groq context window supports it)
- Add Zod validation to output (same pattern as parse-resume fix)
- Cache result in Redis for 1 hour keyed by `candidateId:jobId` — avoid re-running on every refresh

#### 6C. Switch `generate-questions.ts` to OpenAI GPT-4o-mini

Currently uses `Groq` SDK despite the file comment saying GPT-4. Fix:
```typescript
import OpenAI from 'openai'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
// model: 'gpt-4o-mini'  — better MCQ quality, cheaper than gpt-4
```

GPT-4o-mini produces significantly better MCQ distractors than Llama 3.3.

#### 6D. Add structured output validation to `generate-questions.ts`

Replace the loose `.filter()` at the end with a Zod schema:
```typescript
const QuestionSchema = z.object({
  text: z.string().min(10),
  options: z.array(z.string()).length(4),
  correctAnswer: z.number().int().min(0).max(3),
  explanation: z.string().min(10),
  category: z.string(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
})
```

---

### PHASE 7 — Structured Interview Report

#### 7A. Rich webhook payload to HireVerse (`main.py`)

Current webhook sends raw results array. New payload adds:
```json
{
  "session_id": "...",
  "hireverse_interview_id": "...",
  "candidate_info": {...},
  "final_results": {
    "final_score": 74.2,
    "overall_status": "Good",
    "recommendation": "Proceed to next round",
    "by_difficulty": {...},
    "strengths": ["System design thinking", "Debugging approach"],
    "areas_for_improvement": ["Database indexing depth", "Concurrency patterns"]
  },
  "question_breakdown": [
    {
      "question": "...",
      "answer": "...",
      "score": 72,
      "key_points_covered": [...],
      "key_points_missed": [...]
    }
  ],
  "proctoring": {
    "attention_score": 94.2,
    "violations": [...],
    "gaze_analysis": {...}
  }
}
```

#### 7B. Store interview results in HireVerse database (`app/api/ai-interview/complete/route.ts`)

The webhook handler currently exists but check if it actually saves to Prisma. It should:
- Update the `Interview` record with `score`, `feedback`, `status: 'COMPLETED'`
- Update the `Candidate` record stage to `OFFER` if score >= threshold, else stay `INTERVIEW`
- Trigger the `assessment-completed` email job

---

## Implementation Order

```
Week 1:  Phase 1 (scoring core)     → immediate quality improvement
Week 1:  Phase 6A + 6B + 6D         → Next.js reliability fixes
Week 2:  Phase 2 (candidate-aware)  → biggest recruiter value
Week 2:  Phase 4 (persistence)      → reliability fix
Week 3:  Phase 3 (follow-ups)       → wow factor
Week 3:  Phase 7 (report)           → completes the pipeline
Week 4:  Phase 5 (YOLOv8 Pose)      → polish, needs testing on real webcam frames
Week 4:  Phase 6C (GPT-4o-mini)     → quality upgrade, needs API budget check
```

---

## Quick Wins (< 1 hour each, do these first)

1. **Fix hardcoded `expected_total_questions=5`** in `calculate_final_score` — 5 min
2. **Remove feedback truncation** on line 719 of `main.py` — 1 min  
3. **Fix CORS to not be `*`** — add `ALLOWED_ORIGINS` env var — 10 min
4. **Increase resume truncation** from 3000 → 6000 chars in `match-skills.ts` — 1 min
5. **Add Zod to `matchSkills` output** so it doesn't silently return garbage — 15 min
6. **Set `temperature=0.1`** in `analyze_response_llm` for consistent scoring — 1 min

---

## Files That Will Change

| File | Changes |
|------|---------|
| `ai-interview-service/utils.py` | Rubric eval, candidate-aware generation, difficulty fix, score fix |
| `ai-interview-service/main.py` | Follow-up logic, file-based sessions, CORS fix, richer webhook |
| `ai-interview-service/question_engine.py` | Diversity filter, larger pool |
| `ai-interview-service/config.py` | New env vars, updated defaults |
| `ai-interview-service/requirements.txt` | Replace Haar Cascade usage, add `ultralytics` |
| `lib/ai/parse-resume.ts` | Retry logic |
| `lib/ai/match-skills.ts` | Zod validation, 6000 char limit, caching |
| `lib/ai/generate-questions.ts` | Switch to OpenAI, Zod validation |

---

> **Say "start phase 1"** to begin implementing, or name a specific phase/fix.
