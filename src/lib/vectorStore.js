export class VectorDatabase {
  constructor() {
    this.dbName = 'vectorStore';
    this.storeName = 'vectors';
    this.version = 1;
    this.db = null;
  }

  async init() {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async addRecord(metadata, vector) {
    const norm = this._calculateNorm(vector);
    const id = crypto.randomUUID();
    const newItem = { id, metadata, vector, norm };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(newItem);

      request.onsuccess = () => resolve(newItem);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRecord(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearDatabase() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async searchSimilar(vector, strategy = 'cosineSimilarity', topK = 5) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result;
        const scoredItems = items.map((item) => {
          const score =
            strategy === 'cosineSimilarity'
              ? this._cosineSimilarity(vector, item.vector, item.norm)
              : this._euclideanDistance(vector, item.vector);
          return { ...item, score };
        });

        resolve(
          scoredItems
            .sort((a, b) =>
              strategy === 'cosineSimilarity'
                ? b.score - a.score
                : a.score - b.score
            )
            .slice(0, topK)
        );
      };

      request.onerror = () => reject(request.error);
    });
  }

  _calculateNorm(vector) {
    return Math.sqrt(vector.reduce((sum, val) => sum + val ** 2, 0));
  }

  _cosineSimilarity(vectorA, vectorB, normB) {
    const dotProduct = vectorA.reduce(
      (sum, val, i) => sum + val * vectorB[i],
      0
    );
    const normA = this._calculateNorm(vectorA);
    return dotProduct / (normA * normB);
  }

  _euclideanDistance(vectorA, vectorB) {
    return Math.sqrt(
      vectorA.reduce((sum, val, i) => sum + (val - vectorB[i]) ** 2, 0)
    );
  }
}
