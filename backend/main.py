from llama_cpp import Llama
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from typing import Dict, List, Optional

# --- Setup Flask App ---

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.DEBUG)

# --- Model Initialization ---

try:
    llm = Llama(model_path="/home/maksich/llama.cpp/phi-2.Q4_K_M.gguf", n_ctx=4096, n_parts=1)
    logging.info("Llama model loaded successfully")
except Exception as e:
    logging.error(f"Error loading model: {e}")
    llm = None

# --- NPC Class ---

class NPC:
    """Manages state and behavior for an NPC."""
    def __init__(self, npc_data: Dict):
        self.id = npc_data.get('name', f"{npc_data.get('type', 'NPC')}_{npc_data.get('x', 0)}_{npc_data.get('y', 0)}")
        self.type = npc_data.get('type', 'NPC')
        self.health = npc_data.get('health', 100)
        self.faction = npc_data.get('faction', 0)
        self.memory: List[str] = npc_data.get('memory', [])
        self.context = f"Initial context for {self.type} at ({npc_data.get('x', 0)}, {npc_data.get('y', 0)})"

    def update(self, npc_data: Dict):
        """Updates NPC state with new data, preserving existing values if not provided."""
        self.health = npc_data.get('health', self.health)
        self.faction = npc_data.get('faction', self.faction)
        logging.debug(f"Updated NPC {self.id}: Health={self.health}, Faction={self.faction}")

    def get_behavior(self) -> str:
        """Returns role-specific behavior based on NPC type."""
        behaviors = {
            "soldier": f"Defend the headquarters with health {self.health} and faction {self.faction}. Consider your resources before acting.",
            "villager": f"Assist with trading, health {self.health} and faction {self.faction}. Offer guidance based on past interactions: {self.memory}.",
            "smuggler": f"Gather supplies with health {self.health} and faction {self.faction}. Avoid confrontation if low on resources.",
            "warlord": f"Rule with health {self.health} and faction {self.faction}. Make alliances or conquer based on strategy.",
            "gunseller": f"Trade weapons with health {self.health} and faction {self.faction}. Offer deals based on inventory."
        }
        return behaviors.get(self.type.lower(), "Respond helpfully.")

    def generate_response(self, user_input: str) -> str:
        """Generates a chat response using the loaded model."""
        if not llm:
            return "I’m malfunctioning—sorry! (Model load failed)"
        try:
            memory_context = '\n'.join(self.memory[-3:]) if self.memory else "No prior interactions."
            prompt = (
                f"You are a {self.type.capitalize()} NPC in a tobacco-growing territory-controlling post-apocalyptic game. "
                f"Your role is to {self.get_behavior()}\n"
                f"Current state: Health {self.health}, Faction {self.faction}\n"
                f"Memory: {memory_context}\n"
                f"User: {user_input}"
            )
            output = llm(prompt, max_tokens=100, stop=["\n"], temperature=0.7, repeat_penalty=1.1)
            response = output["choices"][0]["text"].strip()
            self.memory.append(f"User said: {user_input}, Replied: {response}")
            return response
        except Exception as e:
            logging.error(f"Error generating response for {self.id}: {e}")
            return "I’m malfunctioning—sorry!"

# --- NPC State Management ---

npc_instances: Dict[str, NPC] = {}

def get_or_create_npc(npc_data: Dict) -> NPC:
    """Initializes or retrieves an NPC instance."""
    npc_id = npc_data.get('name', f"{npc_data.get('type', 'NPC')}_{npc_data.get('x', 0)}_{npc_data.get('y', 0)}")
    if npc_id not in npc_instances:
        npc_instances[npc_id] = NPC(npc_data)
    else:
        npc_instances[npc_id].update(npc_data)
    return npc_instances[npc_id]

# --- Flask Routes ---

@app.route('/update_npcs', methods=['POST'])
def update_npcs():
    """Updates NPC states from frontend data."""
    data = request.get_json()
    nearby_npcs = data.get('nearbyNPCs', [])
    logging.debug(f"Received NPC update: {nearby_npcs}")
    for npc_data in nearby_npcs:
        get_or_create_npc(npc_data)
    return jsonify({"status": "success"})

@app.route('/chat', methods=['POST'])
def chat():
    """Generates an NPC response to user input."""
    data = request.get_json()
    user_input = data.get('userInput', '')
    target_npc_data = data.get('targetNPC', {})
    logging.debug(f"Received chat input: {user_input}, Target NPC: {target_npc_data}")

    if not target_npc_data:
        return jsonify({"sender": "System", "reply": "No target NPC provided!"})

    npc = get_or_create_npc(target_npc_data)
    response = npc.generate_response(user_input)
    return jsonify({"sender": target_npc_data.get('name', npc.type.capitalize()), "reply": response})

# --- Main Execution ---

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)