const express = require('express');
const cors = require('cors');
const { config } = require('dotenv');
const path = require('path');
const multer = require('multer');
const weaviate = require('weaviate-client');
const OpenAI = require('openai');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// Dynamic import of node-fetch
async function init() {
  const { default: fetch } = await import('node-fetch');
  globalThis.fetch = fetch;
}
const ENV_FILE = path.join(__dirname, '..', '.env');
config({ path: ENV_FILE });

const app = express();
const PORT = process.env.PORT || 5000;

const client = weaviate.weaviateV2.client({
  scheme: 'http',
  host: 'localhost:8080'
});
const openai = new OpenAI({
  key: process.env.OPENAI_KEY,
});
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const upload = multer({ storage: multer.memoryStorage() });

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Username and password required.');
  const saltRounds = 10;

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const user = { username, password: hashedPassword };

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).send('Invalid credentials.');

  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1hr' });
  res.json({ token });
});

async function extractVectorFromText(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
  });
  return response.data[0].embedding;
}

function dynamicChunking(text, maxChunkSize, minOverlapSize) {
  const sentences = text.match(/[^.?!\n]+[.?!\n]+/g) || [text];
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk.length + sentence.length) > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = currentChunk.slice(-minOverlapSize);
    }
    currentChunk += sentence + ' ';
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function getBatchWithCursor(collectionName, batchSize, cursor) {
  const query = client.graphql.get()
    .withClassName(collectionName)
    .withFields('chunk_id _additional { id }') // Adjust fields based on your schema
    .withLimit(batchSize);

  if (cursor) {
    // Fetch the next set of results using the cursor
    const result = await query.withAfter(cursor).do();
    return result.data.Get[collectionName];
  } else {
    // Fetch the first set of results
    const result = await query.do();
    return result.data.Get[collectionName];
  }
}

async function listFilesLogic(collectionName, batchSize = 600) {
  let cursor = null;
  const filenames = new Set(); // Use Set to ensure uniqueness

  while (true) {
    let nextBatch = await getBatchWithCursor(collectionName, batchSize, cursor);

    if (nextBatch.length === 0) break;

    // Extract filenames from chunk_ids and add to Set
    nextBatch.forEach(obj => {
      if (obj.chunk_id) {
        const parts = obj.chunk_id.split('_');
        if (parts.length > 1) {
          const filename = parts.slice(0, -2).join('_'); // Join all parts except the last two
          filenames.add(filename);
        }
      }
    });
    console.log(filenames);

    cursor = nextBatch.at(-1)['_additional']['id'];
  }

  return Array.from(filenames).sort((a, b) => a.localeCompare(b));

}


app.get('/listfile', authenticateToken, async (req, res) => {
  try {
    const filenames = await listFilesLogic('TextChunk');
    console.log(filenames);
    res.json(filenames);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/upsert', authenticateToken, upload.array('file'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send('No files uploaded.');
    }

    const files = req.files;

    // Fetch existing filenames
    const existingFilenames = await listFilesLogic('TextChunk');

    for (const file of files) {
      if (!file.buffer) {
        return res.status(400).send('Uploaded file has no buffer.');
      }

      // Extract filename without extension
      const filenameWithoutExt = path.basename(file.originalname, path.extname(file.originalname));

      // Check for duplicate filenames
      const filenameExists = existingFilenames.includes(filenameWithoutExt);
      if (filenameExists) {
        return res.status(409).send(`File '${filenameWithoutExt}' already exists.`);
      }

      const text = file.buffer.toString();
      const chunks = dynamicChunking(text, 1000, 200);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const vector = await extractVectorFromText(chunk);

        await client.data.creator()
          .withClassName('TextChunk')
          .withProperties({
            chunk_id: `${filenameWithoutExt}_chunk_${i}`,
            vector: vector,
            content: chunk
          })
          .do();

        console.log(`Stored vector for file: ${filenameWithoutExt}, chunk: ${i}`);
      }
    }

    res.send('Files uploaded and vectors stored.');
  } catch (error) {
    console.error('Error processing file upload:', error);
    res.status(500).send('Failed to process file upload.');
  }
});
app.get('/query', authenticateToken, async (req, res) => {
  const { text, topK } = req.query;
  const vector = await extractVectorFromText(text);

  const response = await client.graphql.get()
    .withClassName('TextChunk')
    .withNearVector({ vector, certainty: 0.7 })
    .withLimit(parseInt(topK, 10))
    .do();

  res.json(response);
});


app.get('/file-content', authenticateToken, async (req, res) => {
  try {
    const filename = req.query.filename;
    if (!filename) {
      return res.status(400).send('Filename is required.');
    }

    // Helper function to get a batch of objects
    async function getBatchWithCursor(collectionName, batchSize, cursor) {
      const query = client.graphql.get()
        .withClassName(collectionName)
        .withFields('chunk_id content _additional { id }')
        .withLimit(batchSize);

      if (cursor) {
        let result = await query.withAfter(cursor).do();
        return result.data.Get[collectionName];
      } else {
        let result = await query.do();
        return result.data.Get[collectionName];
      }
    }

    // Fetch all chunks for the given file
    let cursor = null;
    const allChunks = [];
    while (true) {
      const batch = await getBatchWithCursor('TextChunk', 100, cursor);
      
      if (batch.length === 0) break;
      
      const filteredChunks = batch.filter(chunk => chunk.chunk_id.startsWith(`${filename}_chunk_`));
      allChunks.push(...filteredChunks);
      
      // Move the cursor to the last returned uuid
      cursor = batch.at(-1)['_additional']['id'];
    }

    // Sort chunks by their index in ascending order
    allChunks.sort((a, b) => {
      const indexA = parseInt(a.chunk_id.split('_chunk_').pop(), 10);
      const indexB = parseInt(b.chunk_id.split('_chunk_').pop(), 10);
      return indexA - indexB;
    });

    // Extract content and send as response
    const fileContent = allChunks.map(chunk => chunk.content).join('');
    res.send(fileContent);
    
  } catch (error) {
    console.error('Error fetching file content:', error);
    res.status(500).send('Failed to fetch file content.');
  }
});


app.delete('/delete-file', authenticateToken, async (req, res) => {
  try {
    const filename = req.query.filename;
    if (!filename) {
      return res.status(400).send('Filename is required.');
    }

    // Helper function to get a batch of objects
    async function getBatchWithCursor(collectionName, batchSize, cursor) {
      const query = client.graphql.get()
        .withClassName(collectionName)
        .withFields('chunk_id _additional { id }')
        .withLimit(batchSize);

      if (cursor) {
        let result = await query.withAfter(cursor).do();
        return result.data.Get[collectionName];
      } else {
        let result = await query.do();
        return result.data.Get[collectionName];
      }
    }

    // Fetch all chunks for the given file
    let cursor = null;
    const allChunks = [];
    while (true) {
      const batch = await getBatchWithCursor('TextChunk', 100, cursor);

      if (batch.length === 0) break;

      const filteredChunks = batch.filter(chunk => chunk.chunk_id.startsWith(`${filename}_chunk_`));
      allChunks.push(...filteredChunks);

      // Move the cursor to the last returned uuid
      cursor = batch.at(-1)['_additional']['id'];
    }

    // Extract IDs and delete each chunk
    const ids = allChunks.map(chunk => chunk._additional.id);
    for (const id of ids) {
      await client.data.deleter()
        .withClassName('TextChunk')
        .withId(id)
        .do();
    }

    res.send(`Deleted vectors for file: ${filename}`);
  } catch (error) {
    console.error('Error deleting file and related chunks/vectors:', error.message);
    res.status(500).send('Failed to delete file and related chunks/vectors.');
  }
});




app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


init().catch(err => {
  console.error('Failed to initialize:', err);
});