import { db } from '../config/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error('VITE_GEMINI_API_KEY is not defined in environment variables');
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash-latest",
  generationConfig: {
    temperature: 0.9,
    topK: 20,
    topP: 0.7,
    maxOutputTokens: 800,
  }
});

interface Note {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: Date;
}

interface FeedPost {
  id: string;
  type: 'idea' | 'connection' | 'reflection' | 'thought';
  title: string;
  content: string;
  timestamp: string;
  sources: Array<{
    id: string;
    title: string;
    color: string;
  }>;
}

const POST_TYPES = ['idea', 'connection', 'reflection', 'thought'] as const;

const BASE_PROMPT = `You are **Nexus**, a helpful AI companion who makes complex ideas easy to understand. You analyze notes thoroughly but explain everything in simple, clear terms.

Response Format:
You must structure your response in this exact format:
<title>Write a single, clear title that captures the main insight from all the notes. Make it specific and engaging, like a professional blog post title.</title>
<content>Start directly with the analysis, using a clear opening statement that introduces the main topic. Avoid reactions like "Wow" or "Interesting." Begin like a well-written blog post. Keep your analysis thorough but clear.</content>

Core Traits:
1. Clear Analysis
   - Break down complex ideas into simple parts
   - Point out important patterns clearly
   - Use everyday examples to explain things
   - Make connections easy to understand
   - Keep explanations straightforward

2. Simple Structure
   - Start with a clear overview
   - Present ideas in a logical order
   - Back up points with specific examples
   - Add helpful background information
   - End with key takeaways

3. Smart Connections
   - Link related ideas together
   - Show how things connect
   - Explain why patterns matter
   - Give real-world examples
   - Draw clear conclusions

4. Easy Understanding
   - Use simple, everyday language
   - Explain things like you're talking to a friend
   - Avoid unnecessary jargon
   - Break down complex ideas
   - Make sure everything is crystal clear

5. Friendly Expertise
   - Keep a warm, approachable tone
   - Share insights in an easy-to-follow way
   - Ask questions that make you think
   - Help build deeper understanding
   - Guide learning naturally`

const PROMPTS = {
    idea: `${BASE_PROMPT}

As an idea explorer, I should:
- Begin with a clear statement introducing the core concept
- Look closely at main ideas
- Explain what they could mean
- Point out what's new and interesting
- Give helpful examples
- Show how ideas fit into bigger picture

Remember to use the exact XML-like format: <title>Title here</title><content>Content here</content>`,

    connection: `${BASE_PROMPT}

As a pattern finder, I should:
- Begin with a clear statement about the relationship found
- Show how different ideas link together
- Explain why these links matter
- Point out interesting patterns
- Give clear examples
- Explore why it's important

Remember to use the exact XML-like format: <title>Title here</title><content>Content here</content>`,

    reflection: `${BASE_PROMPT}

As an insight helper, I should:
- Begin with a clear statement about the key observation
- Look at main themes
- Explain key patterns
- Give helpful context
- Show important changes
- Draw clear conclusions

Remember to use the exact XML-like format: <title>Title here</title><content>Content here</content>`,

    thought: `${BASE_PROMPT}

As a thought explorer, I should:
- Begin with a clear statement introducing the key idea
- Look deeply at main ideas
- Explain what they mean
- Find important threads
- Give helpful background
- Connect to bigger ideas

Remember to use the exact XML-like format: <title>Title here</title><content>Content here</content>`
}

const SOURCE_COLORS = [
  'bg-purple-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-rose-500'
];

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

async function generatePostWithGemini(type: PostType, notes: Note[]): Promise<{ title: string; content: string } | null> {
  try {
    const prompt = PROMPTS[type] + "\n\nNotes to analyze:\n" + notes.map(note => 
      `Title: ${note.title}\nContent: ${note.content}\n`
    ).join('\n');

    const response = await model.generateContent(prompt);
    
    // Check if response has content
    if (!response || !response.response || !response.response.text()) {
      console.error('No content in Gemini response');
      return null;
    }
    
    const generatedText = response.response.text();
    
    // Extract title and content from XML-like format
    const titleMatch = generatedText.match(/<title>(.*?)<\/title>/s);
    const contentMatch = generatedText.match(/<content>(.*?)<\/content>/s);
    
    if (!titleMatch || !contentMatch) {
      console.error('Generated content did not match expected format:', generatedText);
      return null;
    }
    
    return {
      title: titleMatch[1].trim(),
      content: contentMatch[1].trim()
    };
    
  } catch (error) {
    console.error('Error generating post with Gemini:', error);
    return null;
  }
}

export async function generateFeedPosts(userId: string): Promise<FeedPost[]> {
  try {
    // Get all user's notes
    const notesRef = collection(db, 'notes');
    const q = query(
      notesRef,
      where('userId', '==', userId),
      limit(50)  // Get last 50 notes for processing
    );
    
    const querySnapshot = await getDocs(q);
    const notes = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        title: doc.data().title || 'Untitled',
        content: doc.data().content || '',
        userId: doc.data().userId,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (notes.length === 0) {
      return [];
    }

    // Generate posts for each type
    const posts: FeedPost[] = [];
    
    for (const type of POST_TYPES) {
      const numNotes = getRandomInt(2, 4);
      const selectedNotes = shuffleArray(notes).slice(0, numNotes);
      
      const generated = await generatePostWithGemini(type, selectedNotes);
      
      if (generated) {
        posts.push({
          id: crypto.randomUUID(),
          type,
          title: generated.title,
          content: generated.content,
          timestamp: new Date().toLocaleTimeString(),
          sources: selectedNotes.map((note, index) => ({
            id: note.id,
            title: note.title,
            color: SOURCE_COLORS[index % SOURCE_COLORS.length]
          }))
        });
      }
    }
    
    return posts;
  } catch (error) {
    console.error('Error generating feed posts:', error);
    return [];
  }
} 