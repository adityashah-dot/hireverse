"""
utils.py — Answer evaluation using Groq LLM (replaces Ollama)
"""
import re
import json
import os
from typing import Optional

try:
    from groq import Groq
    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
except ImportError:
    groq_client = None

# Difficulty distribution by experience level
_DIFFICULTY_MAP = {
    "ENTRY":     {"easy": 4, "medium": 3, "hard": 1},
    "JUNIOR":    {"easy": 3, "medium": 3, "hard": 2},
    "MID":       {"easy": 2, "medium": 4, "hard": 2},
    "SENIOR":    {"easy": 1, "medium": 3, "hard": 4},
    "LEAD":      {"easy": 0, "medium": 2, "hard": 6},
    "EXECUTIVE": {"easy": 0, "medium": 2, "hard": 6},
}

# Passing thresholds per difficulty
_PASSING_THRESHOLDS = {"easy": 65, "medium": 55, "hard": 50}


def generate_questions_from_jd(
    position: str,
    interview_type: str = "Technical Interview",
    candidate_skills: Optional[list] = None,
    required_skills: Optional[list] = None,
    experience_level: str = "MID",
    candidate_experience_years: Optional[int] = None,
    question_count: int = 8,
) -> Optional[list]:
    """
    Generate interview questions tailored to the role, candidate profile, and difficulty level.

    When candidate_skills and required_skills are provided the questions focus on:
      - 40% strong skills (verify depth)
      - 40% weak/missing skills (probe gaps)
      - 20% situational / behavioural
    """
    if groq_client is None:
        return None

    # Clamp question_count to a sane range
    question_count = max(5, min(15, question_count))

    # Build difficulty distribution
    level_key = experience_level.upper() if experience_level else "MID"
    dist = _DIFFICULTY_MAP.get(level_key, _DIFFICULTY_MAP["MID"])

    # Scale distribution to requested question_count
    total_mapped = sum(dist.values())  # always 8 in the map above
    easy_n  = round(dist["easy"]  / total_mapped * question_count)
    hard_n  = round(dist["hard"]  / total_mapped * question_count)
    medium_n = max(0, question_count - easy_n - hard_n)

    difficulty_spec = (
        f"- {easy_n} EASY questions (passing threshold 65)\n"
        f"- {medium_n} MEDIUM questions (passing threshold 55)\n"
        f"- {hard_n} HARD questions (passing threshold 50)"
    )

    # Build candidate-aware skill context
    skill_context = ""
    if candidate_skills or required_skills:
        cand_set = set(s.lower() for s in (candidate_skills or []))
        req_set  = set(s.lower() for s in (required_skills or []))
        strong   = sorted(cand_set & req_set)
        weak     = sorted(req_set - cand_set)

        parts = []
        if strong:
            parts.append(
                f"Candidate's STRONG skills (they claim these — probe depth): {', '.join(strong)}.\n"
                f"  → ~40% of questions should challenge their depth on these."
            )
        if weak:
            parts.append(
                f"Candidate's WEAK/MISSING skills (job requires these): {', '.join(weak)}.\n"
                f"  → ~40% of questions should assess baseline knowledge of these."
            )
        if parts:
            parts.append("  → Remaining ~20% should be situational or behavioural.")
        if candidate_experience_years:
            parts.append(f"Candidate has approximately {candidate_experience_years} years of experience.")
        skill_context = "\nCandidate profile:\n" + "\n".join(parts)
    elif required_skills:
        skill_context = f"\nFocus areas: {', '.join(required_skills)}"

    # Interview-type guidance
    type_guidance = {
        "System Design": (
            "Focus heavily on architecture, scalability, data consistency, and design trade-offs. "
            "Include at least 2 questions that require the candidate to design a system component from scratch."
        ),
        "Culture Fit": (
            "Use situational and behavioural questions (STAR format). "
            "Focus on teamwork, conflict resolution, ownership, and adaptability."
        ),
        "Behavioral": (
            "Use situational and behavioural questions (STAR format). "
            "Focus on past experiences, decision-making, and leadership."
        ),
    }
    interview_guidance = next(
        (v for k, v in type_guidance.items() if k.lower() in (interview_type or "").lower()),
        f"Focus on deep technical concepts, practical problem-solving, and domain knowledge relevant to {position}."
    )

    prompt = f"""You are an expert technical interviewer hiring for: {position}.
Interview type: {interview_type}.
Experience level: {experience_level}.
{skill_context}

Interview focus: {interview_guidance}

Generate exactly {question_count} distinct interview questions with this difficulty distribution:
{difficulty_spec}

Rules:
- Questions must be tailored to this specific role and candidate profile — no generic questions.
- Each question must be clearly worded and unambiguous.
- EASY: definitions, fundamentals, basic concepts.
- MEDIUM: practical application, debugging, real-world scenarios.
- HARD: system design, architecture, advanced problem-solving, edge cases.
- No duplicate topics across questions.
- Behavioral/situational questions should be counted as EASY unless stated otherwise.

Output EXCLUSIVELY a valid JSON array — no markdown, no explanation outside JSON:
[
  {{
    "question": "<question text>",
    "difficulty": "<easy|medium|hard>",
    "passing_threshold": <65|55|50>,
    "topic": "<skill or topic being tested>"
  }}
]
Include exactly {question_count} objects."""

    for attempt in range(3):
        try:
            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=2500,
            )
            content = response.choices[0].message.content.strip()

            if content.startswith("```"):
                content = re.sub(r"^```(?:json)?\s*", "", content)
                content = re.sub(r"\s*```$", "", content)

            questions = json.loads(content)
            if not isinstance(questions, list) or len(questions) < 1:
                continue

            # Normalise and validate each question
            valid = []
            for q in questions:
                if not q.get("question") or len(q["question"].strip()) < 10:
                    continue
                diff = q.get("difficulty", "medium").lower()
                if diff not in ("easy", "medium", "hard"):
                    diff = "medium"
                valid.append({
                    "question": q["question"].strip(),
                    "difficulty": diff,
                    "passing_threshold": _PASSING_THRESHOLDS.get(diff, 55),
                    "topic": q.get("topic", ""),
                    "ans": "",
                    "score": "",
                    "feedback": "",
                })

            if valid:
                print(
                    f"✅ Generated {len(valid)} questions "
                    f"(easy={sum(1 for q in valid if q['difficulty']=='easy')}, "
                    f"medium={sum(1 for q in valid if q['difficulty']=='medium')}, "
                    f"hard={sum(1 for q in valid if q['difficulty']=='hard')})"
                )
                return valid[:question_count]

        except Exception as e:
            print(f"❌ Failed to generate questions (attempt {attempt+1}): {e}")

    return None


def generate_followup_question(
    original_question: str,
    candidate_answer: str,
    key_points_missed: list,
) -> Optional[str]:
    """
    Generate a single targeted follow-up question when the candidate's answer was weak.
    Returns the follow-up question string, or None if generation fails.
    """
    if groq_client is None:
        return None

    missed_str = (
        f"Key concepts the candidate missed: {', '.join(key_points_missed)}."
        if key_points_missed
        else "The candidate's answer lacked depth or was vague."
    )

    prompt = f"""You are a technical interviewer. The candidate gave a weak answer to a question.
Your job is to generate ONE short, specific follow-up question to give them a chance to clarify or demonstrate understanding of the concept they missed.

Original question: {original_question}
Candidate's answer: {candidate_answer}
{missed_str}

Rules:
- The follow-up must be ≤ 25 words.
- It must probe specifically what was missed — not repeat the original question.
- It should be a genuine clarifying probe, not a trick question.
- Do NOT include any preamble — output only the question text.

Output only the follow-up question, nothing else."""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=80,
        )
        followup = response.choices[0].message.content.strip().strip('"').strip("'")
        # Sanity check — must look like a question and be short enough
        if followup and len(followup) > 10 and len(followup.split()) <= 40:
            return followup
    except Exception as e:
        print(f"⚠️ Follow-up generation failed: {e}")

    return None


def analyze_response_llm(answer: str, question: str, difficulty: str = "medium") -> dict:
    """Evaluate candidate's answer using Groq LLM. Returns structured evaluation."""
    if not answer or len(answer.strip()) < 10:
        return {
            "score": 0,
            "feedback": "Answer too short or empty. No score awarded.",
            "key_points_covered": [],
            "key_points_missed": [],
            "confidence": "high",
        }

    rubric = {
        "easy": (
            "EASY question rubric:\n"
            "90-100: Complete, accurate, clear explanation with correct terminology.\n"
            "70-89:  Mostly correct, minor gaps or imprecise wording.\n"
            "50-69:  Partially correct — understands basics but misses key details.\n"
            "30-49:  Significant gaps or fundamental misunderstandings.\n"
            "0-29:   Wrong, off-topic, or pure buzzwords with no substance.\n"
            "Passing threshold: 65."
        ),
        "medium": (
            "MEDIUM question rubric:\n"
            "90-100: Deep practical understanding, concrete examples, trade-offs discussed.\n"
            "70-89:  Good understanding, some examples, minor gaps in depth.\n"
            "50-69:  Basic understanding, vague on implementation details.\n"
            "30-49:  Surface-level or buzzword-heavy answer without real depth.\n"
            "0-29:   Wrong, off-topic, or no meaningful technical content.\n"
            "Passing threshold: 55."
        ),
        "hard": (
            "HARD question rubric:\n"
            "90-100: Architectural/systems thinking, edge cases addressed, real trade-offs, scalability.\n"
            "70-89:  Strong answer with good depth, minor gaps in edge cases or alternatives.\n"
            "50-69:  Reasonable approach but misses architectural nuance or scalability.\n"
            "30-49:  Generic or incomplete — describes WHAT but not HOW or WHY.\n"
            "0-29:   Wrong direction, off-topic, or no depth whatsoever.\n"
            "Passing threshold: 50."
        ),
    }

    prompt = f"""You are a senior technical interviewer evaluating a candidate's verbal answer.

{rubric.get(difficulty.lower(), rubric['medium'])}

PENALTY RULES (apply strictly):
- Answer consists only of buzzwords with no explanation → max score 25
- Answer contradicts itself → max score 35
- Answer is clearly off-topic → max score 10
- Answer repeats the question back → max score 15

Question: {question}

Candidate's Answer: {answer}

Evaluate objectively. Identify the 2-4 key points this question is testing, then judge which ones the candidate covered.

Return ONLY valid JSON — no markdown, no text outside JSON:
{{
  "score": <integer 0-100>,
  "feedback": "<2-3 sentence professional feedback explaining the score>",
  "key_points_covered": ["<point>", ...],
  "key_points_missed": ["<point>", ...],
  "confidence": "<high|medium|low>"
}}"""

    for attempt in range(1, 3):
        try:
            if groq_client is None:
                raise RuntimeError("Groq client not initialized — check GROQ_API_KEY")

            response = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=600,
            )
            content = response.choices[0].message.content.strip()

            # Strip markdown code fences if LLM adds them
            if content.startswith("```"):
                content = re.sub(r"^```(?:json)?\s*", "", content)
                content = re.sub(r"\s*```$", "", content)

            try:
                obj = json.loads(content)
                score = int(obj.get("score", 0))
                feedback = str(obj.get("feedback", "")).strip()
                if 0 <= score <= 100 and feedback:
                    return {
                        "score": score,
                        "feedback": feedback,
                        "key_points_covered": obj.get("key_points_covered", []),
                        "key_points_missed": obj.get("key_points_missed", []),
                        "confidence": obj.get("confidence", "medium"),
                        "attempts": attempt,
                    }
            except Exception:
                pass

            # Fallback regex — last resort
            score_match = re.search(r'"score"\s*:\s*(\d+)', content)
            feedback_match = re.search(r'"feedback"\s*:\s*"([^"]+)"', content)
            if score_match and feedback_match:
                score_val = int(score_match.group(1))
                if 0 <= score_val <= 100:
                    return {
                        "score": score_val,
                        "feedback": feedback_match.group(1),
                        "key_points_covered": [],
                        "key_points_missed": [],
                        "confidence": "low",
                        "attempts": attempt,
                    }

        except Exception as e:
            print(f"❌ LLM Evaluation Error (attempt {attempt}): {e}")
            continue

    return {
        "score": 0,
        "feedback": "Answer could not be evaluated. No score awarded.",
        "key_points_covered": [],
        "key_points_missed": [],
        "confidence": "low",
        "attempts": 2,
    }


def update_difficulty(current: str, score: int, passing_threshold: int) -> str:
    """Adjust difficulty based on score vs threshold."""
    levels = ["easy", "medium", "hard"]
    idx = levels.index(current) if current in levels else 0
    if score >= passing_threshold + 25 and idx == 0:
        return "hard"
    elif score >= passing_threshold + 10 and idx < 2:
        return levels[idx + 1]
    elif score < passing_threshold - 5 and idx > 0:
        return levels[idx - 1]
    return current


def calculate_final_score(questions: list, expected_total_questions: int = None) -> dict:
    """Calculate weighted final score with per-difficulty breakdown and hire recommendation."""
    difficulty_weights = {"easy": 1.0, "medium": 1.5, "hard": 2.0}

    total_weighted_score = 0.0
    total_weight = 0.0
    passed_questions = 0
    answered_questions = 0

    # Per-difficulty tracking
    by_difficulty: dict = {
        "easy":   {"scores": [], "passed": 0},
        "medium": {"scores": [], "passed": 0},
        "hard":   {"scores": [], "passed": 0},
    }

    for q in questions:
        if q.get("score") is not None and q.get("score") != "":
            score = int(q["score"])
            diff = q.get("difficulty", "medium").lower()
            weight = difficulty_weights.get(diff, 1.5)
            threshold = q.get("passing_threshold", 50)

            total_weighted_score += score * weight
            total_weight += weight
            answered_questions += 1

            bucket = by_difficulty.get(diff, by_difficulty["medium"])
            bucket["scores"].append(score)
            if score >= threshold:
                passed_questions += 1
                bucket["passed"] += 1

    # Use actual answered count when expected not specified
    effective_total = expected_total_questions if expected_total_questions is not None else answered_questions

    # Penalise unanswered questions as 0-weight medium slots
    unanswered = max(0, effective_total - answered_questions)
    if unanswered > 0:
        total_weight += difficulty_weights["medium"] * unanswered

    if total_weight == 0:
        return {
            "final_score": 0,
            "pass_rate": 0,
            "overall_status": "No answers evaluated",
            "recommendation": "Insufficient data",
            "questions_answered": 0,
            "questions_passed": 0,
            "total_questions": effective_total,
            "by_difficulty": {},
        }

    final_score = round(total_weighted_score / total_weight, 1)
    pass_rate = round((passed_questions / effective_total) * 100, 1) if effective_total > 0 else 0

    # Build per-difficulty summary
    difficulty_summary = {}
    for level, data in by_difficulty.items():
        if data["scores"]:
            difficulty_summary[level] = {
                "avg_score": round(sum(data["scores"]) / len(data["scores"]), 1),
                "count": len(data["scores"]),
                "passed": data["passed"],
            }

    if pass_rate >= 80:
        overall_status = "Excellent"
        recommendation = "Strong hire — proceed to offer"
    elif pass_rate >= 60:
        overall_status = "Good"
        recommendation = "Proceed to next round"
    elif pass_rate >= 40:
        overall_status = "Fair"
        recommendation = "Consider with reservations — additional assessment recommended"
    else:
        overall_status = "Needs Improvement"
        recommendation = "Not recommended at this time"

    return {
        "final_score": final_score,
        "pass_rate": pass_rate,
        "overall_status": overall_status,
        "recommendation": recommendation,
        "questions_answered": answered_questions,
        "questions_passed": passed_questions,
        "total_questions": effective_total,
        "by_difficulty": difficulty_summary,
    }
