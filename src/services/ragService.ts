interface RagResponse {
  long_ans: string;
  short_ans: string;
  context_titles: string[];
}

export class RagService {
  private readonly apiUrl = 'http://localhost:3001/api/rag';

  async queryNotes(documents: { title: string; content: string }[], question: string): Promise<RagResponse> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documents, question }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`RAG service error: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in RAG service:', error);
      throw error;
    }
  }
}
