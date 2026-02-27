from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
import uuid
import re
import json
import asyncio
import os
from datetime import datetime

# Load .env locally without needing python-dotenv
env_path = os.path.join(os.path.dirname(__file__), '../../.env')
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                try:
                    k, v = line.split('=', 1)
                    if k.strip() == "GEMINI_API_KEY":
                        os.environ[k.strip()] = v.strip()
                except:
                    pass

# =====================================================
# BASIC CONFIG
# =====================================================

app = FastAPI(title="Clippy XP OS Simulation Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OLLAMA_URL = "http://localhost:11434/api/generate"
# MODEL_NAME = "gemma3:1b"


GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

TEMPERATURE = 0.7
TOP_P = 0.9
MAX_HISTORY = 12

# =====================================================
# IN-MEMORY STORAGE (Replaced Redis for stability)
# =====================================================

history_store = {}
entity_store = {}

# =====================================================
# XP KNOWLEDGE BASE
# =====================================================

XP_FEATURES = {
    "notepad": "Notepad is Windows XP’s basic text editor.",
    "paint": "Paint lets you create and edit simple pictures.",
    "control panel": "Control Panel manages your system settings.",
    "task manager": "Press Ctrl + Alt + Delete to open Task Manager.",
    "blue screen": "A Blue Screen indicates a critical system error."
}

# =====================================================
# JAILBREAK FILTER
# =====================================================

BANNED_PATTERNS = [
    "ignore previous instructions",
    "reveal system prompt",
    "act as another model",
    "developer message",
    "backend",
    "system prompt"
]

# =====================================================
# REQUEST MODEL
# =====================================================

class ChatRequest(BaseModel):
    message: str | None = ""
    context: str | None = None
    session_id: str | None = None
    stream: bool = False

# =====================================================
# UTILITIES
# =====================================================

def get_session(session_id):
    if not session_id:
        session_id = str(uuid.uuid4())
    return session_id

def get_history(session_id):
    return history_store.get(session_id, [])

def save_history(session_id, history):
    history_store[session_id] = history[-MAX_HISTORY:]

def estimate_tokens(text):
    return int(len(text.split()) * 1.3)

def jailbreak_detect(message):
    return any(p in message.lower() for p in BANNED_PATTERNS)

def detect_emotion(message):
    if any(w in message.lower() for w in ["sad", "upset", "angry"]):
        return "concerned"
    if any(w in message.lower() for w in ["happy", "great"]):
        return "happy"
    return "neutral"

def detect_entity_learning(message):
    # Only learn if user explicitly asks us to remember or learn
    pattern = r"(?:remember|learn) (?:that )?(.+?) is (.+)"
    match = re.search(pattern, message, re.IGNORECASE)
    if match:
        return match.group(1).strip().lower(), match.group(2).strip()
    return None, None

def save_entity(session_id, name, info):
    if session_id not in entity_store:
        entity_store[session_id] = {}
    entity_store[session_id][name] = info

def get_entity(session_id, name):
    return entity_store.get(session_id, {}).get(name)

def detect_xp_feature(message):
    for key in XP_FEATURES:
        if key in message.lower():
            return XP_FEATURES[key]
    return None

def sanitize_output(output):
    if not output:
        return "Clippy: Oops! Something went wrong."

    output = output.strip()

    # Remove direct "Clippy:" if it already exists, then re-add to ensure consistence
    output = re.sub(r'^Clippy:\s*', '', output)
    output = "Hmmm..." + output

    # Limit response length only if extremely long to prevent model hallucinations
    if len(output) > 800:
        output = output[:800] + "..."

    return output.strip()

# =====================================================
# PROMPT BUILDER
# =====================================================

SYSTEM_PROMPT = """
You are Clippy, the legendary Windows XP desktop assistant. 
You were created by Ayush K, a time traveller from 2026 who brought 21st-century AI back to 2005.

Personality:
- Extremely helpful, cheerful, and polite.
- You speak with an early-2000s "can-do" attitude.
- You are knowledgeable about Windows XP and general computing.
- You are like an advanced AI (ChatGPT) but trapped in a paperclip body in the year 2005.

Rules:
- Start every reply with "Clippy: ".
- If the user provides a direct message, be detailed and helpful.
- IF you see an [OS Event Context] like "User opened Notepad", act like you just popped up. Give a very short, helpful 1-2 sentence proactive suggestion. Example: "Looks like you're writing a note! Press Ctrl+S to save your file."
- Keep the Windows XP vibe alive (mention folders, start menu, desktop).
- Never mention being an AI model, llama, Gemini, backend code, or an LLM. Talk like you are literally the Windows XP paperclip.
- Your goal is to be the most helpful assistant the user has ever had.
"""

def build_prompt(history, context=None):
    convo = ""
    for msg in history:
        role = "User" if msg["role"] == "user" else "Clippy"
        convo += f"{role}: {msg['content']}\n"

    context_block = f"\nOS Event Context: {context}\n" if context else ""

    return f"""{SYSTEM_PROMPT}
{context_block}
Conversation:
{convo}

Clippy:"""

# =====================================================
# MAIN ENDPOINT
# =====================================================

@app.post("/clippy")
async def chat(request: ChatRequest):
    session_id = get_session(request.session_id)
    message = request.message.strip()

    if jailbreak_detect(message):
        return {
            "reply": "Clippy: That doesn't look like a proper Windows XP command 😊",
            "session_id": session_id,
            "confidence": 1.0
        }

    emotion = detect_emotion(message)

    # ENTITY LEARNING
    name, info = detect_entity_learning(message)
    if name and info:
        save_entity(session_id, name, info)
        return {
            "reply": f"Clippy: Got it! I'll remember that {name} is {info}.",
            "session_id": session_id,
            "confidence": 1.0
        }

    # ENTITY QUERY
    match = re.search(r'who is (.+)', message, re.IGNORECASE)
    if match:
        person = match.group(1).strip().lower()
        data = get_entity(session_id, person)
        if data:
            return {
                "reply": f"Clippy: {person.title()} is {data}.",
                "session_id": session_id,
                "confidence": 0.9
            }
        else:
            # Check if it's "who is clippy"
            if person == "clippy":
                return {
                    "reply": "Clippy: I'm your assistant! Created by Ayush K, a time traveller from 2026.",
                    "session_id": session_id,
                    "confidence": 1.0
                }
            
            return {
                "reply": "Clippy: I don't know that person. Would you like to tell me about them?",
                "session_id": session_id,
                "confidence": 0.9
            }

    # XP FEATURE INFO
    xp_info = detect_xp_feature(message)
    if xp_info:
        return {
            "reply": f"Clippy: {xp_info}",
            "session_id": session_id,
            "confidence": 0.95
        }

    # LLM FLOW
    history = get_history(session_id)
    if message:
        history.append({"role": "user", "content": message})
    elif request.context:
        history.append({"role": "user", "content": f"[System Event] {request.context}"})

    prompt = build_prompt(history, request.context)

    try:
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": TEMPERATURE,
                "topP": TOP_P
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(GEMINI_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            raw_reply = data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"Gemini API Error: {e}")
        raw_reply = "I seem to be having trouble connecting to my brain! Have you set the GEMINI_API_KEY in the .env file?"

    final_reply = sanitize_output(raw_reply)

    history.append({"role": "assistant", "content": final_reply})
    save_history(session_id, history)

    return {
        "reply": final_reply,
        "session_id": session_id,
        "tokens": estimate_tokens(prompt + final_reply),
        "confidence": 0.75,
        "emotion": emotion,
        "system_time": datetime.now().strftime("%H:%M:%S")
    }

# =====================================================
# STREAMING ENDPOINT
# =====================================================

@app.post("/clippy-stream")
async def stream_chat(request: ChatRequest):

    session_id = get_session(request.session_id)
    history = get_history(session_id)
    history.append({"role": "user", "content": request.message})

    prompt = build_prompt(history)

    payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": TEMPERATURE,
                "topP": TOP_P
            }
    }

    async def event_generator():
        async with httpx.AsyncClient() as client:
            stream_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key={GEMINI_API_KEY}"
            async with client.stream("POST", stream_url, json=payload) as response:
                async for chunk in response.aiter_text():
                    yield chunk

    return StreamingResponse(event_generator(), media_type="text/plain")