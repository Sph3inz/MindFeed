import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import compression from 'compression';
import NodeCache from 'node-cache';

const app = express();
app.use(cors());
app.use(compression()); // Enable gzip compression
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Initialize cache with 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

// Get the project root directory (one level up from server)
const projectRoot = path.join(__dirname, '..');

// Ensure temp directory exists
const tempDir = path.join(projectRoot, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Helper function to generate cache key
const generateCacheKey = (documents: any[], question: string): string => {
  const hash = require('crypto')
    .createHash('md5')
    .update(JSON.stringify({ documents, question }))
    .digest('hex');
  return `rag_${hash}`;
};

// RAG endpoint with caching
app.post('/api/rag', async (req, res) => {
  const { documents, question } = req.body;
  const cacheKey = generateCacheKey(documents, question);

  // Check cache first
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache hit for:', cacheKey);
    return res.json(cachedResult);
  }

  const requestId = uuidv4();
  const inputFile = path.join(tempDir, `input_${requestId}.json`);
  const outputFile = path.join(tempDir, `output_${requestId}.json`);

  try {
    // Write input data to temporary file
    fs.writeFileSync(inputFile, JSON.stringify({ documents, question }), 'utf8');

    // Path to the Python virtual environment and script
    const pythonPath = path.join(projectRoot, 'longrag', 'venv', 'Scripts', 'python.exe');
    const scriptPath = path.join(projectRoot, 'longrag', 'test_custom_docs.py');

    // Ensure Python executable exists
    if (!fs.existsSync(pythonPath)) {
      throw new Error(`Python executable not found at: ${pythonPath}`);
    }

    // Ensure Python script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Python script not found at: ${scriptPath}`);
    }

    // Spawn Python process with resource limits
    const pythonProcess = spawn(pythonPath, [
      scriptPath,
      '--input', inputFile,
      '--output', outputFile
    ], {
      // Set resource limits
      timeout: 30000, // 30 seconds timeout
    });

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      outputData += data;
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Python error:', data.toString());
      errorData += data;
    });

    pythonProcess.on('close', async (code) => {
      try {
        // Clean up input file
        if (fs.existsSync(inputFile)) {
          fs.unlinkSync(inputFile);
        }

        if (code !== 0) {
          console.error('Python process exited with code:', code);
          res.status(500).json({ error: `Python process failed: ${errorData}` });
          return;
        }

        // Read the output file
        if (!fs.existsSync(outputFile)) {
          throw new Error('Output file not found');
        }

        const results = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        const result = results[0]; // We only sent one question

        // Clean up output file
        fs.unlinkSync(outputFile);

        // Cache the result
        const response = {
          long_ans: result.long_ans,
          short_ans: result.short_ans,
          context_titles: result.context_titles
        };
        cache.set(cacheKey, response);

        res.json(response);
      } catch (error) {
        console.error('Error processing results:', error);
        res.status(500).json({ error: 'Failed to process results' });
      }
    });

    // Handle process timeout
    pythonProcess.on('timeout', () => {
      pythonProcess.kill();
      res.status(504).json({ error: 'Processing timeout' });
    });

  } catch (error) {
    console.error('Error in RAG endpoint:', error);
    // Clean up files in case of error
    if (fs.existsSync(inputFile)) {
      fs.unlinkSync(inputFile);
    }
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
