export class GPTNano {
  SUPPORTED_LANGUAGES = [
    'ar',
    'bn',
    'de',
    'es',
    'fr',
    'hi',
    'it',
    'ja',
    'ko',
    'nl',
    'pl',
    'pt',
    'ru',
    'th',
    'tr',
    'vi',
    'zh',
    'zh-Hant',
  ];

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
          translator: new Map(),
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

  async initialiseTranslator(languagePair) {
    const canTranslate = await translation.canTranslate(languagePair);
    let translator;
    if (canTranslate !== 'no') {
      if (canTranslate === 'readily') {
        // The translator can immediately be used.
        translator = await translation.createTranslator(languagePair);
        console.log('Translator ready');
      } else {
        // The translator can be used after the model download.
        translator = await translation.createTranslator(languagePair);
        await translator.ready;
      }
    } else {
      console.error('Translator is not available.');
    }
    return translator;
  }

  async getTranslationModel(sourceLanguage, targetLanguage) {
    let translator = this.ai.translator.get(`${sourceLanguage}#${targetLanguage}`);
    if (translator) {
      return translator;
    }
    const languagePair = {
      sourceLanguage,
      targetLanguage,
    };

    if (sourceLanguage === targetLanguage) {
      return null;
    }

    translator = await this.initialiseTranslator(languagePair);
    this.ai.translator.set(`${sourceLanguage}#${targetLanguage}`, translator);
    return translator;
  }

  async chat(prompt) {
    const response = await this.ai.chatSession.prompt(prompt);
    return response;
  }

  async summarize(text, language = 'en') {
    const summary = await this.ai.summarizer.summarize(text);
    return summary;
  }

  async summarizeChunks(chunks) {
    // Summarize each chunk individually
    const chunkSummaries = [];
    for (const chunk of chunks) {
      const summary = await this.summarize(chunk);
      chunkSummaries.push(summary);
    }

    let summary;

    // If we have multiple summaries, combine them and summarize again
    if (chunkSummaries.length > 1) {
      const combinedSummaries = chunkSummaries.join('\n\n');
      summary = await this.summarize(combinedSummaries);
    } else {
      summary = chunkSummaries[0];
    }

    return summary;
  }

  async translate(text, { source, target }) {
    const translator = await this.getTranslationModel(source, target);
    // If the source and target languages are the same, return the original text
    if (!translator) {
      return text;
    }
    const translation = await translator.translate(text);
    return translation;
  }

  isSupportedLanguage(language) {
    return this.SUPPORTED_LANGUAGES.includes(language);
  }
}
