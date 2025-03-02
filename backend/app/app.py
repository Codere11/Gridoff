from llama_cpp import Llama

llm = Llama(model_path="/home/maksich/llama.cpp/phi-2.Q4_K_M.gguf", n_ctx=512)

def generate_response(npc_type, user_input):
    prompt = f"You are a {npc_type} NPC in a game. Respond helpfully.\nUser: {user_input}"
    output = llm(prompt, max_tokens=50, stop=["\n"])
    return output["choices"][0]["text"].strip()

if __name__ == "__main__":
    import sys
    npc_type, user_input = sys.argv[1], sys.argv[2]
    print(generate_response(npc_type, user_input))