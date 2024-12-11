import sys
import json
import os
from haystack_service import HaystackService

def sync_notes(user_id, notes_json):
    try:
        # Initialize Haystack service
        service = HaystackService()
        
        # Clear existing documents
        service.clear_documents()
        
        # Parse notes from JSON
        notes = json.loads(notes_json)
        
        # Add all documents to Haystack
        service.add_documents(notes)
        print(json.dumps({"success": True, "message": "Notes synced successfully"}))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python sync_notes.py <user_id> <notes_json>")
        sys.exit(1)
        
    user_id = sys.argv[1]
    notes_json = sys.argv[2]
    sync_notes(user_id, notes_json) 