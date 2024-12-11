import sys
import json
import os
from lightrag import LightRAG, QueryParam
from lightrag.llm import gpt_4o_mini_complete

def sync_notes(user_id, notes_json):
    # Initialize LightRAG for the user
    working_dir = f"./rag_data/{user_id}"
    
    # Ensure the working directory exists
    os.makedirs(working_dir, exist_ok=True)
    
    rag = LightRAG(
        working_dir=working_dir,
        llm_model_func=gpt_4o_mini_complete
    )
    
    # Parse notes from JSON
    notes = json.loads(notes_json)
    
    # Clear existing knowledge graph (optional, depending on your needs)
    # You might want to implement this if you need to rebuild from scratch
    
    # Insert each note into LightRAG
    for note in notes:
        content = note.get('content', '')
        if content.strip():
            try:
                # Strip HTML tags if present (you might want to add this)
                # content = re.sub('<[^<]+?>', '', content)
                rag.insert(content)
            except Exception as e:
                print(f"Error processing note: {str(e)}")
                continue

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python sync_notes.py <user_id> <notes_json>")
        sys.exit(1)
        
    user_id = sys.argv[1]
    notes_json = sys.argv[2]
    sync_notes(user_id, notes_json) 