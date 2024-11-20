import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export const splitContent = async (text, config = {}) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: config.chunkSize || 400,
    chunkOverlap: config.chunkOverlap || 10,
  });

  // Track current position
  let currentPosition = 0;
  const chunks = [];

  // Split the text into chunks with position tracking
  const documents = await splitter.createDocuments([text]);
  
  for (const doc of documents) {
    const chunkText = doc.pageContent;
    const startPos = text.indexOf(chunkText, currentPosition);
    const endPos = startPos + chunkText.length;
    
    chunks.push({
      text: chunkText,
      metadata: {
        startPosition: startPos,
        endPosition: endPos
      }
    });
    
    currentPosition = startPos + 1;
  }

  return chunks;
}

export function getTextContent() {
  // Get all elements from the body
  const body = document.body;

  // Recursively extract text content
  function extractText(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Only include visible text
      const text = node.nodeValue.trim();
      if (text) {
        return text;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Skip hidden elements
      const style = window.getComputedStyle(node);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0'
      ) {
        return '';
      }

      // Recursively extract text from child nodes
      return Array.from(node.childNodes).map(extractText).join(' ');
    }
    return '';
  }

  return extractText(body);
}
