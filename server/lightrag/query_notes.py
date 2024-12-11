import sys
import json
from lightrag import LightRAG, QueryParam
from lightrag.llm import gpt_4o_mini_complete

def query_notes(user_id, query):
    # Initialize LightRAG for the user
    working_dir = f"./rag_data/{user_id}"
    
    rag = LightRAG(
        working_dir=working_dir,
        llm_model_func=gpt_4o_mini_complete
    )
    
    # Query using hybrid mode for best results
    result = rag.query(query, param=QueryParam(mode="hybrid"))
    
    # Format response
    response = {
        "answer": result,
        "mode": "hybrid"
    }
    
    print(json.dumps(response))

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python query_notes.py <user_id> <query>")
        sys.exit(1)
        
    user_id = sys.argv[1]
    query = sys.argv[2]
    query_notes(user_id, query) 