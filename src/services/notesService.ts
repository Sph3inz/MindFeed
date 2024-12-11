import { db } from '../config/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, getDoc } from 'firebase/firestore';

// Cache for notes to prevent unnecessary reloads
let notesCache: { [userId: string]: { notes: Note[], timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache for sync status to prevent duplicate syncs
let syncStatus: { [userId: string]: { inProgress: boolean; lastSync: number } } = {};
const SYNC_COOLDOWN = 30000; // 30 seconds between syncs

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  userId: string;
  metadata?: {
    date: string;
    tag: string;
  };
}

// Add note with proper Haystack RAG sync
export const addNote = async (note: Omit<Note, 'id' | 'createdAt' | 'userId'>, userId: string): Promise<Note> => {
  try {
    // First add to Firestore for immediate feedback
    const noteData = {
      title: note.title,
      content: note.content,
      createdAt: new Date(),
      userId,
      metadata: note.metadata
    };

    const docRef = await addDoc(collection(db, 'notes'), noteData);
    
    // Update cache
    if (notesCache[userId]) {
      notesCache[userId].notes.push({
        ...noteData,
        id: docRef.id,
        createdAt: noteData.createdAt
      });
    }
    
    // Sync with Haystack RAG and wait for confirmation
    try {
      console.log('Syncing note with RAG system...');
      const response = await fetch('http://localhost:3001/api/rag/insert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          notes: [{
            id: docRef.id,
            title: note.title,
            content: note.content
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to sync with RAG: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to sync with RAG');
      }

      console.log('Note synced with RAG successfully');
      
      // Update sync status
      syncStatus[userId] = {
        inProgress: false,
        lastSync: Date.now()
      };
      
    } catch (syncError) {
      console.error('Failed to sync note with RAG:', syncError);
      // Schedule a retry
      setTimeout(() => syncAllNotes(userId), 5000);
    }

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
    // Check cache first
    const cached = notesCache[userId];
    const now = Date.now();
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      // Start background sync if cache is older than 1 minute
      if (now - cached.timestamp > 60000) {
        syncAllNotes(userId).catch(console.error);
      }
      return cached.notes;
    }

    // Load from Firestore
    const q = query(collection(db, 'notes'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const notes = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt.toDate()
    })) as Note[];

    // Update cache
    notesCache[userId] = {
      notes,
      timestamp: now
    };

    // Start background sync
    syncAllNotes(userId).catch(console.error);

    return notes;
  } catch (error) {
    console.error('Error getting notes:', error);
    throw error;
  }
};

export const deleteNote = async (noteId: string, userId: string) => {
  try {
    // Delete from Firebase
    const noteRef = doc(db, 'notes', noteId);
    await deleteDoc(noteRef);
    
    // Delete from Haystack
    const response = await fetch('http://localhost:3001/api/notes/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, noteId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete note from Haystack');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
};

// Query notes using Haystack RAG
export const queryNotes = async (userId: string, query: string): Promise<{ answer: string; relevant_documents: any[] }> => {
  const startTime = performance.now();
  console.log('🕒 Starting query process...');
  
  try {
    // Check if sync is needed
    const status = syncStatus[userId];
    const now = Date.now();
    
    if (!status || (now - status.lastSync > SYNC_COOLDOWN && !status.inProgress)) {
      console.log('🔄 Starting sync before query...');
      const syncStartTime = performance.now();
      await ensureNotesAreSynced(userId);
      console.log(`✅ Sync completed in ${(performance.now() - syncStartTime).toFixed(2)}ms`);
    } else {
      console.log('📝 Using existing sync, last sync was', new Date(status.lastSync).toLocaleTimeString());
    }

    console.log('🔍 Starting RAG query...');
    const queryStartTime = performance.now();
    
    const response = await fetch('http://localhost:3001/api/rag/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, query })
    });

    if (!response.ok) {
      throw new Error('Failed to query notes');
    }

    const result = await response.json();
    console.log(`✅ RAG query completed in ${(performance.now() - queryStartTime).toFixed(2)}ms`);
    
    // Safely log timing information if it exists
    if (result.timing && typeof result.timing === 'object') {
      const timing = result.timing;
      console.log('⚡ Server-side timing:', {
        embedding: typeof timing.embedding === 'number' ? `${timing.embedding.toFixed(2)}ms` : 'N/A',
        retrieval: typeof timing.retrieval === 'number' ? `${timing.retrieval.toFixed(2)}ms` : 'N/A',
        prompt: typeof timing.prompt === 'number' ? `${timing.prompt.toFixed(2)}ms` : 'N/A',
        generation: typeof timing.generation === 'number' ? `${timing.generation.toFixed(2)}ms` : 'N/A',
        total: typeof timing.total === 'number' ? `${timing.total.toFixed(2)}ms` : 'N/A'
      });
    } else {
      console.log('⚠️ No timing information available from server');
    }

    const totalTime = performance.now() - startTime;
    console.log(`🏁 Total query process completed in ${totalTime.toFixed(2)}ms`);

    return {
      answer: result.answer || "No answer found",
      relevant_documents: result.relevant_documents || []
    };
  } catch (error) {
    const errorTime = performance.now() - startTime;
    console.error(`❌ Query failed after ${errorTime.toFixed(2)}ms:`, error);
    throw error;
  }
};

// Ensure notes are synced before querying
async function ensureNotesAreSynced(userId: string): Promise<void> {
  const syncStartTime = performance.now();
  
  // Check if sync is already in progress
  if (syncStatus[userId]?.inProgress) {
    console.log('⏳ Sync already in progress, skipping...');
    return;
  }

  try {
    // Mark sync as in progress
    syncStatus[userId] = { inProgress: true, lastSync: Date.now() };
    console.log('📚 Loading notes...');
    
    const loadStartTime = performance.now();
    // Use cached notes if available
    let notes = notesCache[userId]?.notes;
    
    // If no cache, load from Firestore
    if (!notes) {
      console.log('🔄 Cache miss, loading from Firestore...');
      const q = query(collection(db, 'notes'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      notes = querySnapshot.docs.map(doc => doc.data() as Note);
      console.log(`📥 Loaded ${notes.length} notes from Firestore in ${(performance.now() - loadStartTime).toFixed(2)}ms`);
    } else {
      console.log(`📦 Using ${notes.length} notes from cache in ${(performance.now() - loadStartTime).toFixed(2)}ms`);
    }

    // Skip if no notes
    if (!notes || notes.length === 0) {
      console.log('️ No notes to sync');
      return;
    }

    console.log('🔄 Starting Haystack sync...');
    const haystackStartTime = performance.now();
    
    // Transform and sync
    const haystackNotes = notes.map(note => ({
      id: note.id,
      title: note.title || 'Untitled Note',
      content: note.content || ''
    }));

    const response = await fetch('http://localhost:3001/api/rag/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        notes: haystackNotes
      })
    });

    if (!response.ok) {
      throw new Error('Sync failed');
    }

    const syncTime = performance.now() - syncStartTime;
    console.log(`✅ Sync completed in ${syncTime.toFixed(2)}ms`);
    console.log(`  └─ Haystack sync took ${(performance.now() - haystackStartTime).toFixed(2)}ms`);
    
  } catch (error) {
    const errorTime = performance.now() - syncStartTime;
    console.error(`❌ Sync failed after ${errorTime.toFixed(2)}ms:`, error);
    throw error;
  } finally {
    // Update sync status
    syncStatus[userId] = {
      inProgress: false,
      lastSync: Date.now()
    };
  }
}

// Background sync function - now just calls ensureNotesAreSynced
export const syncAllNotes = async (userId: string): Promise<void> => {
  try {
    await ensureNotesAreSynced(userId);
  } catch (error) {
    console.error('Error in background sync:', error);
    // Schedule retry after delay
    setTimeout(() => syncAllNotes(userId), 5000);
  }
};
