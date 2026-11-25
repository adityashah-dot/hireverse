"""
question_engine.py — Loads and selects questions from the pool
"""
import json
import random
import hashlib
from pathlib import Path
import config


def load_existing_questions(path: str = None, silent: bool = False) -> list | None:
    """Load questions from questions/question_pool.json."""
    search_paths = [
        Path(path) if path else None,
        Path(config.QUESTION_POOL_PATH),
        Path(__file__).parent / "questions" / "question_pool.json",
        Path("questions/question_pool.json"),
    ]

    for p in search_paths:
        if p is None:
            continue
        if not silent:
            print(f"🔍 Checking {p.absolute()}")
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    questions = json.load(f)
                print(f"📚 Loaded {len(questions)} questions from {p}")
                return questions
            except Exception as e:
                print(f"❌ Failed to load {p}: {e}")

    if not silent:
        print("❌ No question pool found. Using built-in fallback questions.")
    return get_fallback_questions()


def get_fallback_questions() -> list:
    """Built-in fallback question set covering common software engineering topics."""
    return [
        # --- EASY (10) ---
        {"question": "What is object-oriented programming and what are its four main principles?", "difficulty": "easy", "ans": "", "score": "", "feedback": "", "passing_threshold": 65},
        {"question": "Explain the difference between a stack and a queue.", "difficulty": "easy", "ans": "", "score": "", "feedback": "", "passing_threshold": 65},
        {"question": "What is a REST API and how does it differ from SOAP?", "difficulty": "easy", "ans": "", "score": "", "feedback": "", "passing_threshold": 65},
        {"question": "What is the difference between SQL and NoSQL databases?", "difficulty": "easy", "ans": "", "score": "", "feedback": "", "passing_threshold": 65},
        {"question": "Explain what version control is and why it is important.", "difficulty": "easy", "ans": "", "score": "", "feedback": "", "passing_threshold": 65},
        {"question": "What is the difference between a process and a thread?", "difficulty": "easy", "ans": "", "score": "", "feedback": "", "passing_threshold": 65},
        {"question": "Explain what HTTP status codes 200, 404, and 500 mean.", "difficulty": "easy", "ans": "", "score": "", "feedback": "", "passing_threshold": 65},
        {"question": "What is the purpose of an index in a database?", "difficulty": "easy", "ans": "", "score": "", "feedback": "", "passing_threshold": 65},
        {"question": "What is the difference between synchronous and asynchronous programming?", "difficulty": "easy", "ans": "", "score": "", "feedback": "", "passing_threshold": 65},
        {"question": "Explain the concept of dependency injection and why it is useful.", "difficulty": "easy", "ans": "", "score": "", "feedback": "", "passing_threshold": 65},
        # --- MEDIUM (10) ---
        {"question": "How would you design a caching layer for a high-traffic web application?", "difficulty": "medium", "ans": "", "score": "", "feedback": "", "passing_threshold": 55},
        {"question": "Explain the CAP theorem and how it applies to distributed systems.", "difficulty": "medium", "ans": "", "score": "", "feedback": "", "passing_threshold": 55},
        {"question": "What strategies would you use to optimize slow SQL queries?", "difficulty": "medium", "ans": "", "score": "", "feedback": "", "passing_threshold": 55},
        {"question": "How would you implement authentication and authorization in a microservices architecture?", "difficulty": "medium", "ans": "", "score": "", "feedback": "", "passing_threshold": 55},
        {"question": "Describe how you would approach debugging a memory leak in a production application.", "difficulty": "medium", "ans": "", "score": "", "feedback": "", "passing_threshold": 55},
        {"question": "What is the difference between optimistic and pessimistic locking in databases?", "difficulty": "medium", "ans": "", "score": "", "feedback": "", "passing_threshold": 55},
        {"question": "How does a message queue improve system resilience and decoupling? Give a concrete example.", "difficulty": "medium", "ans": "", "score": "", "feedback": "", "passing_threshold": 55},
        {"question": "Explain the SOLID principles and give an example of violating one in practice.", "difficulty": "medium", "ans": "", "score": "", "feedback": "", "passing_threshold": 55},
        {"question": "How would you approach rate limiting an API endpoint? What are the trade-offs between different strategies?", "difficulty": "medium", "ans": "", "score": "", "feedback": "", "passing_threshold": 55},
        {"question": "Describe the differences between horizontal and vertical scaling. When would you choose each?", "difficulty": "medium", "ans": "", "score": "", "feedback": "", "passing_threshold": 55},
        # --- HARD (7) ---
        {"question": "Design a globally distributed, fault-tolerant system that handles 1 million concurrent users with sub-100ms response times. Address data consistency, disaster recovery, and cost optimization.", "difficulty": "hard", "ans": "", "score": "", "feedback": "", "passing_threshold": 50},
        {"question": "A monolithic application needs to be migrated to microservices without downtime. Walk through your complete strategy including data management, deployment, and rollback plans.", "difficulty": "hard", "ans": "", "score": "", "feedback": "", "passing_threshold": 50},
        {"question": "You are experiencing intermittent 503 errors under load but only in one availability zone. Describe your end-to-end investigation and remediation approach.", "difficulty": "hard", "ans": "", "score": "", "feedback": "", "passing_threshold": 50},
        {"question": "Design a real-time collaborative document editing system like Google Docs. How do you handle conflict resolution and offline edits?", "difficulty": "hard", "ans": "", "score": "", "feedback": "", "passing_threshold": 50},
        {"question": "How would you build a search system that supports full-text search over 500 million documents with sub-200ms latency?", "difficulty": "hard", "ans": "", "score": "", "feedback": "", "passing_threshold": 50},
        {"question": "Explain how database transactions achieve ACID properties. How does MVCC work and what problems does it solve?", "difficulty": "hard", "ans": "", "score": "", "feedback": "", "passing_threshold": 50},
        {"question": "You need to process 10 million events per day with exactly-once semantics. Walk through an architecture that guarantees this under failure conditions.", "difficulty": "hard", "ans": "", "score": "", "feedback": "", "passing_threshold": 50},
    ]


def choose_next_question(question_pool: list, difficulty: str = "easy", session_id: str = None) -> dict | None:
    """Choose the next unanswered question from the pool at the given difficulty."""
    available = [
        q for q in question_pool
        if q.get("difficulty") == difficulty and q.get("ans", "") == ""
        and "**" not in q.get("question", "")
        and len(q.get("question", "").strip()) >= 10
    ]

    if available:
        if session_id:
            seed = int(hashlib.md5(f"{session_id}_{difficulty}_{len(available)}".encode()).hexdigest()[:8], 16)
            return random.Random(seed).choice(available)
        return random.choice(available)

    # Fallback: try other difficulties
    for level in ["easy", "medium", "hard"]:
        if level == difficulty:
            continue
        fallback = [
            q for q in question_pool
            if q.get("difficulty") == level and q.get("ans", "") == ""
            and "**" not in q.get("question", "")
            and len(q.get("question", "").strip()) >= 10
        ]
        if fallback:
            return random.choice(fallback)

    return None
