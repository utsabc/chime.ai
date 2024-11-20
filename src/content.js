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


// Function to highlight text
function highlightText(start, end) {
  const selection = window.getSelection();
  selection.removeAllRanges();

  // Helper function to get all text nodes, including those in shadow DOM
  function getAllTextNodes(root) {
    const textNodes = [];
    const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        // Skip script and style contents
        if (
          node.parentNode.nodeName.toLowerCase() === 'script' ||
          node.parentNode.nodeName.toLowerCase() === 'style'
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip hidden elements
        const style = window.getComputedStyle(node.parentElement);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0'
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node;
    while ((node = treeWalker.nextNode())) {
      textNodes.push(node);
    }

    // Handle Shadow DOM
    const elements = root.querySelectorAll('*');
    elements.forEach((el) => {
      if (el.shadowRoot) {
        textNodes.push(...getAllTextNodes(el.shadowRoot));
      }
    });

    return textNodes;
  }

  // Get all visible text nodes
  const textNodes = getAllTextNodes(document.body);

  // Build text position map
  let currentPosition = 0;
  const nodeMap = textNodes.map((node) => {
    const length = node.textContent.length;
    const position = {
      node,
      start: currentPosition,
      end: currentPosition + length,
    };
    currentPosition += length;
    return position;
  });

  // Find nodes that contain the target text
  const relevantNodes = [];
  let remainingStart = start;
  let remainingEnd = end;

  for (const position of nodeMap) {
    if (position.start <= start && position.end > start) {
      relevantNodes.push({
        node: position.node,
        start: start - position.start,
        end: Math.min(position.end - position.start, end - position.start),
      });
    } else if (position.start > start && position.start < end) {
      relevantNodes.push({
        node: position.node,
        start: 0,
        end: Math.min(position.end - position.start, end - position.start),
      });
    }
  }

  // Highlight each relevant node
  relevantNodes.forEach(({ node, start, end }) => {
    try {
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, end);

      const highlight = document.createElement('span');
      highlight.className = 'g-chime-highlight';
      highlight.style.backgroundColor = '#ffeb3b';
      highlight.style.transition = 'background-color 0.5s';

      range.surroundContents(highlight);

      // Ensure highlight is visible
      highlight.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });

      // Remove highlight after delay
      setTimeout(() => {
        if (highlight.parentNode) {
          const parent = highlight.parentNode;
          while (highlight.firstChild) {
            parent.insertBefore(highlight.firstChild, highlight);
          }
          parent.removeChild(highlight);
        }
      }, 3000);
    } catch (error) {
      console.warn('Failed to highlight specific node:', error);
    }
  });
}

// Listen for content requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getContent') {
    const content = extractPageContent();
    const url = window.location.href;
    sendResponse({ content, url });
  } else if (request.action === 'highlightText') {
    highlightText(request.start, request.end);
    sendResponse({ success: true });
  }
  return true; // Keep the message channel open for async response
});
