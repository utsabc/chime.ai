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
    this.enPageContent = '';
    this.pageLang = undefined;
    this.enSummary = '';
    this.langSummaries = new Map();
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
        await this.getEnPageContent();
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
        this.pageLang = response.language;
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

  async getEnPageContent() {
    if (!this.pageContent) {
      throw new Error('No page content available');
    }

    if (this.enPageContent) {
      return this.enPageContent;
    }

    // If the page content is already in English, or the language is unknown, or unsupported, return the original content
    if (
      this.pageLang === 'en' ||
      this.pageLang === undefined ||
      !this.gptNano.isSupportedLanguage(this.pageLang)
    ) {
      this.enPageContent = this.pageContent;
      return this.enPageContent;
    }

    // Break the content into chunks
    const chunks = await splitContent(this.pageContent);

    // Translate each chunk to English
    const enChunks = await Promise.all(
      chunks.map(async (chunk) => {
        const enChunk = await this.gptNano.translate(chunk.text, {
          source: this.pageLang,
          target: 'en',
        });
        return enChunk;
      })
    );

    // Combine the translated chunks
    this.enPageContent = enChunks.join('');

  }

  async processPageContent() {
    if (this.pageContentProcessed) {
      return;
    }

    if (!this.pageContent) {
      throw new Error('No page content available');
    }

    if (!this.enPageContent) {
      await this.getEnPageContent();
    }

    try {
      // Split content into chunks
      const chunks = await splitContent(this.enPageContent);

      // Clear existing data
      await this.vectorDb.clearDatabase();

      // Process each chunk and store in vector database
      for (const chunk of chunks) {
        try {
          const embeddingResult = await this.featureExtractor.extractFeatures(
            chunk.text
          );
          // Convert the embedding data structure to array
          const embedding = Array.from(
            { length: embeddingResult.size },
            (_, i) => embeddingResult.data[i.toString()]
          );
          await this.vectorDb.addRecord(
            {
              text: chunk.text,
              type: 'webpage_content',
              url: this.currentUrl,
              startPosition: chunk.metadata.startPosition,
              endPosition: chunk.metadata.endPosition,
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

      // Format context with reference markers
      const contextWithRefs = currentPageDocs.map((doc, index) => ({
        text: doc.metadata.text,
        ref: `[${index + 1}]`,
        position: {
          start: doc.metadata.startPosition,
          end: doc.metadata.endPosition,
        },
      }));

      const context = contextWithRefs
        .map((c) => `${c.text} ${c.ref}`)
        .join('\n\n');

      const prompt = `Given the following context from the webpage (${this.currentUrl}): 
      ${context}
      Use relevant information from the context, please respond to ${userMessage}. If the context doesn't contain relevant information to answer the question, please let me know that you don't have enough information from the webpage to answer accurately.`;

      const response = await this.gptNano.chat(prompt);

      return {
        text: response,
        references: contextWithRefs,
      };
    } catch (error) {
      console.error('Chat error:', error);
      throw new Error('Failed to process chat: ' + error.message);
    }
  }

  async linguisticChat(userMessage) {
    // Get the language of the user message
    const userLanguage = await this.detectLanguage(userMessage);
    if (!userLanguage) {
      throw new Error('Failed to detect language of user message');
    }

    if (userLanguage === 'en') {
      // If the user message is already in English, chat directly
      return this.chat(userMessage);
    }

    if (!this.gptNano.isSupportedLanguage(userLanguage)) {
      throw new Error('Unsupported language: ' + userLanguage);
    }

    // Translate the user message to English
    const englishMessage = await this.gptNano.translate(userMessage, {
      source: userLanguage,
      target: 'en',
    });
    if (!englishMessage) {
      throw new Error('Translation failed');
    }

    // Chat with the AI
    const aiResponse = await this.chat(englishMessage);

    // Translate the AI response back to the user's language
    const userResponse = await this.gptNano.translate(aiResponse.text, {
      source: 'en',
      target: userLanguage,
    });
    if (!userResponse) {
      throw new Error('Translation failed');
    }

    // Translate the references back to the user's language
    const translatedReferences = await Promise.all(
      aiResponse.references.map(async (ref) => {
        const translatedText = await this.gptNano.translate(ref.text, {
          source: 'en',
          target: userLanguage,
        });
        return { text: translatedText, position: ref.position, ref: ref.ref };
      })
    );

    return {
      text: userResponse,
      references: translatedReferences,
    };
  }

  // const maxTokensPerChunk = 1024 - 26;
  async getDynamicPageChunks(content, maxTokensPerChunk = 998) {
    // Estimate the number of tokens in the content
    const estimatedTokens = Math.ceil(content.length / 4);

    // Calculate the number of chunks needed
    const numChunks = Math.ceil(estimatedTokens / maxTokensPerChunk);

    // Split content into chunks
    const chunkSize = Math.ceil(content.length / numChunks);
    const chunks = await splitContent(content, {
      chunkSize: chunkSize,
      chunkOverlap: 20,
    });
    return chunks;
  }

  async getEnSummary() {
    if (!this.featureExtractor || !this.gptNano.ai) {
      throw new Error('Chat system not fully initialized');
    }

    if (!this.pageContentProcessed) {
      throw new Error('Page content not yet processed');
    }

    const chunks = await this.getDynamicPageChunks(this.enPageContent);

    const enSummary = await this.gptNano.summarizeChunks(
      chunks.map((c) => c.text)
    );
    return enSummary;
  }

  async summarize(language = 'en') {
    try {
      if (this.enSummary.length === 0) {
        this.enSummary = await this.getEnSummary();
      }

      if (language === 'en') {
        return this.enSummary;
      }

      if (this.langSummaries.has(language)) {
        return this.langSummaries.get(language);
      }

      const translatedSummary = await this.gptNano.translate(this.enSummary, {
        source: 'en',
        target: language,
      });

      this.langSummaries.set(language, translatedSummary);
      return translatedSummary;
    } catch (error) {
      console.error('Summary error:', error);
      throw new Error('Failed to process Summary: ' + error.message);
    }
  }

  async detectLanguage(text) {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        throw new Error('No active tab found');
      }

      // Send message to content script
      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(
          tab.id,
          { action: 'detectLanguage', text },
          resolve
        );
      });

      if (response) {
        return response.detectedLanguage;
      } else {
        console.error('No language detected');
        return '';
      }
    } catch (error) {
      console.error('Language detection error:', error);
      throw new Error('Failed to detect language: ' + error.message);
    }
  }
}
