import logging
import json
import time
from haystack_service import HaystackService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def initialize_rag_service():
    """Initialize the RAG service at server startup"""
    try:
        logger.info("Pre-initializing RAG service...")
        start_time = time.time()
        
        # Initialize the service - singleton pattern will ensure only one instance
        service = HaystackService()
        
        # Verify service is properly initialized
        if not hasattr(service, '_initialized') or not service._initialized:
            raise RuntimeError("Service failed to initialize properly")
            
        if not hasattr(service.text_embedder.embedder, '_model'):
            raise RuntimeError("Embedder model not initialized")
            
        init_time = time.time() - start_time
        logger.info(f"RAG service pre-initialized successfully in {init_time:.2f}s")
        return service
        
    except Exception as e:
        logger.error(f"Error pre-initializing RAG service: {str(e)}")
        raise

# Initialize service on module import
try:
    service_instance = initialize_rag_service()
    print(json.dumps({
        "status": "ready",
        "message": "Service manager started"
    }))
except Exception as e:
    print(json.dumps({
        "status": "error",
        "error": str(e)
    }))
    raise 