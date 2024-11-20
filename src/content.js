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

// Listen for content requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getContent') {
    const content = extractPageContent();
    const url = window.location.href;
    sendResponse({ content, url });
  }
  return true; // Keep the message channel open for async response
});
