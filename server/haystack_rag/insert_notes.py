import sys
import json
import os
import logging
from haystack_service import HaystackService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def insert_notes(user_id, notes_json):
    try:
        # Initialize Haystack service
        service = HaystackService()
        
        # Parse notes from JSON
        notes = json.loads(notes_json)
        
        logger.info(f"Inserting {len(notes)} notes for user {user_id}")
        for note in notes:
            logger.info(f"Processing note: {note.get('title', 'Untitled')}")
            # Strip HTML tags from content
            content = note.get('content', '')
            if content.startswith('<p>') and content.endswith('</p>'):
                content = content[3:-4]  # Remove <p> tags
            content = content.replace('<br>', '\n')  # Replace <br> with newlines
            note['content'] = content
        
        # Add documents to Haystack
        result = service.add_documents(notes)
        
        # Verify documents were added
        if not result.get('success'):
            raise ValueError(f"Failed to add documents: {result.get('message', 'Unknown error')}")
            
        logger.info(f"Successfully added {result.get('document_count', 0)} documents with {result.get('cached_count', 0)} cached embeddings")
        
        print(json.dumps({
            "success": True,
            "message": "Notes added successfully",
            "details": {
                "document_count": result.get('document_count', 0),
                "cached_count": result.get('cached_count', 0)
            }
        }))
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error inserting notes: {error_msg}")
        print(json.dumps({"success": False, "error": error_msg}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python insert_notes.py <user_id> <notes_json>")
        sys.exit(1)
        
    user_id = sys.argv[1]
    notes_json = sys.argv[2]
    insert_notes(user_id, notes_json) 