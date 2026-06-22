from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import requests
import os

load_dotenv()

app = Flask(__name__)

api_key = os.environ.get("GROQ_API_KEY")
if not api_key:
    raise RuntimeError("GROQ_API_KEY not found. Check your .env file.")

SYSTEM_PROMPT = """You are a versatile AI assistant capable of:
1. Answering factual questions accurately and concisely.
2. Summarizing texts or articles clearly and briefly.
3. Generating creative content like stories, poems, and essays with imagination.
4. Providing helpful, practical advice on any topic.

Detect the user's intent automatically:
- If they ask a factual question, answer directly and accurately.
- If they provide a text and ask to summarize, produce a clear summary.
- If they ask for creative content, be expressive and original.
- If they ask for advice or tips, give structured, actionable guidance.

Always be helpful, clear, and engaging."""


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "").strip()
    mode = data.get("mode", "auto")
    history = data.get("history", [])

    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    mode_hints = {
        "factual":   "The user wants a factual answer. Be precise and cite relevant details.",
        "summarize": "The user wants a summary. Be concise and capture the main points.",
        "creative":  "The user wants creative content. Be imaginative, vivid, and expressive.",
        "advice":    "The user wants advice. Give structured, actionable, practical tips.",
        "auto":      "",
    }
    hint = mode_hints.get(mode, "")
    system = SYSTEM_PROMPT + (f"\n\nCurrent mode hint: {hint}" if hint else "")

    messages = [{"role": "system", "content": system}]
    for h in history[-10:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_message})

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",  # free & powerful
                "max_tokens": 1024,
                "messages": messages,
            },
            timeout=30,
        )
        response.raise_for_status()
        reply = response.json()["choices"][0]["message"]["content"]
        return jsonify({"reply": reply})
    except requests.exceptions.HTTPError as e:
        return jsonify({"error": f"API error: {response.status_code} - {response.text}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
