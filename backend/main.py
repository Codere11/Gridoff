from llama_cpp import Llama
from flask import Flask, request, jsonify
from flask_cors import CORS  # Add this

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
try:
    llm = Llama(model_path="/home/maksich/llama.cpp/phi-2.Q4_K_M.gguf", n_ctx=4096, n_parts=1)
except Exception as e:
    print(f"Error loading model: {e}")
    llm = None

@app.route('/chat', methods=['POST'])
def generate_response():
    if not llm:
        return jsonify({"reply": "I’m malfunctioning—sorry! (Model load failed)"})
    try:
        data = request.get_json()
        npc_type = data['npcType']
        user_input = data['userInput']
        prompt = f"You are a {npc_type} NPC in a game. Respond helpfully.\nUser: {user_input}"
        output = llm(prompt, max_tokens=100, stop=["\n"], temperature=0.7, repeat_penalty=1.1)
        response = output["choices"][0]["text"].strip()
        return jsonify({"reply": response})
    except Exception as e:
        print(f"Error generating response: {e}")
        return jsonify({"reply": "I’m malfunctioning—sorry!"}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)