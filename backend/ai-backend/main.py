from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
import httpx
import re
import uuid

# ============================================================
# APP INIT
# ============================================================

app = FastAPI(title="Clippy AI - Expert Controlled Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# CONFIG
# ============================================================

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "gemma3:1b"

TEMPERATURE = 0.2
TOP_P = 0.6

MAX_MEMORY_PER_SESSION = 8

# ============================================================
# SESSION MEMORY STORE
# ============================================================

# session_id -> list of messages
memory_store: Dict[str, List[Dict[str, str]]] = {}

KNOWN_ENTITIES = {
    "ayush k": "Ayush K. is the time traveler who created me."
}

# ============================================================
# REQUEST MODEL
# ============================================================

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


# ============================================================
# SYSTEM PROMPT (Minimal & Strict)
# ============================================================

SYSTEM_PROMPT = """
You are Clippy, the Windows XP desktop assistant.

Rules:
1. Start every reply with: Clippy:
2. Maximum 2 short sentences.
3. If unsure about a person, say:
   Clippy: I don't know that person. Would you like to tell me about them?
4. Never invent facts.
5. Never mention AI or backend systems.
6. Be concise and slightly playful.
"""

# ============================================================
# UTILITIES
# ============================================================

def get_or_create_session(session_id: str | None) -> str:
    if not session_id:
        session_id = str(uuid.uuid4())
    if session_id not in memory_store:
        memory_store[session_id] = []
    return session_id


def trim_memory(session_id: str):
    memory_store[session_id] = memory_store[session_id][-MAX_MEMORY_PER_SESSION:]


def build_prompt(session_id: str) -> str:
    history = memory_store[session_id]

    conversation = ""
    for msg in history:
        role = "User" if msg["role"] == "user" else "Clippy"
        conversation += f"{role}: {msg['content']}\n"

    return f"""{SYSTEM_PROMPT}

Conversation:
{conversation}

Clippy:"""


def extract_person_query(message: str) -> str | None:
    match = re.search(r'who\s+is\s+(.+)', message, re.IGNORECASE)
    if match:
        return match.group(1).strip().lower()
    return None


def enforce_entity_policy(user_message: str) -> str | None:
    """
    Deterministic override before model response.
    """
    person = extract_person_query(user_message)

    if person:
        if person in KNOWN_ENTITIES:
            return f"Clippy: {KNOWN_ENTITIES[person]}"
        else:
            return "Clippy: I don't know that person. Would you like to tell me about them?"

    return None


def sanitize_output(raw_output: str) -> str:
    """
    Enforce formatting and constraints.
    """
    if not raw_output:
        return "Clippy: Oops! I had a paperclip glitch."

    raw_output = raw_output.strip()

    if not raw_output.startswith("Clippy:"):
        raw_output = "Clippy: " + raw_output

    # Limit to max 2 sentences
    sentences = re.split(r'(?<=[.!?]) +', raw_output)
    if len(sentences) > 2:
        raw_output = " ".join(sentences[:2])

    # Remove backend leaks
    banned_words = ["model", "server", "backend", "AI", "language model"]
    for word in banned_words:
        raw_output = re.sub(word, "", raw_output, flags=re.IGNORECASE)

    return raw_output.strip()


async def call_model(prompt: str) -> str:
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "temperature": TEMPERATURE,
        "top_p": TOP_P
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        data = response.json()
        return data.get("response", "").strip()


# ============================================================
# MAIN ENDPOINT
# ============================================================

@app.post("/clippy")
async def chat(request: ChatRequest):
    try:
        session_id = get_or_create_session(request.session_id)
        user_message = request.message.strip()

        # Step 1: Deterministic Entity Override
        policy_reply = enforce_entity_policy(user_message)

        if policy_reply:
            memory_store[session_id].append({
                "role": "assistant",
                "content": policy_reply
            })
            trim_memory(session_id)
            return {
                "reply": policy_reply,
                "session_id": session_id
            }

        # Step 2: Store user input
        memory_store[session_id].append({
            "role": "user",
            "content": user_message
        })
        trim_memory(session_id)

        # Step 3: Build Prompt
        prompt = build_prompt(session_id)

        # Step 4: Call LLM
        raw_reply = await call_model(prompt)

        # Step 5: Sanitize Output
        final_reply = sanitize_output(raw_reply)

        # Step 6: Save Assistant Reply
        memory_store[session_id].append({
            "role": "assistant",
            "content": final_reply
        })
        trim_memory(session_id)

        return {
            "reply": final_reply,
            "session_id": session_id
        }

    except Exception as e:
        print("🔥 SYSTEM ERROR:", e)
        raise HTTPException(
            status_code=500,
            detail="Clippy: Oops! I hit a tiny paperclip snag."
        )