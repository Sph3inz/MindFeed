import { db } from '../config/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  userId: string;
}

export const addNote = async (note: Omit<Note, 'id' | 'createdAt' | 'userId'>, userId: string): Promise<Note> => {
  try {
    const noteData = {
      title: note.title,
      content: note.content,
      createdAt: new Date(),
      userId
    };

    const docRef = await addDoc(collection(db, 'notes'), noteData);
    return {
      ...noteData,
      id: docRef.id,
      createdAt: noteData.createdAt
    };
  } catch (error) {
    console.error('Error adding note:', error);
    throw error;
  }
};

export const getNotes = async (userId: string): Promise<Note[]> => {
  try {
    const q = query(collection(db, 'notes'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt.toDate()
    })) as Note[];
  } catch (error) {
    console.error('Error getting notes:', error);
    throw error;
  }
};

export const deleteNote = async (noteId: string): Promise<void> => {
  try {
    const noteRef = doc(db, 'notes', noteId);
    await deleteDoc(noteRef);
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
};
