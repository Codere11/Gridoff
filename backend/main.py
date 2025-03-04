from llama_cpp import Llama
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from typing import Dict, Optional

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.DEBUG)

try:
    llm = Llama(model_path="/home/maksich/llama.cpp/phi-2.Q4_K_M.gguf", n_ctx=4096, n_parts=1)
    logging.info("Llama model loaded successfully")
except Exception as e:
    logging.error(f"Error loading model: {e}")
    llm = None

# Store NPC instances with state
npc_instances: Dict[str, dict] = {}

def initialize_npc(npc_data: dict) -> dict:
    npc_id = npc_data.get('name', f"{npc_data.get('type', 'NPC')}_{npc_data.get('x', 0)}_{npc_data.get('y', 0)}")
    if npc_id not in npc_instances:
        npc_instances[npc_id] = {
            'health': npc_data.get('health', 100),
            'faction': npc_data.get('faction', 0),
            'memory': [],  # Store past interactions
            'context': f"Initial context for {npc_data.get('type', 'NPC')} at ({npc_data.get('x')}, {npc_data.get('y')})"
        }
    else:
        npc_instances[npc_id].update({
            'health': npc_data.get('health', npc_instances[npc_id].get('health', 100)),
            'faction': npc_data.get('faction', npc_instances[npc_id].get('faction', 0))
        })
    logging.debug(f"Initialized/Updated NPC: {npc_id}, State: {npc_instances[npc_id]}")
    return npc_instances[npc_id]

@app.route('/update_npcs', methods=['POST'])
def update_npcs():
    data = request.get_json()
    nearby_npcs = data.get('nearbyNPCs', [])
    logging.debug(f"Received NPC update: {nearby_npcs}")
    for npc in nearby_npcs:
        initialize_npc(npc)
    return jsonify({"status": "success"})

@app.route('/chat', methods=['POST'])
def generate_response():
    if not llm:
        return jsonify({"reply": "I’m malfunctioning—sorry! (Model load failed)"})
    try:
        data = request.get_json()
        user_input = data.get('userInput', '')
        target_npc = data.get('targetNPC', {})
        logging.debug(f"Received chat input: {user_input}, Target NPC: {target_npc}")

        # Update or initialize the target NPC
        if target_npc:
            npc_state = initialize_npc(target_npc)

        if target_npc:
            npc_type = target_npc.get('type', 'NPC')
            role_behavior = {
                "soldier": f"Defend the headquarters with health {npc_state['health']} and faction {npc_state['faction']}."
                        " Consider your resources before acting.",
                "villager": f"Assist with trading, health {npc_state['health']} and faction {npc_state['faction']}."
                        " Offer guidance based on past interactions: {npc_state['memory']}.",
                "smuggler": f"Gather supplies with health {npc_state['health']} and faction {npc_state['faction']}."
                        " Avoid confrontation if low on resources.",
                "warlord": f"Rule with health {npc_state['health']} and faction {npc_state['faction']}."
                        " Make alliances or conquer based on strategy.",
                "gunseller": f"Trade weapons with health {npc_state['health']} and faction {npc_state['faction']}."
                        " Offer deals based on inventory."
            }
            behavior = role_behavior.get(npc_type.lower(), "Respond helpfully.")
            memory_context = '\n'.join(npc_state['memory'][-3:]) if npc_state['memory'] else "No prior interactions."
            prompt = (f"You are a {npc_type.capitalize()} NPC in a tobacco-growing territory-controlling post-apocalyptic game. "
                      f"Your role is to {behavior}\n"
                      f"Current state: Health {npc_state['health']}, Faction {npc_state['faction']}\n"
                      f"Memory: {memory_context}\n"
                      f"User: {user_input}")
            output = llm(prompt, max_tokens=100, stop=["\n"], temperature=0.7, repeat_penalty=1.1)
            response = output["choices"][0]["text"].strip()
            npc_state['memory'].append(f"User said: {user_input}, Replied: {response}")
            return jsonify({"sender": target_npc.get('name', npc_type.capitalize()), "reply": response})
        else:
            return jsonify({"sender": "System", "reply": "No target NPC provided!"})
    except Exception as e:
        logging.error(f"Error generating response: {e}")
        return jsonify({"reply": "I’m malfunctioning—sorry!"}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)