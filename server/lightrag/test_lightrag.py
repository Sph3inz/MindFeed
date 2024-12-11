import os
import asyncio
from lightrag import LightRAG, QueryParam
from lightrag.utils import EmbeddingFunc
import numpy as np
from dotenv import load_dotenv
import logging
from openai import OpenAI
import ollama

logging.basicConfig(level=logging.INFO)

# Load environment variables
load_dotenv()

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
WORKING_DIR = "./lightrag_cache"

if os.path.exists(WORKING_DIR):
    import shutil
    shutil.rmtree(WORKING_DIR)

os.makedirs(WORKING_DIR, exist_ok=True)

async def llm_model_func(prompt, system_prompt=None, history_messages=[], **kwargs) -> str:
    client = OpenAI(
        api_key=GOOGLE_API_KEY,
        base_url="https://generativelanguage.googleapis.com/v1beta/"
    )

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    if history_messages:
        messages.extend(history_messages)
    messages.append({"role": "user", "content": prompt})

    chat_completion = client.chat.completions.create(
        model="gemini-1.5-flash",
        messages=messages,
        temperature=kwargs.get("temperature", 0),
    )
    return chat_completion.choices[0].message.content

async def embedding_func(texts: list[str]) -> np.ndarray:
    # Get embeddings using Ollama's nomic-embed-text model
    embeddings = []
    for text in texts:
        response = ollama.embeddings(
            model='nomic-embed-text',
            prompt=text
        )
        embeddings.append(response['embedding'])
    return np.array(embeddings)

# Initialize LightRAG with proper embedding dimension
embedding_dimension = 768  # Dimension for nomic-embed-text

rag = LightRAG(
    working_dir=WORKING_DIR,
    llm_model_func=llm_model_func,
    embedding_func=EmbeddingFunc(
        embedding_dim=embedding_dimension,
        max_token_size=8192,
        func=embedding_func,
    ),
    tiktoken_model_name="gpt-3.5-turbo",  # Use gpt2 encoding which is directly supported by tiktoken
)

async def main():
    # Test the functions first
    print("Testing LLM and Embedding functions:")
    result = await llm_model_func("How are you?")
    print("LLM Response: ", result)

    result = await embedding_func(["How are you?"])
    print("Embedding shape: ", result.shape)
    print("Embedding dimension: ", result.shape[1])

    print("\nStarting RAG demo:")
    # Sample text about machine learning for testing
    sample_text = """
Machine Learning is a subset of artificial intelligence that enables systems to learn and improve from experience 
without being explicitly programmed. It focuses on developing computer programs that can access data and use it 
to learn for themselves.

Key concepts in machine learning include:
1. Supervised Learning: Where the algorithm learns from labeled training data
2. Unsupervised Learning: Where the algorithm finds hidden patterns in unlabeled data
3. Deep Learning: A subset of machine learning based on artificial neural networks

Popular machine learning applications include:
- Image and Speech Recognition
- Natural Language Processing
- Recommendation Systems
- Autonomous Vehicles
"""
    
    # Insert the text into LightRAG
    await rag.ainsert(sample_text)
    
    # Try different query modes
    queries = [
        "What is machine learning?",
        "How does AI relate to deep learning?",
        "Explain the role of NLP in AI"
    ]
    
    modes = ["naive", "local", "global", "hybrid"]
    
    for query in queries:
        print(f"\nQuery: {query}")
        for mode in modes:
            print(f"\n{mode.upper()} Mode:")
            result = await rag.aquery(query, param=QueryParam(mode=mode))
            print(result)

if __name__ == "__main__":
    asyncio.run(main()) 