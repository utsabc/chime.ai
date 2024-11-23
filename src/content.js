function extractPageContent() {
  const body = document.body;

  function extractText(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue.trim();
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      // Skip hidden elements and common non-content elements
      const style = window.getComputedStyle(node);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0' ||
        ['script', 'style', 'noscript', 'iframe'].includes(
          node.tagName.toLowerCase()
        )
      ) {
        return '';
      }

      return Array.from(node.childNodes)
        .map(extractText)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return '';
  }

  return extractText(body);
}

async function initialiseLanguageDetector() {
  const canDetect = await translation.canDetect();
  let detector;
  if (canDetect !== 'no') {
    if (canDetect === 'readily') {
      // The language detector can immediately be used.
      detector = await translation.createDetector();
      console.log('Detector ready');
    } else {
      // The language detector can be used after the model download.
      detector = await translation.createDetector();
      detector.addEventListener('downloadprogress', (e) => {
        console.log(e.loaded, e.total);
      });
      await detector.ready;
    }
  } else {
    console.error('Language detector is not available.');
  }
  return detector;
}

let languageDetector;

// Listen for content requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.action === 'getContent') {
        const content = extractPageContent();
        const url = window.location.href;
        sendResponse({ content, url });
      } else if (request.action === 'detectLanguage') {
        languageDetector =
          languageDetector || (await initialiseLanguageDetector());
        const { text } = request;
        const language = await languageDetector.detect(text);
        const { detectedLanguage } = language[0];
        sendResponse({ detectedLanguage });
      } else {
        throw new Error('Unknown action');
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep the message channel open for async response
});
