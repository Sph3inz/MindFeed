import sys
import json
import logging
import time
from initialize_service import service_instance

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def query_notes(user_id, query):
    try:
        total_start = time.time()
        logger.info("🚀 Starting query process...")
        
        # Ensure service is initialized
        if not service_instance or not hasattr(service_instance, '_initialized'):
            logger.error("❌ Service not properly initialized!")
            print(json.dumps({"error": "Service not initialized"}))
            sys.exit(1)
            
        # Check if embedder is ready
        if not hasattr(service_instance.text_embedder.embedder, '_model'):
            logger.warning("⚠️ Reinitializing embedder...")
            service_instance.text_embedder = service_instance.get_text_embedder()
        
        # Execute query
        logger.info("📝 Executing query...")
        query_start = time.time()
        result = service_instance.query(query)
        query_time = time.time() - query_start
        
        # Log timing breakdown
        logger.info("\n📊 Query Timing Breakdown:")
        logger.info(f"├── Server Processing: {query_time*1000:.2f}ms")
        if result.get('timing'):
            timing = result['timing']
            logger.info(f"│   ├── Embedding: {timing.get('embedding', 0):.2f}ms")
            logger.info(f"│   ├── Retrieval: {timing.get('retrieval', 0):.2f}ms")
            logger.info(f"│   ├── Prompt: {timing.get('prompt', 0):.2f}ms")
            logger.info(f"│   └── Generation: {timing.get('generation', 0):.2f}ms")
        
        total_time = time.time() - total_start
        logger.info(f"└── Total Time: {total_time*1000:.2f}ms")
        
        print(json.dumps(result))
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Error in query process: {error_msg}")
        print(json.dumps({"error": error_msg}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python query_notes.py <user_id> <query>")
        sys.exit(1)
        
    user_id = sys.argv[1]
    query = sys.argv[2]
    query_notes(user_id, query) 