import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { PythonShell } from 'python-shell';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(compression() as express.RequestHandler);
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Create persistent Python shell for RAG service
let serviceShell: PythonShell | null = null;
let serverReady = false;

const initializeService = async (): Promise<void> => {
  console.log('🚀 Initializing RAG service...');
  try {
    // First run the initialization script and wait for it to complete
    const initResults = await PythonShell.run('haystack_rag/initialize_service.py', { 
      pythonPath: 'python',
      pythonOptions: ['-u']
    });
    
    // Check initialization result
    const initResult = JSON.parse(initResults[0]);
    if (initResult.status !== 'ready') {
      throw new Error(initResult.error || 'Initialization failed');
    }
    
    console.log('✅ Model initialized successfully');
    
    // Then create persistent shell for service manager
    serviceShell = new PythonShell('haystack_rag/service_manager.py', {
      mode: 'text',
      pythonPath: 'python',
      pythonOptions: ['-u'],
      scriptPath: '.',
      env: {
        ...process.env,
        PYTHONPATH: process.env.PYTHONPATH || '',
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY
      }
    });

    // Handle any errors
    serviceShell.on('error', (err) => {
      console.error('❌ Service shell error:', err);
      serviceShell = null;
      serverReady = false;
    });

    // Handle process exit
    serviceShell.on('close', () => {
      console.log('⚠️ Service shell closed, will reinitialize on next request');
      serviceShell = null;
      serverReady = false;
    });

    // Wait for service manager to be ready
    await new Promise<void>((resolve, reject) => {
      if (!serviceShell) {
        reject(new Error('Service shell not created'));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('Service manager initialization timed out'));
      }, 30000);

      serviceShell.once('message', (message) => {
        try {
          const response = JSON.parse(message);
          if (response.status === 'ready') {
            clearTimeout(timeoutId);
            console.log('✅ Service manager ready');
            serverReady = true;
            resolve();
          } else {
            reject(new Error(`Service manager error: ${response.error || 'Unknown error'}`));
          }
        } catch (error) {
          reject(new Error(`Invalid service manager response: ${message}`));
        }
      });

      serviceShell.once('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });

  } catch (error) {
    console.error('❌ Error initializing RAG service:', error);
    throw error;
  }
};

// Helper function to ensure service is running
const ensureService = async () => {
  if (!serverReady || !serviceShell) {
    await initializeService();
  }
  return serviceShell;
};

// Helper function to execute command
const executeCommand = async (command: string, ...args: string[]): Promise<any> => {
  if (!serverReady) {
    throw new Error('Server not ready. Please wait for initialization to complete.');
  }

  const shell = await ensureService();
  if (!shell) {
    throw new Error('Failed to initialize service');
  }

  return new Promise((resolve, reject) => {
    let responseReceived = false;
    const timeoutId = setTimeout(() => {
      if (!responseReceived) {
        shell.removeAllListeners('message');
        shell.removeAllListeners('error');
        reject(new Error('Command timed out'));
      }
    }, 30000); // 30 second timeout

    const handleMessage = (message: string) => {
      try {
        clearTimeout(timeoutId);
        responseReceived = true;
        shell.removeAllListeners('message');
        shell.removeAllListeners('error');
        const response = JSON.parse(message);
        resolve(response);
      } catch (error) {
        reject(error);
      }
    };

    const handleError = (error: Error) => {
      clearTimeout(timeoutId);
      responseReceived = true;
      shell.removeAllListeners('message');
      shell.removeAllListeners('error');
      reject(error);
    };

    try {
      const commandStr = JSON.stringify([command, ...args]);
      console.log('📤 Sending command:', commandStr);
      shell.on('message', handleMessage);
      shell.on('error', handleError);
      shell.send(commandStr);
    } catch (error) {
      handleError(error as Error);
    }
  });
};

// Initialize service before starting server
console.log('🌟 Starting server...');
initializeService().then(() => {
  // API endpoint to sync all notes for a user
  app.post('/api/rag/sync', async (req, res) => {
    try {
      const { userId, notes } = req.body;
      const result = await executeCommand('sync', userId, JSON.stringify(notes));
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error syncing notes:', error);
      res.status(500).json({ error: 'Failed to sync notes' });
    }
  });

  // API endpoint to add a single note
  app.post('/api/rag/insert', async (req, res) => {
    try {
      const { userId, notes } = req.body;
      const result = await executeCommand('insert', userId, JSON.stringify(notes));
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error inserting notes:', error);
      res.status(500).json({ error: 'Failed to insert notes' });
    }
  });

  // API endpoint to query the knowledge base
  app.post('/api/rag/query', async (req, res) => {
    try {
      const { userId, query } = req.body;
      const result = await executeCommand('query', userId, query);
      if (result.error) {
        throw new Error(result.error);
      }
      res.json(result);
    } catch (error) {
      console.error('Error querying notes:', error);
      res.status(500).json({ error: 'Failed to query notes' });
    }
  });

  app.post('/api/notes/delete', async (req, res) => {
    try {
      const { userId, noteId } = req.body;
      if (!userId || !noteId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Delete from Haystack service
      const result = await executeCommand('delete', userId, noteId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete document from Haystack');
      }

      return res.json({ success: true, message: 'Note deleted successfully' });
    } catch (error) {
      console.error('Error deleting note:', error);
      return res.status(500).json({ error: 'Failed to delete note' });
    }
  });

  app.listen(PORT, () => {
    console.log(`✨ Server is running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
