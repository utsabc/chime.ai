import { FeatureExtractor } from './featureExtractor';
import { VectorDatabase } from './vectorStore';
import { GPTNano } from './nano';
import { splitContent } from './extractContent';

export class ChatManager {
  constructor() {
    this.vectorDb = new VectorDatabase();
    this.gptNano = new GPTNano();
    this.featureExtractor = null;
    this.pageContentProcessed = false;
    this.pageContent = '';
    this.currentUrl = '';
  }

  async initialize() {
    try {
      // Initialize vector database
      await this.vectorDb.init();

      // Initialize feature extractor
      this.featureExtractor = new FeatureExtractor('Xenova/all-MiniLM-L6-v2');

      // Wait for GPTNano initialization
      await new Promise((resolve) => {
        const checkInit = () => {
          if (this.gptNano.ai) {
            resolve();
          } else {
            setTimeout(checkInit, 100);
          }
        };
        checkInit();
      });

      // Get current tab content
      await this.getCurrentTabContent();

      // Process the content if available
      if (this.pageContent) {
        await this.processPageContent();
      }
    } catch (error) {
      console.error('ChatManager initialization error:', error);
      throw new Error('Failed to initialize chat system: ' + error.message);
    }
  }

  async getCurrentTabContent() {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        throw new Error('No active tab found');
      }

      // Send message to content script
      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: 'getContent' }, resolve);
      });

      if (response) {
        this.currentUrl = response.url;
        this.pageContent = response.content;
      } else {
        console.error('No content received from page');
        this.currentUrl = '';
        this.pageContent = '';
      }
    } catch (error) {
      console.error('Error getting tab content:', error);
      throw new Error('Failed to get webpage content: ' + error.message);
    }
  }

  async processPageContent() {
    if (this.pageContentProcessed || !this.pageContent) return;

    try {
      // Split content into chunks
      const chunks = await splitContent(this.pageContent);

      // Clear existing data
      await this.vectorDb.clearDatabase();

      // Process each chunk and store in vector database
      for (const chunk of chunks) {
        try {
          const embeddingResult = await this.featureExtractor.extractFeatures(
            chunk
          );
          // Convert the embedding data structure to array
          const embedding = Array.from(
            { length: embeddingResult.size },
            (_, i) => embeddingResult.data[i.toString()]
          );
          await this.vectorDb.addRecord(
            {
              text: chunk,
              type: 'webpage_content',
              url: this.currentUrl,
            },
            embedding
          );
        } catch (error) {
          console.error('Error processing chunk:', error);
        }
      }

      this.pageContentProcessed = true;
    } catch (error) {
      console.error('Error processing page content:', error);
      throw new Error('Failed to process page content: ' + error.message);
    }
  }

  async chat(userMessage) {
    try {
      if (!this.featureExtractor || !this.gptNano.ai) {
        throw new Error('Chat system not fully initialized');
      }

      if (!this.pageContentProcessed) {
        throw new Error('Page content not yet processed');
      }

      // Get embedding for user message
      const messageEmbeddingResult =
        await this.featureExtractor.extractFeatures(userMessage);
      const messageEmbedding = Array.from(
        { length: messageEmbeddingResult.size },
        (_, i) => messageEmbeddingResult.data[i.toString()]
      );

      // Search for relevant context
      const relevantDocs = await this.vectorDb.searchSimilar(
        messageEmbedding,
        'cosineSimilarity',
        3
      );

      // Filter for current URL
      const currentPageDocs = relevantDocs.filter(
        (doc) => doc.metadata.url === this.currentUrl
      );

      // Construct prompt with context
      const context = currentPageDocs
        .map((doc) => doc.metadata.text)
        .join('\n\n');

      const prompt = `Given the following context from the webpage (${this.currentUrl}):
      
${context}

Based on this context, please respond to: ${userMessage}

If the context doesn't contain relevant information to answer the question, please let me know that you don't have enough information from the webpage to answer accurately.`;

      // Get response stream from GPTNano
      return this.gptNano.chat(prompt);
    } catch (error) {
      console.error('Chat error:', error);
      throw new Error('Failed to process chat: ' + error.message);
    }
  }

  async summarize() {
    try {
      if (!this.featureExtractor || !this.gptNano.ai) {
        throw new Error('Chat system not fully initialized');
      }

      if (!this.pageContentProcessed) {
        throw new Error('Page content not yet processed');
      }
      // Split content into chunks
      const chunks = await splitContent(this.pageContent, 4000);

      return this.gptNano.summarizeChunks(chunks);
    } catch {
      console.error('Chat error:', error);
      throw new Error('Failed to process chat: ' + error.message);
    }
  }
}
