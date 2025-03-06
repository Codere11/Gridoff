from llama_cpp import Llama
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import time
import threading
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional, Tuple

# --- Setup Logging ---
# Main application logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Performance logger to file
performance_logger = logging.getLogger('performance')
performance_logger.setLevel(logging.INFO)

# Create file handler for performance logging
log_dir = os.path.dirname(os.path.abspath(__file__))
performance_log_path = os.path.join(log_dir, 'performance_log.txt')
file_handler = logging.FileHandler(performance_log_path)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
performance_logger.addHandler(file_handler)

# Ensure performance logger doesn't propagate to root logger
performance_logger.propagate = False

# Log startup information
performance_logger.info("=== Application Started ===")
performance_logger.info(f"Log file created at: {performance_log_path}")

# --- Setup Flask App ---
app = Flask(__name__)
CORS(app)

# --- Thread Pool for Async Processing ---
executor = ThreadPoolExecutor(max_workers=4)

# --- Model Initialization ---
model_load_start = time.time()
try:
    # Optimized model parameters
    llm = Llama(
        model_path="/home/maksich/llama.cpp/phi-2.Q4_K_M.gguf", 
        n_ctx=512,  # Reduced context window
        n_batch=1024,  # Increased batch size
        n_threads=8, # Adjust based on your CPU cores
    )
    model_load_time = time.time() - model_load_start
    logging.info("Llama model loaded successfully")
    performance_logger.info(f"Model loaded in {model_load_time:.2f} seconds")
except Exception as e:
    logging.error(f"Error loading model: {e}")
    performance_logger.error(f"Model loading failed after {time.time() - model_load_start:.2f} seconds: {e}")
    llm = None

# --- Response Cache ---
response_cache = {}
CACHE_EXPIRY = 3600  # Cache entries expire after 1 hour
cache_hits = 0
cache_misses = 0

# --- NPC Class ---
class NPC:
    """Manages state and behavior for an NPC."""
    def __init__(self, npc_data: Dict):
        self.id = npc_data.get('name', f"{npc_data.get('type', 'NPC')}_{npc_data.get('x', 0)}_{npc_data.get('y', 0)}")
        self.type = npc_data.get('type', 'NPC')
        self.health = npc_data.get('health', 100)
        self.faction = npc_data.get('faction', 0)
        self.memory: List[str] = npc_data.get('memory', [])
        self.last_interaction = time.time()
        performance_logger.info(f"NPC created: {self.id}, Type: {self.type}")
        
    def update(self, npc_data: Dict):
        """Updates NPC state with new data, preserving existing values if not provided."""
        self.health = npc_data.get('health', self.health)
        self.faction = npc_data.get('faction', self.faction)
        
    def get_behavior(self) -> str:
        """Returns role-specific behavior based on NPC type."""
        behaviors = {
            "soldier": f"Defend headquarters. Health: {self.health}, Faction: {self.faction}.",
            "villager": f"Trade and assist. Health: {self.health}, Faction: {self.faction}.",
            "smuggler": f"Gather supplies. Health: {self.health}, Faction: {self.faction}.",
            "warlord": f"Rule and strategize. Health: {self.health}, Faction: {self.faction}.",
            "gunseller": f"Trade weapons. Health: {self.health}, Faction: {self.faction}."
        }
        return behaviors.get(self.type.lower(), "Respond helpfully.")

    def generate_response(self, user_input: str) -> str:
        """Generates a chat response using the loaded model."""
        global cache_hits, cache_misses
        
        if not llm:
            performance_logger.error(f"Response generation failed for {self.id}: Model not loaded")
            return "I'm malfunctioning—sorry! (Model load failed)"
            
        # Update last interaction time
        self.last_interaction = time.time()
        
        # Check cache first
        cache_key = f"{self.id}:{user_input}"
        if cache_key in response_cache:
            cache_entry = response_cache[cache_key]
            if time.time() - cache_entry['timestamp'] < CACHE_EXPIRY:
                cache_hits += 1
                performance_logger.info(f"Cache hit for {self.id}: '{user_input[:30]}...' - Cache hits: {cache_hits}, misses: {cache_misses}")
                return cache_entry['response']
        
        # Cache miss
        cache_misses += 1
        
        try:
            # Use only the most recent memory items
            memory_context = '\n'.join(self.memory[-2:]) if self.memory else "No prior interactions."
            
            # Streamlined prompt
            prompt = (
                f"You are a {self.type} in a post-apocalyptic game. "
                f"{self.get_behavior()}\n"
                f"Memory: {memory_context}\n"
                f"User: {user_input}"
            )
            
            # Log prompt length
            prompt_tokens = len(prompt.split())
            performance_logger.info(f"Prompt for {self.id}: {prompt_tokens} tokens")
            
            # Start timing inference
            inference_start = time.time()
            
            # Optimized inference parameters
            output = llm(
                prompt, 
                max_tokens=75,  # Reduced token count
                stop=["\n", "User:", "NPC:"],  # Better stopping criteria
                temperature=0.7, 
                repeat_penalty=1.1,
                top_p=0.9  # Add top_p sampling
            )
            
            inference_time = time.time() - inference_start
            
            response = output["choices"][0]["text"].strip()
            response_tokens = len(response.split())
            
            # Log performance metrics
            performance_logger.info(
                f"Inference for {self.id}: {inference_time:.2f}s, "
                f"Prompt: {prompt_tokens} tokens, Response: {response_tokens} tokens, "
                f"Speed: {response_tokens/inference_time:.2f} tokens/sec"
            )
            
            # Store in memory and cache
            self.memory.append(f"User: {user_input}, Response: {response}")
            if len(self.memory) > 5:  # Limit memory size
                self.memory.pop(0)
                
            # Cache the response
            response_cache[cache_key] = {
                'response': response,
                'timestamp': time.time()
            }
            
            return response
        except Exception as e:
            performance_logger.error(f"Error generating response for {self.id}: {e}")
            logging.error(f"Error generating response for {self.id}: {e}")
            return "I'm malfunctioning—sorry!"

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

# --- Periodic Cleanup and Stats Reporting ---
def cleanup_and_report():
    """Remove inactive NPCs and report performance stats"""
    current_time = time.time()
    
    # Clean up inactive NPCs
    initial_count = len(npc_instances)
    for npc_id in list(npc_instances.keys()):
        if current_time - npc_instances[npc_id].last_interaction > 3600:  # 1 hour
            del npc_instances[npc_id]
    
    # Clean up expired cache entries
    initial_cache_count = len(response_cache)
    for key in list(response_cache.keys()):
        if current_time - response_cache[key]['timestamp'] > CACHE_EXPIRY:
            del response_cache[key]
    
    # Calculate hit rate safely
    hit_rate = "N/A"
    if cache_hits + cache_misses > 0:
        hit_rate = f"{cache_hits/(cache_hits+cache_misses)*100:.1f}%"
    
    # Log cleanup stats
    performance_logger.info(
        f"Cleanup: NPCs {initial_count}->{len(npc_instances)}, "
        f"Cache {initial_cache_count}->{len(response_cache)}, "
        f"Cache hits: {cache_hits}, misses: {cache_misses}, "
        f"Hit rate: {hit_rate}"
    )
    
    # Schedule next cleanup
    threading.Timer(300, cleanup_and_report).start()  # Run every 5 minutes

# --- Flask Routes ---
@app.route('/update_npcs', methods=['POST'])
def update_npcs():
    """Updates NPC states from frontend data."""
    start_time = time.time()
    data = request.get_json()
    nearby_npcs = data.get('nearbyNPCs', [])
    
    for npc_data in nearby_npcs:
        get_or_create_npc(npc_data)
    
    processing_time = time.time() - start_time
    performance_logger.info(f"update_npcs: {processing_time:.2f}s, {len(nearby_npcs)} NPCs")
    
    return jsonify({"status": "success"})

@app.route('/chat', methods=['POST'])
def chat():
    """Generates an NPC response to user input."""
    start_time = time.time()
    data = request.get_json()
    user_input = data.get('userInput', '')
    target_npc_data = data.get('targetNPC', {})

    if not target_npc_data:
        return jsonify({"sender": "System", "reply": "No target NPC provided!"})

    # Submit to thread pool for async processing
    future = executor.submit(process_chat, user_input, target_npc_data)
    result = future.result()
    
    processing_time = time.time() - start_time
    npc_name = target_npc_data.get('name', 'Unknown')
    performance_logger.info(f"Chat endpoint: {processing_time:.2f}s for NPC: {npc_name}, Input: '{user_input[:30]}...'")
    
    return jsonify(result)

def process_chat(user_input: str, target_npc_data: Dict) -> Dict:
    """Process chat in a separate thread."""
    npc = get_or_create_npc(target_npc_data)
    response = npc.generate_response(user_input)
    return {"sender": target_npc_data.get('name', npc.type.capitalize()), "reply": response}

# --- Main Execution ---
if __name__ == "__main__":
    # Log system info
    try:
        import platform
        import psutil
        
        cpu_info = platform.processor()
        memory_info = psutil.virtual_memory()
        performance_logger.info(f"System: {platform.system()} {platform.release()}")
        performance_logger.info(f"CPU: {cpu_info}")
        performance_logger.info(f"Memory: {memory_info.total / (1024**3):.1f} GB total, {memory_info.available / (1024**3):.1f} GB available")
    except ImportError:
        performance_logger.info("Could not retrieve detailed system information - psutil not installed")
    except Exception as e:
        performance_logger.info(f"Error retrieving system information: {e}")
    
    # Start cleanup and reporting thread
    cleanup_and_report()
    
    # Run Flask app
    performance_logger.info("Starting Flask server on port 5000")
    app.run(host='0.0.0.0', port=5000, threaded=True)
