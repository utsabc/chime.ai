import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export const splitContent = async (text, chunkSize = 400) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize, // Each chunk will have 400 characters
    chunkOverlap: 20, // 20 characters from the end of one chunk will overlap with the start of the next
  });

  // Split the text into chunks
  const output = await splitter.createDocuments([text]);

  return output.map((document) => document.pageContent);
};

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
