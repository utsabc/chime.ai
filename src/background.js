import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

env.backends.onnx.wasm.numThreads = 1;

class FeatureExtractorSingleton {
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline('feature-extraction', this.model, {
        progress_callback,
      });
    }
    return this.instance;
  }
}

async function extractFeatures(text) {
  const extractor = await FeatureExtractorSingleton.getInstance();
  return extractor(text, {
    pooling: 'mean',
    normalize: false,
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'extractFeatures') return;

  (async () => {
    try {
      const features = await extractFeatures(message.text);
      sendResponse({ success: true, features });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true;
});
