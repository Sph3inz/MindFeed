import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from haystack_service import HaystackService
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Initialize Firebase Admin with direct credentials
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
        
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        return firestore.client()
    except Exception as e:
        print(f"Error initializing Firebase: {str(e)}")
        return None

def test_haystack_rag():
    """Test Haystack RAG implementation with Firestore notes"""
    try:
        print("Initializing Firebase...")
        db = initialize_firebase()
        if not db:
            print("Failed to initialize Firebase")
            return

        print("Initializing Haystack service...")
        service = HaystackService()
        
        print("\nFetching notes from Firestore...")
        notes_ref = db.collection('notes')
        notes = notes_ref.get()
        
        if not notes:
            print("No notes found in the database")
            return
            
        haystack_docs = []
        for note in notes:
            note_data = note.to_dict()
            if note_data.get('content'):
                print(f"Processing note: {note_data.get('title', 'Untitled')}")
                haystack_docs.append({
                    "title": note_data.get('title', 'Untitled'),
                    "content": note_data.get('content', '')
                })
        
        print(f"\nFound {len(haystack_docs)} notes")
        
        print("\nAdding documents to Haystack...")
        service.add_documents(haystack_docs)
        
        test_queries = [
            "What topics are covered in my notes?",
            "What are the main concepts discussed?",
            "Give me a summary of my recent notes"
        ]
        
        print("\nTesting queries:")
        for query in test_queries:
            print(f"\nQuery: {query}")
            try:
                result = service.query(query)
                print(f"Answer: {result['answer']}")
                print(f"Relevant documents: {', '.join(result['relevant_documents'])}")
            except Exception as e:
                print(f"Error querying: {str(e)}")
                
    except Exception as e:
        print(f"Error in test_haystack_rag: {str(e)}")

if __name__ == "__main__":
    test_haystack_rag() 