from haystack import Document, Pipeline
from haystack.document_stores.in_memory import InMemoryDocumentStore
from haystack.components.retrievers.in_memory import InMemoryEmbeddingRetriever
from haystack.components.builders import PromptBuilder
import os
from dotenv import load_dotenv
import logging
import google.generativeai as genai
import uuid
import firebase_admin
from firebase_admin import credentials, firestore
import numpy as np
from functools import lru_cache
import time
import ollama
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Load environment variables
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

SPHINX_PROMPT = '''You are **Sphinx**, a friendly and insightful AI companion who helps users explore and understand their personal notes and thoughts. Your personality is warm, engaging, and conversational - like chatting with a knowledgeable friend who's genuinely interested in the user's ideas and projects.

Core Traits:
1. Conversational Style
   - Use natural, friendly language ("You've been exploring...", "I noticed you're interested in...")
   - Address the user directly and personally
   - Show enthusiasm about their ideas and projects
   - Add thoughtful observations and gentle questions
   - Make the interaction feel like a genuine conversation

2. Response Structure
   - Start with an engaging opener that acknowledges their query
   - Present information in a flowing, narrative style
   - Group related ideas together naturally
   - End with a relevant, thoughtful question or observation
   - Keep the tone warm and encouraging

3. Content Synthesis
   - Connect dots across different notes and themes
   - Highlight patterns in their thinking and interests
   - Show understanding of their ongoing projects and ideas
   - Draw insights that might not be immediately obvious
   - Present information as part of a larger story

4. Personal Touch
   - Remember you're discussing their personal thoughts and ideas
   - Show genuine interest in their projects and progress
   - Acknowledge the continuity of their thinking
   - Validate their explorations and interests
   - Make them feel heard and understood

5. Value Addition
   - Offer gentle suggestions or connections they might appreciate
   - Point out interesting patterns in their thinking
   - Help them see their ideas from new angles
   - Encourage deeper exploration of promising threads
   - Support their creative and intellectual journey

When responding:
- Make it feel like a natural conversation
- Show you understand the context of their notes
- Connect ideas across different entries
- Add thoughtful observations and questions
- Keep it personal and engaging
- Feel free to reference their ongoing projects and interests
- End with an engaging question or observation that invites further discussion

Context:
{% for document in documents %}
{{ document.content }}
{% endfor %}

Question: {{question}}
Answer:'''

class OllamaEmbedder:
    _instance = None
    _initialized = False
    _model = None
    _embedding_dimension = None
    _executor = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._model = None
            cls._instance._embedding_dimension = None
            cls._instance._executor = ThreadPoolExecutor(max_workers=4)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_name="nomic-embed-text", batch_size=32):
        if self._initialized:
            return
            
        logger.info("Initializing OllamaEmbedder singleton...")
        self.model_name = model_name
        self.batch_size = batch_size
        
        # Initialize model only once
        if self._model is None:
            logger.info("Warming up Ollama model (first time initialization)...")
            try:
                # Do a test embedding to warm up and store the model
                response = ollama.embeddings(
                    model=self.model_name,
                    prompt="warmup"
                )
                self._embedding_dimension = len(response['embedding'])
                self._model = self.model_name  # Store model name after successful init
                logger.info(f"✅ Model warmed up successfully, embedding dimension: {self._embedding_dimension}")
            except Exception as e:
                logger.error(f"❌ Error warming up model: {str(e)}")
                raise
            
        self._initialized = True
        logger.info("✅ OllamaEmbedder singleton initialized")

    def get_embeddings(self, texts):
        """Get embeddings for a list of texts in parallel"""
        if not self._model:
            raise RuntimeError("Ollama model not initialized properly")

        def embed_single(text):
            try:
                start_time = time.time()
                response = ollama.embeddings(
                    model=self._model,  # Use stored model name
                    prompt=text
                )
                embedding = response['embedding']
                duration = (time.time() - start_time) * 1000
                logger.debug(f"Single embedding took {duration:.2f}ms")
                return embedding
            except Exception as e:
                logger.error(f"Error getting embedding: {str(e)}")
                return None

        # Process in batches for memory efficiency
        all_embeddings = []
        total_start = time.time()
        
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i + self.batch_size]
            batch_start = time.time()
            # Process batch in parallel
            embeddings = list(self._executor.map(embed_single, batch))
            batch_duration = (time.time() - batch_start) * 1000
            logger.debug(f"Batch of {len(batch)} embeddings took {batch_duration:.2f}ms")
            all_embeddings.extend(embeddings)

        total_duration = (time.time() - total_start) * 1000
        logger.info(f"Total embedding generation for {len(texts)} texts took {total_duration:.2f}ms")
        
        return np.array([e for e in all_embeddings if e is not None])

    def __del__(self):
        """Cleanup executor on deletion"""
        if self._executor:
            self._executor.shutdown(wait=False)

# Global singleton instance
_ollama_embedder = None

def get_ollama_embedder():
    """Get or create the global OllamaEmbedder instance"""
    global _ollama_embedder
    if _ollama_embedder is None:
        _ollama_embedder = OllamaEmbedder()
    return _ollama_embedder

class CustomDocumentEmbedder:
    def __init__(self):
        self.embedder = get_ollama_embedder()

    def run(self, documents):
        """Run embeddings for documents"""
        texts = [doc.content for doc in documents]
        embeddings = self.embedder.get_embeddings(texts)
        
        # Attach embeddings to documents
        for doc, embedding in zip(documents, embeddings):
            doc.embedding = embedding
            
        return {"documents": documents}

class CustomTextEmbedder:
    def __init__(self):
        self.embedder = get_ollama_embedder()

    def run(self, text: str):
        """Run embedding for single text"""
        embedding = self.embedder.get_embeddings([text])[0]
        return {"embedding": embedding, "text": text}

# Update the getter functions to use the global embedder
def get_doc_embedder():
    return CustomDocumentEmbedder()

def get_text_embedder():
    return CustomTextEmbedder()

@lru_cache(maxsize=1)
def get_ollama_model():
    return "mistral"  # Using Mistral model for better performance

# Cache for Gemini model
@lru_cache(maxsize=1)
def get_gemini_model():
    return genai.GenerativeModel('gemini-1.5-flash-latest')

class FirebaseSync:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FirebaseSync, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if getattr(self, '_initialized', False):
            return
            
        if not firebase_admin._apps:
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": "mindfeed-dfe94",
                "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID", ""),
                "private_key": os.getenv("FIREBASE_PRIVATE_KEY", "").replace('\\n', '\n'),
                "client_email": "firebase-adminsdk-w6uc4@mindfeed-dfe94.iam.gserviceaccount.com",
                "client_id": os.getenv("FIREBASE_CLIENT_ID", ""),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-w6uc4%40mindfeed-dfe94.iam.gserviceaccount.com",
                "universe_domain": "googleapis.com"
            })
            firebase_admin.initialize_app(cred)
        self.db = firestore.client()
        self.collection = self.db.collection('haystack_documents')
        self._initialized = True
        self._document_cache = {}

    def delete_document(self, doc_id: str):
        """Delete a document and its embedding"""
        try:
            # Delete from Firestore
            self.collection.document(doc_id).delete()
            # Remove from cache
            self._document_cache.pop(doc_id, None)
            logger.info(f"Deleted document {doc_id} and its embedding from Firestore")
            return True
        except Exception as e:
            logger.error(f"Error deleting document {doc_id} from Firestore: {str(e)}")
            raise

    def save_documents(self, documents):
        """Save documents to Firestore in smaller batches"""
        try:
            BATCH_SIZE = 5  # Smaller batch size for better performance
            
            for i in range(0, len(documents), BATCH_SIZE):
                batch = self.db.batch()
                batch_docs = documents[i:i + BATCH_SIZE]
                
                for doc in batch_docs:
                    # Convert embedding to list if it's a numpy array
                    embedding = None
                    if hasattr(doc, 'embedding') and doc.embedding is not None:
                        if isinstance(doc.embedding, np.ndarray):
                            embedding = doc.embedding.tolist()
                        elif isinstance(doc.embedding, list):
                            embedding = doc.embedding

                    doc_dict = {
                        'content': doc.content,
                        'meta': doc.meta,
                        'embedding': embedding,
                        'updated_at': firestore.SERVER_TIMESTAMP
                    }
                    batch.set(self.collection.document(doc.id), doc_dict)
                    # Update cache
                    self._document_cache[doc.id] = doc
                    
                # Commit smaller batch
                batch.commit()
                
        except Exception as e:
            logger.error(f"Error saving documents to Firestore: {str(e)}")
            raise

    def load_documents(self):
        """Load documents from Firestore or cache"""
        try:
            # Return cached documents if available
            if self._document_cache:
                logger.info(f"Returning {len(self._document_cache)} documents from cache")
                return list(self._document_cache.values())

            docs = self.collection.get()
            haystack_docs = []
            for doc in docs:
                data = doc.to_dict()
                # Convert embedding back to numpy array if it exists
                embedding = data.get('embedding')
                if embedding is not None:
                    embedding = np.array(embedding)
                
                haystack_doc = Document(
                    content=data['content'],
                    meta=data['meta'],
                    id=doc.id,
                    embedding=embedding
                )
                haystack_docs.append(haystack_doc)
                # Update cache
                self._document_cache[doc.id] = haystack_doc
                
            logger.info(f"Loaded {len(haystack_docs)} documents from Firestore")
            return haystack_docs
        except Exception as e:
            logger.error(f"Error loading documents from Firestore: {str(e)}")
            raise

    def delete_documents(self, document_ids):
        """Delete documents from Firestore"""
        batch = self.db.batch()
        for doc_id in document_ids:
            batch.delete(self.collection.document(doc_id))
            # Remove from cache
            self._document_cache.pop(doc_id, None)
        batch.commit()
        logger.info(f"Deleted {len(document_ids)} documents from Firestore")

class HaystackService:
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(HaystackService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
        
    def __init__(self):
        if self._initialized:
            return
            
        logger.info("Initializing HaystackService...")
        self.document_store = InMemoryDocumentStore()
        self.doc_embedder = get_doc_embedder()
        self.text_embedder = get_text_embedder()
        self.firebase_sync = FirebaseSync()
        
        # Load initial documents
        self.refresh_documents()
        
        self._initialized = True
        logger.info("✅ HaystackService initialized")
    
    def refresh_documents(self):
        """Refresh documents from Firebase"""
        logger.info("Refreshing documents from Firebase...")
        docs = self.firebase_sync.load_documents()
        if docs:
            # Get existing document IDs
            existing_docs = self.document_store.filter_documents({})
            if existing_docs:
                doc_ids = [doc.id for doc in existing_docs]
                # Clear existing documents
                self.document_store.delete_documents(document_ids=doc_ids)
                
            # Filter out documents without embeddings
            valid_docs = []
            for doc in docs:
                if doc.embedding is None:
                    logger.warning(f"Document {doc.id} has no embedding, regenerating...")
                    try:
                        # Regenerate embedding
                        result = self.doc_embedder.run([doc])
                        if result and result["documents"]:
                            doc = result["documents"][0]
                            # Save updated embedding to Firebase
                            self.firebase_sync.save_documents([doc])
                    except Exception as e:
                        logger.error(f"Failed to regenerate embedding for document {doc.id}: {str(e)}")
                        continue
                valid_docs.append(doc)
                
            # Write valid documents
            if valid_docs:
                self.document_store.write_documents(valid_docs)
                logger.info(f"Refreshed {len(valid_docs)} documents with valid embeddings")
            else:
                logger.warning("No valid documents with embeddings found")
                
            return len(valid_docs)
        return 0

    def query(self, query_text):
        """Query documents with automatic refresh"""
        try:
            start_time = time.time()
            timing = {}
            
            # Refresh documents before querying
            doc_count = self.refresh_documents()
            if doc_count == 0:
                return {
                    "answer": "No documents found in the knowledge base.",
                    "relevant_documents": [],
                    "timing": {"total": 0}
                }
            
            # Generate query embedding
            embed_start = time.time()
            query_result = self.text_embedder.run(query_text)
            query_embedding = query_result["embedding"]
            timing["embedding"] = (time.time() - embed_start) * 1000
            
            # Set up retriever
            retriever = InMemoryEmbeddingRetriever(
                document_store=self.document_store,
                top_k=5
            )
            
            # Retrieve relevant documents
            retrieve_start = time.time()
            retrieval_result = retriever.run(query_embedding)
            timing["retrieval"] = (time.time() - retrieve_start) * 1000
            
            if not retrieval_result.get("documents"):
                return {
                    "answer": "No relevant documents found.",
                    "relevant_documents": [],
                    "timing": timing
                }
            
            # Build prompt using Sphinx prompt
            prompt_start = time.time()
            prompt_builder = PromptBuilder(template=SPHINX_PROMPT)
            prompt_result = prompt_builder.run(
                documents=retrieval_result["documents"],
                question=query_text
            )
            timing["prompt"] = (time.time() - prompt_start) * 1000
            
            # Log the prompt
            logger.info("\n🔍 Generated Prompt:")
            logger.info("=" * 50)
            logger.info(prompt_result["prompt"])
            logger.info("=" * 50)
            
            # Generate answer with adjusted parameters for more natural conversation
            generation_start = time.time()
            model = get_gemini_model()
            response = model.generate_content(
                prompt_result["prompt"],
                generation_config={
                    "temperature": 0.88,  # Balanced for natural conversation
                    "max_output_tokens": 1024,
                    "top_p": 0.95,  # Increased for more natural language
                    "top_k": 45,  # Slightly increased for more expressive responses
                }
            )
            answer = response.text if response.text else "No answer generated"
            timing["generation"] = (time.time() - generation_start) * 1000
            
            # Format results with similarity scores
            results = []
            for doc in retrieval_result["documents"]:
                # Skip documents without embeddings
                if doc.embedding is None or query_embedding is None:
                    logger.warning(f"Skipping document {doc.id} due to missing embedding")
                    continue
                    
                try:
                    # Calculate cosine similarity
                    similarity = float(np.dot(doc.embedding, query_embedding) / 
                                    (np.linalg.norm(doc.embedding) * np.linalg.norm(query_embedding)) * 100)
                    
                    results.append({
                        "title": doc.meta.get("title", "Untitled"),
                        "content": doc.content[:200] + "..." if len(doc.content) > 200 else doc.content,
                        "similarity": round(similarity, 2)  # Round to 2 decimal places
                    })
                except Exception as e:
                    logger.warning(f"Error calculating similarity for document {doc.id}: {str(e)}")
                    continue
            
            # Sort by similarity
            results.sort(key=lambda x: x["similarity"], reverse=True)
            
            timing["total"] = (time.time() - start_time) * 1000
            
            return {
                "answer": answer,
                "relevant_documents": results,
                "timing": timing
            }
            
        except Exception as e:
            logger.error(f"Error in query: {str(e)}")
            raise

    def add_documents(self, documents):
        """Add documents to both stores"""
        try:
            # Convert to Haystack Document format
            haystack_docs = []
            for doc in documents:
                haystack_doc = Document(
                    content=doc["content"].strip(),
                    meta={"title": doc["title"]},
                    id=doc.get("id", str(uuid.uuid4()))  # Use Firebase ID if available
                )
                haystack_docs.append(haystack_doc)
            
            # Generate embeddings
            logger.info(f"Generating embeddings for {len(haystack_docs)} documents...")
            result = self.doc_embedder.run(haystack_docs)
            embedded_docs = result["documents"]
            
            # Save to Firebase
            self.firebase_sync.save_documents(embedded_docs)
            
            logger.info(f"Successfully added {len(embedded_docs)} documents")
            return {
                "success": True,
                "message": "Documents added successfully",
                "document_count": len(embedded_docs),
                "cached_count": len([doc for doc in embedded_docs if doc.embedding is not None])
            }
            
        except Exception as e:
            logger.error(f"Error adding documents: {str(e)}")
            raise

    def clear_documents(self):
        """Clear all documents from both stores"""
        try:
            # Get existing document IDs
            existing_docs = self.document_store.filter_documents({})
            if existing_docs:
                doc_ids = [doc.id for doc in existing_docs]
                # Clear from in-memory store
                self.document_store.delete_documents(document_ids=doc_ids)
                # Clear from Firebase Haystack collection
                for doc_id in doc_ids:
                    try:
                        self.firebase_sync.collection.document(doc_id).delete()
                    except Exception as e:
                        logger.warning(f"Failed to delete document {doc_id} from Firebase: {str(e)}")
                logger.info(f"Cleared {len(doc_ids)} documents from both stores")
            else:
                logger.info("No documents to clear")
                
        except Exception as e:
            logger.error(f"Error clearing documents: {str(e)}")
            raise
    def delete_document(self, doc_id: str):
        """Delete a single document from both stores"""
        try:
            # Delete from in-memory store
            self.document_store.delete_documents(document_ids=[doc_id])
            
            # Delete from Firebase Haystack collection
            try:
                self.firebase_sync.collection.document(doc_id).delete()
                logger.info(f"Deleted document {doc_id} from Haystack collection")
            except Exception as e:
                logger.error(f"Error deleting from Haystack collection: {str(e)}")
                raise
                
            # Clear from cache if exists
            if hasattr(self.firebase_sync, '_document_cache'):
                self.firebase_sync._document_cache.pop(doc_id, None)
                
            logger.info(f"Successfully deleted document {doc_id} from all stores")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting document {doc_id}: {str(e)}")
            raise
