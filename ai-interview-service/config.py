# config.py — AI Interview Service (HireVerse integration)
import os

# Groq API (replaces Ollama + remote Whisper)
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_LLM_MODEL = "llama-3.3-70b-versatile"    # For answer evaluation
GROQ_WHISPER_MODEL = "whisper-large-v3"        # For speech-to-text

# Interview settings
NUM_QUESTIONS = 8                  # default question count (5-15 recruiter-configurable)
INTERVIEW_TIME_LIMIT_MINUTES = 30

# TTS: browser-side Web Speech API is used instead of server TTS
# (no TTS dependency in Python service)

# Question pool file path
QUESTION_POOL_PATH = os.path.join(os.path.dirname(__file__), "questions", "question_pool.json")

# HireVerse webhook — Python calls this when interview completes
HIREVERSE_WEBHOOK_URL = os.environ.get("HIREVERSE_WEBHOOK_URL", "http://localhost:3000/api/ai-interview/complete")
HIREVERSE_WEBHOOK_SECRET = os.environ.get("HIREVERSE_WEBHOOK_SECRET", "ai-interview-secret")

# CORS — comma-separated list of allowed origins
# e.g. "http://localhost:3000,https://hireverse.yourdomain.com"
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")

# Minimum word count to consider answer non-empty
MIN_GOOD_ANSWER_WORDS = 10

# Session settings
SESSION_EXPIRY_HOURS = 24
CLEANUP_INTERVAL_SECONDS = 30

# Interview pass threshold (pass_rate >= this → candidate advances to OFFER)
# Must stay in sync with PASS_THRESHOLD in app/api/ai-interview/complete/route.ts
AI_INTERVIEW_PASS_THRESHOLD = int(os.environ.get("AI_INTERVIEW_PASS_THRESHOLD", "60"))

# Shared secret for authenticating requests from the Next.js backend
# The Next.js proxy sends this in the Authorization header
AI_SERVICE_AUTH_SECRET = os.environ.get("AI_SERVICE_AUTH_SECRET", "")
