import logging
import json
import sys
from initialize_service import service_instance

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def handle_command(command_data):
    """Handle different commands with the same service instance"""
    try:
        # Parse command data from JSON string
        command_list = json.loads(command_data)
        if not command_list or len(command_list) < 2:
            raise ValueError("Invalid command format")
            
        command = command_list[0]
        args = command_list[1:]
        
        logger.info(f"Received command: {command} with {len(args)} args")
        
        if command == "query":
            user_id, query = args
            logger.info(f"Processing query for user {user_id}")
            result = service_instance.query(query)
            print(json.dumps(result), flush=True)
            
        elif command == "sync":
            user_id, notes_json = args
            notes = json.loads(notes_json)
            logger.info(f"Syncing {len(notes)} notes for user {user_id}")
            service_instance.clear_documents()
            result = service_instance.add_documents(notes)
            if result.get('success'):
                print(json.dumps({"success": True, "message": "Notes synced and ready for querying"}), flush=True)
            else:
                raise ValueError("Failed to sync notes")
            
        elif command == "insert":
            user_id, notes_json = args
            notes = json.loads(notes_json)
            logger.info(f"Inserting {len(notes)} notes for user {user_id}")
            result = service_instance.add_documents(notes)
            if result.get('success'):
                print(json.dumps({"success": True, "message": "Notes added and ready for querying"}), flush=True)
            else:
                raise ValueError("Failed to add notes")
            
        elif command == "delete":
            user_id, doc_id = args
            logger.info(f"Deleting document {doc_id} for user {user_id}")
            result = service_instance.delete_document(doc_id)
            if result:
                print(json.dumps({"success": True, "message": "Document deleted successfully"}), flush=True)
            else:
                raise ValueError("Failed to delete document")
            
        else:
            raise ValueError(f"Unknown command: {command}")
            
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error processing command: {error_msg}")
        print(json.dumps({"error": error_msg}), flush=True)
        sys.stdout.flush()

if __name__ == "__main__":
    try:
        # Signal that service is ready
        print(json.dumps({"status": "ready", "message": "Service manager started"}), flush=True)
        sys.stdout.flush()
        logger.info("Service manager started, waiting for commands...")
        
        # Read commands from stdin
        for line in sys.stdin:
            line = line.strip()
            if line:
                handle_command(line)
                sys.stdout.flush()
    except Exception as e:
        logger.error(f"Fatal error in service manager: {str(e)}")
        print(json.dumps({"error": str(e)}), flush=True)
        sys.exit(1) 