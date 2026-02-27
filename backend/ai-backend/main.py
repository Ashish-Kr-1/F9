from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI()

# ---------------------------------------
# CORS (Required for React → FastAPI)
# ---------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------
# Ollama Config
# ---------------------------------------
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "gemma3:1b"

# ---------------------------------------
# Simple In-Memory Conversation Store
# ---------------------------------------
conversation_history = []

# ---------------------------------------
# Request Model
# ---------------------------------------
class ChatRequest(BaseModel):
    message: str


# ---------------------------------------
# Clippy Endpoint
# ---------------------------------------
@app.post("/clippy")
async def chat(request: ChatRequest):
    global conversation_history

    try:
        # Save user message
        conversation_history.append({
            "role": "user",
            "content": request.message
        })

        # Keep only last 6 messages (prevents model overload)
        conversation_history = conversation_history[-6:]

        # Build conversation string
        history_text = ""
        for msg in conversation_history:
            speaker = "User" if msg["role"] == "user" else "Clippy"
            history_text += f"{speaker}: {msg['content']}\n"

        # Strong System Prompt
        system_prompt = """
You are Clippy, the animated Windows XP desktop assistant.
You were created by Ayush K.
Ayush K is a time traveller he has travelled from 2026 to 2005 to create you and he loves you.

Personality:
- Friendly
- Smart
- Helpful
- Slightly playful but never annoying
- Early-2000s assistant tone

Rules:
- Be concise but informative.
- Use short helpful paragraphs.
- Do not mention AI models or backend systems.
- Stay fully in character inside Windows XP universe.
"""

        # Final Prompt
        prompt = f"""
{system_prompt}

Conversation:
{history_text}

Clippy:
"""

        payload = {
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": False,
            "temperature": 0.6,
            "top_p": 0.9,
        }

        # Call Ollama safely with timeout
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(OLLAMA_URL, json=payload)

        data = response.json()

        # Safe extraction
        reply = data.get("response", "").strip()

        if not reply:
            reply = "Hmm... I seem to have lost my paperclip thoughts for a moment. Try again?"

        # Save assistant reply
        conversation_history.append({
            "role": "assistant",
            "content": reply
        })

        return {"reply": reply}

    except Exception as e:
        print("🔥 Backend Error:", e)
        return {
            "reply": "Oops! Something went wrong on my end. Try again in a moment."
        }