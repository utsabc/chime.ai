export class FeatureExtractor {
  constructor(modelName) {
    this.modelName = modelName;
  }

  async extractFeatures(text) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'extractFeatures', text },
        (response) => {
          if (response.success) {
            resolve(response.features);
          } else {
            reject(new Error(response.error));
          }
        }
      );
    });
  }
}
