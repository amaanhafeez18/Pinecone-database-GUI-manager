const express = require('express');
const cors = require('cors');
const { config } = require('dotenv');
const path = require('path');
const multer = require('multer');
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');

const ENV_FILE = path.join(__dirname, '..', '.env');
config({ path: ENV_FILE });

const app = express();
const PORT = process.env.PORT || 5000;
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const openai = new OpenAI({
  key: process.env.OPENAI_KEY,
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const upload = multer({ storage: multer.memoryStorage() });

async function extractVectorFromText(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
  });
  return response.data[0].embedding;
}

function dynamicChunking(text, maxChunkSize, minOverlapSize) {
  const sentences = text.match(/[^.?!\n]+[.?!\n]+/g) || [text]; // Split into sentences
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk.length + sentence.length) > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = currentChunk.slice(-minOverlapSize); // Retain the overlap from the previous chunk
    }
    currentChunk += sentence + ' ';
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}// POST endpoint to handle file upload and chunking
app.post('/upsert', upload.array('file'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send('No files uploaded.');
    }

    const files = req.files;

    // Process each uploaded file
    for (const file of files) {
      if (!file.buffer) {
        return res.status(400).send('Uploaded file has no buffer.');
      }

      const text = file.buffer.toString();
      const chunks = dynamicChunking(text, 2000, 300); // Adjust max chunk size and min overlap size as needed

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const vector = await extractVectorFromText(chunk);

        // Store chunk in Pinecone
        const index = pc.index(process.env.PINECONE_INDEX_NAME);
        const upsertData = {
          id: `${file.originalname}_chunk_${i}`,
          values: vector,  // Ensure vector is an array of numerical values
          metadata: { 
            filename: file.originalname, 
            chunkIndex: i,
            chunkContent: chunk  // Include chunk content in metadata
          },
        };
        await index.upsert([upsertData]);  // Pass data as an array

        console.log(`Stored vector for file: ${file.originalname}, chunk: ${i}`);
      }
    }

    res.send('Files uploaded and vectors stored.');
  } catch (error) {
    console.error('Error processing file upload:', error);
    res.status(500).send('Failed to process file upload.');
  }
});


// Other endpoints for interacting with Pinecone
app.get('/query', async (req, res) => {
  const { text, filter, topK } = req.query;
  const vector = await extractVectorFromText(text);
  const index = pc.index(process.env.PINECONE_INDEX_NAME);
  const queryResponse = await index.query({
    vector,
    topK: parseInt(topK, 10),
    includeMetadata: true,
  });
  res.json(queryResponse);
});

app.get('/fetch', async (req, res) => {
  const { ids } = req.query;
  const index = pc.index(process.env.PINECONE_INDEX_NAME);
  const fetchResult = await index.fetch(JSON.parse(ids));
  res.json(fetchResult);
});

app.post('/update', async (req, res) => {
  const { id, values, metadata } = req.body;
  const index = pc.index(process.env.PINECONE_INDEX_NAME);
  await index.update({ id, values, metadata });
  res.send('Vector updated.');
});

app.delete('/delete', async (req, res) => {
  const { ids } = req.body;
  const index = pc.index(process.env.PINECONE_INDEX_NAME);
  await index.deleteMany(JSON.parse(ids));
  res.send('Vectors deleted.');
});

app.get('/list', async (req, res) => {
  const { prefix, limit, paginationToken } = req.query;
  const index = pc.index(process.env.PINECONE_INDEX_NAME);
  const results = await index.list_paginated({
    prefix,
    limit: parseInt(limit, 10),
    pagination_token: paginationToken,
  });
  res.json(results);
});

app.get('/stats', async (req, res) => {
  try {
    const index = pc.index(process.env.PINECONE_INDEX_NAME);
    const stats = await index.describeIndexStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching index stats:', error);
    res.status(500).json({ error: 'Failed to fetch index stats' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
