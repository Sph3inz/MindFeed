import sys
import json
import os
from lightrag import LightRAG, QueryParam
from lightrag.llm import gpt_4o_mini_complete

def insert_notes(user_id, notes_json):
    # Initialize LightRAG for the user
    working_dir = f"./rag_data/{user_id}"
    
    # Ensure the working directory exists
    os.makedirs(working_dir, exist_ok=True)
    
    # Initialize LightRAG
    rag = LightRAG(
        working_dir=working_dir,
        llm_model_func=gpt_4o_mini_complete
    )
    
    # Parse notes from JSON
    notes = json.loads(notes_json)
    
    # Process each note
    for note in notes:
        content = note.get('content', '')
        if content.strip():
            try:
                # Insert the note into the knowledge graph
                rag.insert(content)
                print(f"Successfully added note to knowledge graph")
            except Exception as e:
                print(f"Error processing note: {str(e)}")
                continue

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python insert_notes.py <user_id> <notes_json>")
        sys.exit(1)
        
    user_id = sys.argv[1]
    notes_json = sys.argv[2]
    insert_notes(user_id, notes_json) 