import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export const splitContent = async (text, config = {}) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: config.chunkSize || 700,
    chunkOverlap: config.chunkOverlap || 10,
  });


  const chunks = [];

  // Split the text into chunks
  const documents = await splitter.createDocuments([text]);
  
  for (const doc of documents) {
    const chunkText = doc.pageContent;

    // Store the chunk
    chunks.push({text: chunkText, metadata: doc.metadata});

  }

  return chunks;
}
