import fetch from 'node-fetch';
globalThis.fetch = fetch;
import weaviate from 'weaviate-ts-client'; // Ensure this is also an ES module or use dynamic import
import { config } from 'dotenv';

const client = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080'
});

async function createSchema() {
  try {
    const schema = {
      class: 'TextChunk',
      properties: [
        {
          name: 'chunk_id',
          dataType: ['string']
        },
        {
          name: 'filename',
          dataType: ['string']
        },
        {
          name: 'vector',
          dataType: ['number[]']  // Adjust based on your vector storage method
        },
        {
          name: 'content',
          dataType: ['text']
        }
      ]
    };

    await client.schema.classCreator().withClass(schema).do();
    console.log('Schema created successfully.');
  } catch (error) {
    console.error('Error creating schema:', error.message);
  }
}

createSchema();
