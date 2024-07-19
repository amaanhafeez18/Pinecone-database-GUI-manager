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
}
// Function to handle the core logic of listing files
async function listFilesLogic() {
  try {
    const index = pc.index(process.env.PINECONE_INDEX_NAME);
    let results = await index.listPaginated({});
    let allVectors = results.vectors;

    // Fetch additional pages if pagination token exists
    while (results.pagination && results.pagination.next) {
      results = await index.listPaginated({ paginationToken: results.pagination.next });
      allVectors = allVectors.concat(results.vectors);
    }

    // Extract unique filenames from vector IDs
    const uniqueFilenames = new Set();
    allVectors.forEach(vector => {
      const idParts = vector.id.split('_chunk_');
      if (idParts.length > 0) {
        uniqueFilenames.add(idParts[0]);
      }
    });

    // Create list of filenames and sort them alphabetically
    const filenames = Array.from(uniqueFilenames).map(filename => ({ filename })).sort((a, b) => a.filename.localeCompare(b.filename));

    return filenames;
  } catch (error) {
    console.error('Error fetching list of files:', error.message);
    throw new Error('Failed to fetch list of files');
  }
}
app.get('/listfile', async (req, res) => {
  try {
    const filenames = await listFilesLogic();
    res.json(filenames);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Route handler for file upsert
app.post('/upsert', upload.array('file'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send('No files uploaded.');
    }

    const files = req.files;

    // Fetch list of filenames already in the database using listFilesLogic function
    const existingFilenames = await listFilesLogic();

    // Process each uploaded file
    for (const file of files) {
      if (!file.buffer) {
        return res.status(400).send('Uploaded file has no buffer.');
      }

      // Remove the extension from the filename
      const lastDotIndex = file.originalname.lastIndexOf('.');
      const filenameWithoutExt = lastDotIndex !== -1 ? file.originalname.substring(0, lastDotIndex) : file.originalname;

      // Check if filenameWithoutExt already exists in the database
      const filenameExists = existingFilenames.some(item => item.filename === filenameWithoutExt);
      if (filenameExists) {
        return res.status(409).send(`File '${filenameWithoutExt}' already exists.`);
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
          id: `${filenameWithoutExt}_chunk_${i}`,
          values: vector,  // Ensure vector is an array of numerical values
          metadata: { 
            filename: filenameWithoutExt, 
            chunkIndex: i,
            chunkContent: chunk  // Include chunk content in metadata
          },
        };
        await index.upsert([upsertData]);  // Pass data as an array

        console.log(`Stored vector for file: ${filenameWithoutExt}, chunk: ${i}`);
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






// app.get('/listfile', async (req, res) => {
//   console.log("please");
//   try {
//     console.log("testing");
//     const index = pc.index(process.env.PINECONE_INDEX_NAME);
//     let results = await index.listPaginated({});
//     let allVectors = results.vectors;

//     // Fetch additional pages if pagination token exists
//     while (results.pagination && results.pagination.next) {
//       results = await index.listPaginated({ paginationToken: results.pagination.next });
//       allVectors = allVectors.concat(results.vectors);
//     }

//     console.log(allVectors);

//     // Extract unique filenames from vector IDs
//     const uniqueFilenames = new Set();
//     allVectors.forEach(vector => {
//       const idParts = vector.id.split('_chunk_');
//       if (idParts.length > 0) {
//         uniqueFilenames.add(idParts[0]);
//       }
//     });

//     console.log(uniqueFilenames);

//     // Create list of filenames and sort them alphabetically
//     const filenames = Array.from(uniqueFilenames).map(filename => ({
//       filename
//     })).sort((a, b) => a.filename.localeCompare(b.filename));

//     console.log(filenames);
//     res.json(filenames);
//   } catch (error) {
//     console.error('Error fetching list of files:', error.message);
//     res.status(500).json({ error: 'Failed to fetch list of files' });
//   }
// });

async function fetchFileContent(filename) {
  try {
    const index = pc.index(process.env.PINECONE_INDEX_NAME);

    console.log(`Fetching content for filename: ${filename}`);
    const dummyVector = Array(3072).fill(0.0);
    // Query to get all matching vectors
    const queryResponse = await index.query({
      vector: dummyVector, // Dummy vector since we're only using metadata filtering
      filter: { filename: { $eq: filename } },
      topK: 1000, // Maximum number of results to fetch
      includeMetadata: true,
    });

    // Extract chunks and their respective chunkIndex
    const chunks = queryResponse.matches.map(match => ({
      chunkContent: match.metadata.chunkContent,
      chunkIndex: match.metadata.chunkIndex,
    }));

    console.log(`Chunks fetched: ${chunks.length}`);
    if (chunks.length === 0) {
      throw new Error('No chunks found for the specified filename.');
    }

    // Sort chunks by chunkIndex
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    // Join the sorted chunks into a single string
    const fileContent = chunks.map(chunk => chunk.chunkContent).join('');
    return fileContent;

  } catch (error) {
    console.error('Error fetching file content:', error);
    throw new Error('Failed to fetch file content.');
  }
}

app.get('/file-content', async (req, res) => {
  try {
    const filename = req.query.filename;
    if (!filename) {
      return res.status(400).send('Filename is required.');
    }

    const content = await fetchFileContent(filename);
    console.log(content);
    res.send(content);
  } catch (error) {
    console.error('Error fetching file content:', error);
    res.status(500).send('Failed to fetch file content.');
  }
});


// Delete file endpoint
app.delete('/delete-file', async (req, res) => {
  try {
    const filename = req.query.filename;
    if (!filename) {
      return res.status(400).send('Filename is required.');
    }

    const index = pc.index(process.env.PINECONE_INDEX_NAME);

    // Query to get all vectors related to the filename
    const dummyVector = Array(3072).fill(0.0);
    const queryResponse = await index.query({
      vector: dummyVector,
      filter: { filename: { $eq: filename } },
      topK: 1000,
      includeMetadata: true,
    });

    const vectorIds = queryResponse.matches.map(match => match.id);
    console.log(vectorIds);
    // Delete the vectors
    await index.deleteMany(vectorIds);

    console.log(`Deleted vectors for file: ${filename}`);
    res.send(`Deleted vectors for file: ${filename}`);
  } catch (error) {
    console.error('Error deleting file and related chunks/vectors:', error.message);
    res.status(500).send('Failed to delete file and related chunks/vectors.');
  }
});






app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
