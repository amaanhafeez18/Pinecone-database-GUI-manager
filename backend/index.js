const express = require('express');
const cors = require('cors');
const { config } = require('dotenv');
const path = require('path');
const multer = require('multer');
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const ENV_FILE = '.env';
config({ path: ENV_FILE });

const app = express();
const PORT = process.env.PORT || 2536;
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const openai = new OpenAI({
  key: process.env.OPENAI_KEY,
});
const JWT_SECRET = process.env.JWT_SECRET; // Ensure this is set in your .env file

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const upload = multer({ storage: multer.memoryStorage() });

// Middleware for JWT verification
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

// Function to handle user authentication
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Username and password required.');
  const saltRounds = 10;

  // Hashing the password
  const hashedPassword = await bcrypt.hash(process.env.PASSWORD, saltRounds);
  // Replace this with your actual user fetching logic
  const user = { username: process.env.USERNAME, password: hashedPassword }; // Example hashed password

  // Verify user
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).send('Invalid credentials.');

  // Generate JWT
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
  // Split text into sentences
  const sentences = text.match(/[^.?!\n]+[.?!\n]+|[^.?!\n]+$/g) || [text];
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    // Check if adding the next sentence exceeds the max chunk size
    if ((currentChunk.length + sentence.length) > maxChunkSize) {
      // Push the current chunk to chunks
      chunks.push(currentChunk.trim());

      // Create a new chunk with overlap from the end of the previous chunk
      currentChunk = currentChunk.slice(-minOverlapSize).trim();
    }
    // Add sentence to current chunk
    currentChunk += sentence + ' ';
  }

  // Add the last chunk if it's not empty
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}



async function listFilesLogic(category, password) {
  try {
    const index = pc.index(process.env.PINECONE_INDEX_NAME);

    const deptNames = getEnvDictionary('DEPT_NAMES');

    // Check if the provided category exists and password matches
    if (!deptNames[category] || deptNames[category] !== password) {
      throw new Error('Invalid category or password');
    }
    const stats = await index.describeIndexStats();
    const dummyVector = Array(3072).fill(0.0);
    const queryResponse = await index.query({
      vector: dummyVector,
      filter: { category: { $eq: category } },
      topK: stats.totalRecordCount,
      includeMetadata: true,
      includeValues: false
    });
    const uniqueFilenames = new Set();
    queryResponse.matches.forEach(match => {
      const idParts = match.id.split('_chunk_');
      if (idParts.length > 0) {
        uniqueFilenames.add(idParts[0]);
      }
    });

    const filenames = Array.from(uniqueFilenames).map(filename => ({ filename })).sort((a, b) => a.filename.localeCompare(b.filename));

    return filenames;
  } catch (error) {
    console.error('Error fetching list of files:', error.message);
    // Send the original error message through to the endpoint handler
    throw new Error(error.message);
  }
}

async function listFilesLogicUpsert(category, password) {
  try {
    const deptNames = getEnvDictionary('DEPT_NAMES');

    // Check if the provided category exists and password matches
    if (!deptNames[category] || deptNames[category] !== password) {
      throw new Error('Invalid category or password');
    }

    const index = pc.index(process.env.PINECONE_INDEX_NAME);
    let results = await index.listPaginated({});
    let allVectors = results.vectors;

    while (results.pagination && results.pagination.next) {
      results = await index.listPaginated({ paginationToken: results.pagination.next });
      allVectors = allVectors.concat(results.vectors);
    }

    const uniqueFilenames = new Set();
    allVectors.forEach(vector => {
      const idParts = vector.id.split('_chunk_');
      if (idParts.length > 0) {
        uniqueFilenames.add(idParts[0]);
      }
    });

    const filenames = Array.from(uniqueFilenames).map(filename => ({ filename })).sort((a, b) => a.filename.localeCompare(b.filename));

    return filenames;
  } catch (error) {
    console.error('Error fetching list of files:', error.message);
    // Send the original error message through to the endpoint handler
    throw new Error(error.message);
  }
}

app.get('/listfile', authenticateToken, async (req, res) => {
  try {
    const { category, password } = req.query;
    const deptNames = getEnvDictionary('DEPT_NAMES');
    let filenames = ""; // Use 'let' instead of 'const'

    // Check if the provided category exists and password matches
    if (!deptNames[category] || deptNames[category] !== password) {
      throw new Error('Invalid category or password');
    }

    if (category === "ALL DEPT") {
      filenames = await listFilesLogicUpsert(category, password);
    } else {
      filenames = await listFilesLogic(category, password);
    }

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
    const { category, password } = req.query;
    const files = req.files;

    const existingFilenames = await listFilesLogicUpsert(category, password);
    for (const file of files) {
      if (!file.buffer) {
        return res.status(400).send('Uploaded file has no buffer.');
      }

      const lastDotIndex = file.originalname.lastIndexOf('.');
      const filenameWithoutExt = lastDotIndex !== -1 ? file.originalname.substring(0, lastDotIndex) : file.originalname;
      const categorytest = category;
      const filenameExists = existingFilenames.some(item => item.filename === filenameWithoutExt);
      if (filenameExists) {
        return res.status(409).send(`File '${filenameWithoutExt}' already exists.`);
      }

      const text = file.buffer.toString();
      const chunks = dynamicChunking(text, 1000, 200);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const vector = await extractVectorFromText(chunk);

        const index = pc.index(process.env.PINECONE_INDEX_NAME);
        const upsertData = {
          id: `${filenameWithoutExt}_chunk_${i}`,
          values: vector,
          metadata: {
            filename: filenameWithoutExt,
            chunkIndex: i,
            chunkContent: chunk,
            category: categorytest
          },
        };
         await index.upsert([upsertData]);

        console.log(`Stored vector for file: ${filenameWithoutExt}, chunk: ${i}`);
      }
    }

    res.send('Files uploaded and vectors stored.');
  } catch (error) {
    console.error('Error processing file upload:', error);
    res.status(500).send('Failed to process file upload.');
  }
});
// Private function to parse environment variable
function getEnvDictionary(key) {
  const jsonString = process.env[key];
  if (!jsonString) {
    throw new Error(`${key} is not defined in the environment file.`);
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`Error parsing ${key} JSON string.`);
  }
}
app.get('/array-values', authenticateToken, (req, res) => {
  try {
    // Retrieve and parse the dictionary from the environment variable
    const deptNames = getEnvDictionary('DEPT_NAMES');


    const keysArray = Object.keys(deptNames);

    // Send the keys array as a JSON response
    res.json(keysArray);
  } catch (error) {
    console.error('Error fetching dictionary values:', error.message);
    res.status(500).send(error.message);
  }
});










app.get('/query', authenticateToken, async (req, res) => {
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

async function fetchFileContent(filename) {
  try {
    const index = pc.index(process.env.PINECONE_INDEX_NAME);
    const dummyVector = Array(3072).fill(0.0);
    const queryResponse = await index.query({
      vector: dummyVector,
      filter: { filename: { $eq: filename } },
      topK: 1000,
      includeMetadata: true,
    });

    const chunks = queryResponse.matches.map(match => ({
      chunkContent: match.metadata.chunkContent,
      chunkIndex: match.metadata.chunkIndex,
    }));
    if (chunks.length === 0) {
      throw new Error('No chunks found for the specified filename.');
    }

    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    const fileContent = chunks.map(chunk => chunk.chunkContent).join('');
    return fileContent;

  } catch (error) {
    console.error('Error fetching file content:', error);
    throw new Error('Failed to fetch file content.');
  }
}

app.get('/file-content', authenticateToken, async (req, res) => {
  try {
    const filename = req.query.filename;
    if (!filename) {
      return res.status(400).send('Filename is required.');
    }

    const content = await fetchFileContent(filename);
    res.send(content);
  } catch (error) {
    console.error('Error fetching file content:', error);
    res.status(500).send('Failed to fetch file content.');
  }
});
const text = "This is a long text that should be split into chunks based on size constraints. Each chunk will overlap slightly with the previous one to ensure context is preserved.";
const maxChunkSize = 80;
const minOverlapSize = 20;

const chunks = dynamicChunking(text, maxChunkSize, minOverlapSize);


app.delete('/delete-file', authenticateToken, async (req, res) => {
  try {
    const filename = req.query.filename;
    if (!filename) {
      return res.status(400).send('Filename is required.');
    }

    const index = pc.index(process.env.PINECONE_INDEX_NAME);
    const dummyVector = Array(3072).fill(0.0);
    const queryResponse = await index.query({
      vector: dummyVector,
      filter: { filename: { $eq: filename } },
      topK: 1000,
      includeMetadata: true,
    });

    const vectorIds = queryResponse.matches.map(match => match.id);
    await index.deleteMany(vectorIds);
    res.send(`Deleted vectors for file: ${filename}`);
  } catch (error) {
    console.error('Error deleting file and related chunks/vectors:', error.message);
    res.status(500).send('Failed to delete file and related chunks/vectors.');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
