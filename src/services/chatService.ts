import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { RagService } from './ragService';

const ragService = new RagService();

interface ChatResult {
  question: string;
  longAnswer: string;
  shortAnswer: string;
  relevantNotes: string[];
}

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  isImage?: boolean;
  userId: string;
}

// Helper function to check if content contains an image
const isImageContent = (content: string): boolean => {
  return content.includes('<img') || content.includes('data:image');
};

// Helper function to strip HTML tags
const stripHtml = (html: string): string => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

export const queryNotes = async (
  userId: string,
  question: string
): Promise<ChatResult> => {
  try {
    console.log('Querying notes for user:', userId);

    // Get user's notes from Firebase
    const q = query(collection(db, 'notes'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    console.log('Query snapshot size:', querySnapshot.size);
    
    const notes = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        title: data.title || 'Untitled Note',
        content: data.content || '',
      } as Note;
    });

    // Filter out image notes and prepare documents
    const documents = notes
      .filter(note => !isImageContent(note.content))
      .map(note => ({
        title: note.title,
        content: stripHtml(note.content)
      }));

    if (documents.length === 0) {
      return {
        question,
        longAnswer: "I don't see any text notes in your collection yet. Try creating some text notes first!",
        shortAnswer: "No text notes found.",
        relevantNotes: []
      };
    }

    // Get response from RAG service
    const ragResult = await ragService.queryNotes(documents, question);

    return {
      question,
      longAnswer: ragResult.long_ans,
      shortAnswer: ragResult.short_ans,
      relevantNotes: ragResult.context_titles
    };
  } catch (error) {
    console.error('Error querying notes:', error);
    throw error;
  }
};
