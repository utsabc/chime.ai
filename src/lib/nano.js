export class GPTNano {
  constructor() {
    this.version = '1.0.0';
    this.ai = null;
    this.initializeAI();
  }
  async initializeAI() {
    try {
      const status = await ai.languageModel.capabilities();
      if (status.available !== 'no') {
        this.ai = {
          summarizer: await this.initialiseSummarizer(),
          chatSession: await this.initialiseChatSession(),
          //   translator: await this.initialiseTranslator(),
        };
      }
    } catch (error) {
      console.error('Failed to initialize AI:', error);
    }
  }

  async initialiseSummarizer() {
    const canSummarize = await ai.summarizer.capabilities();
    let summarizer;
    if (canSummarize && canSummarize.available !== 'no') {
      if (canSummarize.available === 'readily') {
        // The summarizer can immediately be used.
        summarizer = await ai.summarizer.create();
      } else {
        // The summarizer can be used after the model download.
        summarizer = await ai.summarizer.create();
        summarizer.addEventListener('downloadprogress', (e) => {
          console.log(e.loaded, e.total);
        });
        await summarizer.ready;
      }
    } else {
      // The summarizer can't be used at all.
      console.error('Summarizer is not available.');
    }
    return summarizer;
  }

  async initialiseChatSession() {
    // Start by checking if it's possible to create a session based on the availability of the model, and the characteristics of the device.
    const { available, defaultTemperature, defaultTopK, maxTopK } =
      await ai.languageModel.capabilities();

    let session;
    if (available !== 'no') {
      session = await ai.languageModel.create({
        systemPrompt: 'You are a friendly, helpful assistant',
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            console.log(`Downloaded ${e.loaded} of ${e.total} bytes.`);
          });
        },
      });
    } else {
      console.error('Chat is not available.');
    }
    return session;
  }

  chat(prompt) {
    // Prompt the model with and stream result
    const response = this.ai.chatSession.prompt(prompt);
    return response;
  }

  summarize(text) {
    const summary = this.ai.summarizer.summarize(text);
    return summary;
  }

  async summarizeChunks(chunks) {
    // Summarize each chunk individually
    const chunkSummaries = [];
    for (const chunk of chunks) {
      const summary = await this.summarize(chunk);
      chunkSummaries.push(summary);
    }

    // If we have multiple summaries, combine them and summarize again
    if (chunkSummaries.length > 1) {
      const combinedSummaries = chunkSummaries.join('\n\n');
      return this.summarize(combinedSummaries);
    }

    return chunkSummaries[0];
  }
}
